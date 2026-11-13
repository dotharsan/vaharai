import { getGoogleAccessToken, invalidateGoogleAccessToken, isGoogleDriveAuthenticated } from './auth';
import { DriveBackupItem } from '../types';
import { parseBeneficiariesFromCsv } from './csv';

export const DEFAULT_DESIGNATED_FILE_ID = '1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2';
export const DEFAULT_DESIGNATED_FILE_URL = 'https://drive.google.com/file/d/1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2/view?usp=sharing';

const STORAGE_KEYS = {
  DESIGNATED_FILE_ID: 'vaharai_ds_designated_drive_file_id',
  DESIGNATED_FILE_NAME: 'vaharai_ds_designated_drive_file_name',
  GOOGLE_SHEET_URL: 'vaharai_ds_google_sheet_url',
  AUTO_SYNC_ENABLED: 'vaharai_ds_drive_auto_sync_enabled',
  LAST_DRIVE_SYNC: 'vaharai_ds_last_drive_sync_meta',
};

export interface DriveSyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  sheetUrl?: string;
  message?: string;
}

let currentSyncStatus: DriveSyncStatus = {
  state: 'idle',
  fileId: DEFAULT_DESIGNATED_FILE_ID,
};

const statusListeners = new Set<(status: DriveSyncStatus) => void>();

export const getDriveSyncStatus = (): DriveSyncStatus => {
  if (typeof window !== 'undefined') {
    const savedMeta = localStorage.getItem(STORAGE_KEYS.LAST_DRIVE_SYNC);
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        return { ...currentSyncStatus, ...parsed };
      } catch {
        // ignore
      }
    }
  }
  return currentSyncStatus;
};

const notifyStatusChange = (status: Partial<DriveSyncStatus>) => {
  currentSyncStatus = { ...currentSyncStatus, ...status };
  if (typeof window !== 'undefined' && (status.lastSyncedAt || status.state === 'error' || status.fileId)) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_DRIVE_SYNC, JSON.stringify(currentSyncStatus));
    } catch {
      // ignore
    }
  }
  statusListeners.forEach((listener) => {
    try {
      listener(currentSyncStatus);
    } catch {
      // ignore
    }
  });
};

export const onDriveSyncStatusChange = (listener: (status: DriveSyncStatus) => void): (() => void) => {
  statusListeners.add(listener);
  listener(getDriveSyncStatus());
  return () => {
    statusListeners.delete(listener);
  };
};

/**
 * Extracts Google Drive file ID from a full sharing URL or returns the clean ID.
 */
export const extractDriveFileId = (input: string): string => {
  if (!input) return DEFAULT_DESIGNATED_FILE_ID;
  const trimmed = input.trim();
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed || DEFAULT_DESIGNATED_FILE_ID;
};

export const getDesignatedDriveFileId = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEYS.DESIGNATED_FILE_ID);
    if (saved) return saved;
  }
  return DEFAULT_DESIGNATED_FILE_ID;
};

export const getDesignatedDriveFileName = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEYS.DESIGNATED_FILE_NAME);
    if (saved) return saved;
  }
  return 'vaharai_ds_master_database.json';
};

export const setDesignatedDriveFileId = (idOrUrl: string, customName?: string): string => {
  const extracted = extractDriveFileId(idOrUrl);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.DESIGNATED_FILE_ID, extracted);
    if (customName) {
      localStorage.setItem(STORAGE_KEYS.DESIGNATED_FILE_NAME, customName);
    }
  }
  notifyStatusChange({ fileId: extracted, ...(customName ? { fileName: customName } : {}) });
  return extracted;
};

export const isCustomDesignatedFileSet = (): boolean => {
  return getDesignatedDriveFileId() !== DEFAULT_DESIGNATED_FILE_ID;
};

export const isDriveAutoSyncEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ENABLED);
    return val === null ? true : val === 'true';
  }
  return true;
};

export const setDriveAutoSyncEnabled = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC_ENABLED, String(enabled));
  }
};

