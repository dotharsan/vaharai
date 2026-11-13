import { readSharedDriveConfig } from './shared-config.ts';

/**
 * Serverless / Express proxy endpoint for fetching Google Drive files, Google Sheets,
 * or Google Apps Script shared relay endpoints.
 * Resolves CORS limitations for all workstations without requiring per-user Google login.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sharedConfig = readSharedDriveConfig();
  const fileIdParam = (req.query?.fileId || req.body?.fileId || '').toString().trim();
  const urlParam = (req.query?.url || req.body?.url || '').toString().trim();
  const relayUrlParam = (req.query?.relayUrl || req.body?.relayUrl || sharedConfig.relayUrl || '').toString().trim();

  // Case 1: Google Sheets URL provided
  if (urlParam && urlParam.includes('spreadsheets')) {
    try {
      let exportUrl = urlParam;
      const sheetIdMatch = urlParam.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (sheetIdMatch && sheetIdMatch[1]) {
        const id = sheetIdMatch[1];
        const gidMatch = urlParam.match(/gid=([0-9]+)/);
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
        exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gidParam}`;
      }

      const response = await fetch(exportUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });

      if (response.ok) {
        const csvText = await response.text();
        return res.status(200).json({
          success: true,
          type: 'csv_sheet',
          content: csvText,
        });
      }
    } catch (sheetErr) {
      console.warn('[drive/fetch] Google Sheet proxy error:', sheetErr);
    }
  }

  // Extract fileId from urlParam if fileIdParam was not directly provided
  let effectiveFileId = fileIdParam;
  if (!effectiveFileId && urlParam) {
    const match = urlParam.match(/\/d\/([a-zA-Z0-9_-]+)/) || urlParam.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      effectiveFileId = match[1];
    }
  }

  // Fallback to shared config file ID (which itself defaults to 1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2)
  if (!effectiveFileId) {
    effectiveFileId = sharedConfig.fileId || '1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2';
  }

  // Case 2: Try shared Google Apps Script Relay URL first if configured
  if (relayUrlParam && relayUrlParam.startsWith('https://script.google.com/')) {
    try {
      const separator = relayUrlParam.includes('?') ? '&' : '?';
      const relayResp = await fetch(`${relayUrlParam}${separator}fileId=${encodeURIComponent(effectiveFileId)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      if (relayResp.ok) {
        const text = await relayResp.text();
        const trimmed = text.trim();
        if (!/^<(!doctype|html)/i.test(trimmed)) {
          try {
            const parsed = JSON.parse(trimmed);
            const payload = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
            if (payload && (Array.isArray(payload.beneficiaries) || Array.isArray(payload.users) || Array.isArray(payload.divisions))) {
              return res.status(200).json({
                success: true,
                type: 'json',
                data: payload,
                source: 'google_apps_script_relay',
              });
            }
          } catch {
            // continue to direct Drive download fallback
          }
        }
      }
    } catch (relayErr) {
      console.warn('[drive/fetch] Apps Script relay warning:', relayErr);
    }
  }

  // Case 3: Attempt to fetch from Google Drive direct public download URL
  try {
    const downloadUrls = [
      `https://drive.google.com/uc?export=download&id=${effectiveFileId}`,
      `https://drive.usercontent.google.com/download?id=${effectiveFileId}&export=download&confirm=t`,
      `https://docs.google.com/uc?export=download&id=${effectiveFileId}`,
    ];

    for (const dlUrl of downloadUrls) {
      try {
        const resp = await fetch(dlUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });

        if (resp.ok) {
          const text = await resp.text();
          const trimmed = text.trim();
          // Skip HTML login/permission pages returned by Google Drive for private files
          if (/^<(!doctype|html)/i.test(trimmed)) {
            continue;
          }
          // Detect empty placeholder file such as "" or "{}" or "{\n [\n ]\n}"
          if (!trimmed || trimmed === '{}' || trimmed === '[]' || /^\{\s*\[\s*\]\s*\}$/.test(trimmed)) {
            return res.status(200).json({
              success: true,
              type: 'empty_placeholder',
              fileId: effectiveFileId,
              message: 'Google Drive file is accessible and currently empty.',
              source: 'google_drive_direct',
            });
          }

          try {
            const data = JSON.parse(trimmed);
            if (data && (Array.isArray(data.beneficiaries) || Array.isArray(data.users) || Array.isArray(data.divisions))) {
              return res.status(200).json({
                success: true,
                type: 'json',
                data,
                source: 'google_drive_direct',
              });
            }
          } catch {
            const looksLikeBrokenJson = trimmed.startsWith('{') || trimmed.startsWith('[');
            if (!looksLikeBrokenJson && (trimmed.includes(',') || trimmed.includes('\n'))) {
              return res.status(200).json({
                success: true,
                type: 'csv_text',
                content: text,
                source: 'google_drive_direct',
              });
            }
          }
        }
      } catch (reqErr) {
        console.warn(`[drive/fetch] Warning fetching ${dlUrl}:`, reqErr);
      }
    }
  } catch (driveErr) {
    console.warn('[drive/fetch] Google Drive fetch attempt error:', driveErr);
  }

  return res.status(200).json({
    success: false,
    fileId: effectiveFileId,
    message: 'Google Drive file is not publicly readable or is empty. Connect Drive and share file with Anyone with link.',
    source: 'drive_unavailable',
  });
}
