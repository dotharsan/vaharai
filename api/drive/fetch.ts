import fs from 'fs';
import path from 'path';

/**
 * Serverless / Express proxy endpoint for fetching Google Drive files & Google Sheets
 * Resolves CORS limitations and provides automatic fallback to local central database.
 */
export default async function handler(req: any, res: any) {
  // Permissive CORS for Vercel, Express, and client cross-origin calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const fileIdParam = (req.query?.fileId || req.body?.fileId || '').toString().trim();
  const urlParam = (req.query?.url || req.body?.url || '').toString().trim();

  // Helper to read local central database as fallback
  const getLocalDatabase = () => {
    try {
      const cwd = process.cwd();
      const candidates = [
        path.join(cwd, 'data', 'central_database.json'),
        path.join(cwd, 'src', 'data', 'central_database.json'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.beneficiaries)) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[drive/fetch] Local disk read warning:', e);
    }
    return null;
  };

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

  // Default fallback file ID if none provided
  if (!effectiveFileId) {
    effectiveFileId = '1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2';
  }

  // Attempt to fetch from Google Drive direct download URL
  try {
    const downloadUrls = [
      `https://drive.google.com/uc?export=download&id=${effectiveFileId}`,
      `https://docs.google.com/uc?export=download&id=${effectiveFileId}`,
      `https://drive.usercontent.google.com/download?id=${effectiveFileId}&export=download`,
    ];

    for (const dlUrl of downloadUrls) {
      try {
        const resp = await fetch(dlUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });

        if (resp.ok) {
          const text = await resp.text();
          // Check if response is JSON
          try {
            const data = JSON.parse(text);
            if (data && (Array.isArray(data.beneficiaries) || Array.isArray(data.users))) {
              return res.status(200).json({
                success: true,
                type: 'json',
                data,
                source: 'google_drive_direct',
              });
            }
          } catch {
            // Content is not JSON, check if CSV
            if (text.includes(',') || text.includes('\n')) {
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

  // Do not pretend static seed database is remote Google Drive data
  return res.status(200).json({
    success: false,
    message: 'Google Drive file is not publicly readable or is empty. Authenticate via Google Drive in Settings.',
    source: 'drive_unavailable',
  });
}