export const getGoogleSheetUrl = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEYS.GOOGLE_SHEET_URL) || '';
  }
  return '';
};

export const setGoogleSheetUrl = (url: string): string => {
  const clean = url.trim();
  if (typeof window !== 'undefined') {
    if (clean) {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_SHEET_URL, clean);
    } else {
      localStorage.removeItem(STORAGE_KEYS.GOOGLE_SHEET_URL);
    }
  }
  notifyStatusChange({ sheetUrl: clean });
  return clean;
};

const safeParseDriveJsonText = (rawText: string): any | null => {
  const trimmed = (rawText || '').trim();
  if (!trimmed || trimmed === '{}' || trimmed === '[]' || /^\{\s*\[\s*\]\s*\}$/.test(trimmed)) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && (Array.isArray(parsed.beneficiaries) || Array.isArray(parsed.users) || Array.isArray(parsed.divisions))) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Fetch and parse data from Google Drive file or Google Sheet via Server Proxy
 */
export const fetchFromCloudProxy = async (targetIdOrUrl?: string): Promise<any | null> => {
  const sheetUrl = getGoogleSheetUrl();
  const fileId = targetIdOrUrl ? extractDriveFileId(targetIdOrUrl) : getDesignatedDriveFileId();
  const queryParam = targetIdOrUrl && targetIdOrUrl.includes('spreadsheets')
    ? `url=${encodeURIComponent(targetIdOrUrl)}`
    : sheetUrl
    ? `url=${encodeURIComponent(sheetUrl)}`
    : `fileId=${encodeURIComponent(fileId)}`;

  try {
    const response = await fetch(`/api/drive/fetch?${queryParam}`);
    if (!response.ok) return null;
    const result = await response.json();

    if (result.success) {
      if (result.type === 'json' && result.data && Array.isArray(result.data.beneficiaries)) {
        return result.data;
      }

      if ((result.type === 'csv_sheet' || result.type === 'csv_text') && result.content) {
        const { items } = parseBeneficiariesFromCsv(result.content);
        if (items && items.length > 0) {
          return {
            version: '3.1',
            exportedAt: new Date().toISOString(),
            organization: 'Divisional Secretariat Koralaipattu North (Vaharai) - Google Sheet Live',
            beneficiaries: items,
            source: 'google_sheets_live_csv',
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Cloud Proxy] Server proxy fetch error:', err);
  }
  return null;
};

/**
 * Fetch and parse data from the designated Google Drive file or Google Sheet.
 * Automatically tries authenticated Drive API first if connected, then falls back to server proxy.
 */
export const fetchFromDesignatedDriveFile = async (customFileId?: string): Promise<any | null> => {
  const fileId = customFileId || getDesignatedDriveFileId();
  notifyStatusChange({ state: 'syncing', fileId, message: 'டிரைவ் / கூகிள் சீட்டிலிருந்து வாசிக்கப்படுகிறது...' });

  // Step 1: Authenticated Drive API if user is connected (supports private user Drive files)
  const token = getGoogleAccessToken();
  if (token) {
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        invalidateGoogleAccessToken();
        notifyStatusChange({
          state: 'error',
          fileId,
          message: 'கூகிள் டிரைவ் அனுமதி காலாவதியானது. மீண்டும் Connect Drive செய்யவும்.',
        });
        return null;
      }

      if (response.ok) {
        const text = await response.text();
        const data = safeParseDriveJsonText(text);
        if (data) {
          notifyStatusChange({
            state: 'synced',
            fileId,
            lastSyncedAt: new Date().toISOString(),
            message: 'டிரைவ் கோப்பிலிருந்து தரவுகள் வெற்றிகரமாக பெறப்பட்டன.',
          });
          return data;
        }
        // Empty / malformed placeholder file like "{ [ ] }" in user's Drive
        notifyStatusChange({
          state: 'idle',
          fileId,
          message: 'குறிக்கப்பட்ட டிரைவ் கோப்பு தற்போது காலியாக உள்ளது — உங்கள் தரவை அதில் சேமிக்கலாம்.',
        });
        return null;
      }
    } catch (e) {
      console.warn('[Google Drive] Authenticated API fetch warning:', e);
    }
  }

  // Step 2: Server Proxy for public Google Sheet or shared Drive file (only if custom sheet or explicit read)
  try {
    const proxyData = await fetchFromCloudProxy(customFileId);
    if (proxyData && (Array.isArray(proxyData.beneficiaries) || Array.isArray(proxyData.users))) {
      notifyStatusChange({
        state: 'synced',
        fileId,
        lastSyncedAt: new Date().toISOString(),
        message: 'டிரைவ் / கூகிள் சீட்டிலிருந்து தரவுகள் தானாக வெற்றிகரமாக பெறப்பட்டது.',
      });
      return proxyData;
    }
  } catch (proxyErr) {
    console.warn('[Google Drive] Proxy load attempt error:', proxyErr);
  }

  notifyStatusChange({
    state: 'idle',
    fileId,
    message: 'டிரைவ் கோப்பு தயார் நிலையில் உள்ளது.',
  });
  return null;
};

/**
 * Saves/updates data directly into the designated Google Drive file.
 * Uses PATCH media to update in-place without creating duplicate files.
 * Verifies returned Drive metadata and handles expired 401 tokens or read-only 403/404 targets.
 */
export const saveToDesignatedDriveFile = async (
  snapshotData: any,
  customFileId?: string
): Promise<{ success: boolean; fileId: string; fileName: string; webViewLink?: string; timestamp: string }> => {
  const token = getGoogleAccessToken();
  if (!token) {
    notifyStatusChange({
      state: 'error',
      message: 'கூகிள் டிரைவ் உள்நுழையப்படவில்லை. தயவுசெய்து Google Drive உடன் இணைக்கவும்.',
    });
    throw new Error('Google Drive is not authenticated. Please connect Google Drive first.');
  }

  let fileId = customFileId || getDesignatedDriveFileId();
  notifyStatusChange({ state: 'syncing', fileId, message: 'டிரைவ் கோப்பில் சேமிக்கப்படுகிறது...' });

  const fileContent = JSON.stringify(snapshotData, null, 2);

  try {
    // Attempt 1: In-place PATCH update of the designated file (asks Drive to return id, name, webViewLink)
    const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,webViewLink,size`;
    const response = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (response.status === 401) {
      invalidateGoogleAccessToken();
      throw new Error('கூகிள் டிரைவ் அணுகல் டோக்கன் காலாவதியாகிவிட்டது. தயவுசெய்து மீண்டும் Connect Drive பொத்தானை அழுத்தி உள்நுழையவும்.');
    }

    if (response.ok) {
      let savedMeta: any = {};
      try {
        savedMeta = await response.json();
      } catch {
        // ignore metadata parse error
      }
      const actualFileId = savedMeta.id || fileId;
      const actualFileName = savedMeta.name || getDesignatedDriveFileName();
      if (typeof window !== 'undefined' && savedMeta.name) {
        localStorage.setItem(STORAGE_KEYS.DESIGNATED_FILE_NAME, savedMeta.name);
      }

      const now = new Date().toISOString();
      notifyStatusChange({
        state: 'synced',
        fileId: actualFileId,
        fileName: actualFileName,
        webViewLink: savedMeta.webViewLink,
        lastSyncedAt: now,
        message: `குறிக்கப்பட்ட டிரைவ் கோப்பில் (${actualFileName}) வெற்றிகரமாக சேமிக்கப்பட்டது!`,
      });
      return {
        success: true,
        fileId: actualFileId,
        fileName: actualFileName,
        webViewLink: savedMeta.webViewLink,
        timestamp: now,
      };
    }

    // If 404 (not in this user's Drive) or 403 (read-only shared file such as default template),
    // create a writable master JSON file in the user's own Drive and set it as designated
    if (response.status === 404 || response.status === 403) {
      console.warn(`Target file ${fileId} not writable or not found (${response.status}). Creating writable master file in user's Drive...`);
      const newBackup = await uploadBackupToDrive(snapshotData, 'vaharai_ds_master_central_database.json');
      setDesignatedDriveFileId(newBackup.id, newBackup.name);
      fileId = newBackup.id;

      const now = new Date().toISOString();
      notifyStatusChange({
        state: 'synced',
        fileId: newBackup.id,
        fileName: newBackup.name,
        lastSyncedAt: now,
        message: `உங்கள் டிரைவில் புதிய முதன்மை கோப்பு (${newBackup.name}) உருவாக்கப்பட்டு சேமிக்கப்பட்டது!`,
      });
      return {
        success: true,
        fileId: newBackup.id,
        fileName: newBackup.name,
        timestamp: now,
      };
    }

    const errText = await response.text();
    throw new Error(`Google Drive Save Error: ${response.status} ${errText}`);
  } catch (err: any) {
    notifyStatusChange({
      state: 'error',
      fileId,
      message: err.message || 'டிரைவ் கோப்பில் சேமிக்க முடியவில்லை.',
    });
    throw err;
  }
};

