import fs from 'fs';
import path from 'path';

export interface SharedDriveConfig {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  sheetUrl?: string;
  relayUrl?: string;
  ownerEmail?: string;
  isPubliclyReadable?: boolean;
  updatedAt: string;
}

const DEFAULT_CONFIG: SharedDriveConfig = {
  fileId: '1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2',
  fileName: 'vaharai_ds_master_database.json',
  webViewLink: 'https://drive.google.com/file/d/1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2/view?usp=sharing',
  sheetUrl: '',
  relayUrl: '',
  ownerEmail: '',
  isPubliclyReadable: false,
  updatedAt: new Date().toISOString(),
};

let inMemoryConfig: SharedDriveConfig | null = null;

function getConfigPath(): string {
  return path.join(process.cwd(), 'data', 'shared_drive_config.json');
}

export function readSharedDriveConfig(): SharedDriveConfig {
  if (inMemoryConfig) return inMemoryConfig;
  try {
    const filePath = getConfigPath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.fileId) {
        inMemoryConfig = { ...DEFAULT_CONFIG, ...parsed };
        return inMemoryConfig!;
      }
    }
  } catch (err) {
    console.warn('[shared-config] Read warning:', err);
  }
  return { ...DEFAULT_CONFIG };
}

export function writeSharedDriveConfig(next: Partial<SharedDriveConfig>): SharedDriveConfig {
  const current = readSharedDriveConfig();
  const updated: SharedDriveConfig = {
    ...current,
    ...next,
    fileId: (next.fileId ?? current.fileId ?? DEFAULT_CONFIG.fileId).trim(),
    fileName: (next.fileName ?? current.fileName ?? DEFAULT_CONFIG.fileName).trim(),
    updatedAt: new Date().toISOString(),
  };
  inMemoryConfig = updated;
  try {
    const filePath = getConfigPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[shared-config] Write warning:', err);
  }
  return updated;
}

export default function handler(req: any, res: any) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'GET') {
      const config = readSharedDriveConfig();
      return res.status(200).json({
        success: true,
        config,
      });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
        }
      }
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ success: false, error: 'Missing config payload' });
      }
      const config = writeSharedDriveConfig({
        ...(typeof body.fileId === 'string' && body.fileId.trim() ? { fileId: body.fileId } : {}),
        ...(typeof body.fileName === 'string' && body.fileName.trim() ? { fileName: body.fileName } : {}),
        ...(typeof body.webViewLink === 'string' ? { webViewLink: body.webViewLink } : {}),
        ...(typeof body.sheetUrl === 'string' ? { sheetUrl: body.sheetUrl } : {}),
        ...(typeof body.relayUrl === 'string' ? { relayUrl: body.relayUrl } : {}),
        ...(typeof body.ownerEmail === 'string' ? { ownerEmail: body.ownerEmail } : {}),
        ...(typeof body.isPubliclyReadable === 'boolean' ? { isPubliclyReadable: body.isPubliclyReadable } : {}),
      });
      return res.status(200).json({
        success: true,
        config,
      });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[shared-config] Handler error:', err);
    return res.status(200).json({
      success: true,
      config: DEFAULT_CONFIG,
      warning: err.message,
    });
  }
}