/**
 * Debounced Auto-Drive Sync scheduler (runs when user has enabled Auto-Sync & is authenticated)
 */
let driveAutoSyncTimer: any = null;

export const scheduleAutoDriveSync = (snapshotData?: any) => {
  if (typeof window === 'undefined') return;
  if (!isDriveAutoSyncEnabled()) return;
  if (!isGoogleDriveAuthenticated()) return;

  if (driveAutoSyncTimer) clearTimeout(driveAutoSyncTimer);

  driveAutoSyncTimer = setTimeout(async () => {
    try {
      const data = snapshotData || (window as any).__vaharai_create_snapshot?.();
      if (data) {
        await saveToDesignatedDriveFile(data);
        console.log('[Auto-Drive-Sync] Automatically updated designated Google Drive file.');
      }
    } catch (err) {
      console.warn('[Auto-Drive-Sync] Failed:', err);
    }
  }, 1500);
};

// ================= Standard Backup List, Download, and Delete ================= //

export const listDriveBackups = async (): Promise<DriveBackupItem[]> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not authenticated');

  const query = encodeURIComponent("(name contains 'vaharai_ds_' or name contains '.json' or mimeType = 'application/json') and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=50&fields=files(id,name,createdTime,size,modifiedTime,webViewLink)&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    invalidateGoogleAccessToken();
    throw new Error('Google Drive session expired. Please reconnect your Google account.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    createdTime: f.modifiedTime || f.createdTime,
    size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : 'Empty / Unknown',
  }));
};

export const uploadBackupToDrive = async (snapshotData: any, customName?: string): Promise<DriveBackupItem> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not authenticated');

  const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = customName || `vaharai_ds_backup_${nowStr}.json`;
  const fileContent = JSON.stringify(snapshotData, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Koralaipattu North Vaharai Divisional Secretariat Database Backup',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (response.status === 401) {
    invalidateGoogleAccessToken();
    throw new Error('Google Drive session expired. Please reconnect Google Drive.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }

  const file = await response.json();
  return {
    id: file.id,
    name: file.name,
    createdTime: new Date().toISOString(),
    size: `${(fileContent.length / 1024).toFixed(1)} KB`,
  };
};

export const downloadDriveBackup = async (fileId: string): Promise<any> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not authenticated');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    invalidateGoogleAccessToken();
    throw new Error('Google Drive session expired. Please reconnect Google Drive.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Download failed: ${response.status} ${errorText}`);
  }

  const text = await response.text();
  const parsed = safeParseDriveJsonText(text);
  if (!parsed) {
    throw new Error('The selected Drive JSON file is empty or malformed (contains no valid database records).');
  }
  return parsed;
};

export const deleteDriveBackup = async (fileId: string): Promise<void> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not authenticated');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    invalidateGoogleAccessToken();
    throw new Error('Google Drive session expired. Please reconnect Google Drive.');
  }

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    throw new Error(`Delete failed: ${response.status} ${errorText}`);
  }
};
