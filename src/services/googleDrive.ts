import { getGoogleAccessToken, invalidateGoogleAccessToken, isGoogleDriveAuthenticated, getGoogleDriveUser } from './auth';
import { DriveBackupItem } from '../types';
import { parseBeneficiariesFromCsv } from './csv';

export const DEFAULT_DESIGNATED_FILE_ID = '1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2';
export const DEFAULT_DESIGNATED_FILE_URL = 'https://drive.google.com/file/d/1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2/view?usp=sharing';

const STORAGE_KEYS = {
  DESIGNATED_FILE_ID: 'vaharai_ds_designated_drive_file_id',
  DESIGNATED_FILE_NAME: 'vaharai_ds_designated_drive_file_name',
  GOOGLE_SHEET_URL: 'vaharai_ds_google_sheet_url',
  APPS_SCRIPT_RELAY_URL: 'vaharai_ds_apps_script_relay_url',
  IS_PUBLIC_SHARED: 'vaharai_ds_drive_public_shared',
  SHARED_WEB_LINK: 'vaharai_ds_drive_web_link',
  OWNER_EMAIL: 'vaharai_ds_drive_owner_email',
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
  relayUrl?: string;
  ownerEmail?: string;
  isPubliclyReadable?: boolean;
  message?: string;
}

export interface SharedDriveConfigPayload {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  sheetUrl?: string;
  relayUrl?: string;
  ownerEmail?: string;
  isPubliclyReadable?: boolean;
  updatedAt?: string;
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
        return {
          ...currentSyncStatus,
          ...parsed,
          fileId: getDesignatedDriveFileId(),
          fileName: getDesignatedDriveFileName(),
          sheetUrl: getGoogleSheetUrl(),
          relayUrl: getAppsScriptRelayUrl(),
          isPubliclyReadable: isDriveFilePubliclyShared(),
        };
      } catch {
        // ignore
      }
    }
  }
  return currentSyncStatus;
};

const notifyStatusChange = (status: Partial<DriveSyncStatus>) => {
  currentSyncStatus = { ...currentSyncStatus, ...status };
  if (typeof window !== 'undefined' && (status.lastSyncedAt || status.state === 'error' || status.fileId || status.isPubliclyReadable !== undefined)) {
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

export const isDriveFilePubliclyShared = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEYS.IS_PUBLIC_SHARED) === 'true';
  }
  return false;
};

export const setDriveFilePubliclyShared = (val: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.IS_PUBLIC_SHARED, String(val));
  }
  notifyStatusChange({ isPubliclyReadable: val });
};

export const getAppsScriptRelayUrl = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_RELAY_URL) || '';
  }
  return '';
};

export const setAppsScriptRelayUrl = (url: string, syncServer: boolean = true): string => {
  const clean = url.trim();
  if (typeof window !== 'undefined') {
    if (clean) {
      localStorage.setItem(STORAGE_KEYS.APPS_SCRIPT_RELAY_URL, clean);
    } else {
      localStorage.removeItem(STORAGE_KEYS.APPS_SCRIPT_RELAY_URL);
    }
  }
  notifyStatusChange({ relayUrl: clean });
  if (syncServer) {
    void pushSharedDriveConfigToServer({ relayUrl: clean });
  }
  return clean;
};

export const setDesignatedDriveFileId = (idOrUrl: string, customName?: string, syncServer: boolean = true): string => {
  const extracted = extractDriveFileId(idOrUrl);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.DESIGNATED_FILE_ID, extracted);
    if (customName) {
      localStorage.setItem(STORAGE_KEYS.DESIGNATED_FILE_NAME, customName);
    }
  }
  notifyStatusChange({ fileId: extracted, ...(customName ? { fileName: customName } : {}) });
  if (syncServer) {
    void pushSharedDriveConfigToServer({
      fileId: extracted,
      ...(customName ? { fileName: customName } : {}),
    });
  }
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

export const setGoogleSheetUrl = (url: string, syncServer: boolean = true): string => {
  const clean = url.trim();
  if (typeof window !== 'undefined') {
    if (clean) {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_SHEET_URL, clean);
    } else {
      localStorage.removeItem(STORAGE_KEYS.GOOGLE_SHEET_URL);
    }
  }
  notifyStatusChange({ sheetUrl: clean });
  if (syncServer) {
    void pushSharedDriveConfigToServer({ sheetUrl: clean });
  }
  return clean;
};

export const getCurrentSharedDriveConfig = (): SharedDriveConfigPayload => {
  const owner = getGoogleDriveUser();
  return {
    fileId: getDesignatedDriveFileId(),
    fileName: getDesignatedDriveFileName(),
    webViewLink: (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEYS.SHARED_WEB_LINK)) || `https://drive.google.com/file/d/${getDesignatedDriveFileId()}/view`,
    sheetUrl: getGoogleSheetUrl(),
    relayUrl: getAppsScriptRelayUrl(),
    ownerEmail: owner?.email || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.OWNER_EMAIL) || '' : ''),
    isPubliclyReadable: isDriveFilePubliclyShared(),
  };
};

export const applySharedDriveConfigLocally = (config: Partial<SharedDriveConfigPayload> | null | undefined) => {
  if (!config || typeof window === 'undefined') return;
  if (typeof config.fileId === 'string' && config.fileId.trim()) {
    localStorage.setItem(STORAGE_KEYS.DESIGNATED_FILE_ID, config.fileId.trim());
  }
  if (typeof config.fileName === 'string' && config.fileName.trim()) {
    localStorage.setItem(STORAGE_KEYS.DESIGNATED_FILE_NAME, config.fileName.trim());
  }
  if (typeof config.webViewLink === 'string' && config.webViewLink.trim()) {
    localStorage.setItem(STORAGE_KEYS.SHARED_WEB_LINK, config.webViewLink.trim());
  }
  if (typeof config.sheetUrl === 'string') {
    if (config.sheetUrl.trim()) {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_SHEET_URL, config.sheetUrl.trim());
    }
  }
  if (typeof config.relayUrl === 'string') {
    if (config.relayUrl.trim()) {
      localStorage.setItem(STORAGE_KEYS.APPS_SCRIPT_RELAY_URL, config.relayUrl.trim());
    }
  }
  if (typeof config.ownerEmail === 'string' && config.ownerEmail.trim()) {
    localStorage.setItem(STORAGE_KEYS.OWNER_EMAIL, config.ownerEmail.trim());
  }
  if (typeof config.isPubliclyReadable === 'boolean') {
    localStorage.setItem(STORAGE_KEYS.IS_PUBLIC_SHARED, String(config.isPubliclyReadable));
  }
  notifyStatusChange({
    fileId: config.fileId || getDesignatedDriveFileId(),
    fileName: config.fileName || getDesignatedDriveFileName(),
    ...(config.webViewLink ? { webViewLink: config.webViewLink } : {}),
    ...(config.sheetUrl !== undefined ? { sheetUrl: config.sheetUrl } : {}),
    ...(config.relayUrl !== undefined ? { relayUrl: config.relayUrl } : {}),
    ...(config.ownerEmail ? { ownerEmail: config.ownerEmail } : {}),
    ...(config.isPubliclyReadable !== undefined ? { isPubliclyReadable: config.isPubliclyReadable } : {}),
  });
};

export const fetchSharedDriveConfigFromServer = async (): Promise<SharedDriveConfigPayload | null> => {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/drive/shared-config');
    if (!res.ok) return null;
    const body = await res.json();
    if (body?.success && body?.config) {
      applySharedDriveConfigLocally(body.config);
      return body.config as SharedDriveConfigPayload;
    }
  } catch {
    // ignore offline/static mode
  }
  return null;
};

export const pushSharedDriveConfigToServer = async (partial?: Partial<SharedDriveConfigPayload>): Promise<SharedDriveConfigPayload | null> => {
  if (typeof window === 'undefined') return null;
  try {
    const payload = {
      ...getCurrentSharedDriveConfig(),
      ...(partial || {}),
    };
    const res = await fetch('/api/drive/shared-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (body?.success && body?.config) {
      applySharedDriveConfigLocally(body.config);
      return body.config as SharedDriveConfigPayload;
    }
  } catch {
    // ignore offline/static mode
  }
  return null;
};

const safeParseDriveJsonText = (rawText: string): any | null => {
  const trimmed = (rawText || '').trim();
  if (!trimmed || trimmed === '{}' || trimmed === '[]' || /^\{\s*\[\s*\]\s*\}$/.test(trimmed)) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    if (data && (Array.isArray(data.beneficiaries) || Array.isArray(data.users) || Array.isArray(data.divisions))) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Make the designated Google Drive file readable by Anyone with the link (all staff workstations).
 * Must ONLY be called after explicit user confirmation in UI.
 */
export const shareDriveFileWithEveryone = async (
  customFileId?: string
): Promise<{ success: boolean; fileId: string; webViewLink?: string }> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google Drive is not authenticated. Please connect Google Drive first.');
  }

  const fileId = customFileId || getDesignatedDriveFileId();
  const permResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });

  if (permResp.status === 401) {
    invalidateGoogleAccessToken();
    throw new Error('Google Drive session expired. Please reconnect Google Drive.');
  }

  if (!permResp.ok) {
    const errText = await permResp.text();
    throw new Error(`Sharing failed (${permResp.status}): ${errText}`);
  }

  let webViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  let fileName = getDesignatedDriveFileName();
  try {
    const metaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,shared`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (metaResp.ok) {
      const meta = await metaResp.json();
      if (meta.webViewLink) webViewLink = meta.webViewLink;
      if (meta.name) fileName = meta.name;
    }
  } catch {
    // ignore metadata warning
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SHARED_WEB_LINK, webViewLink);
  }
  setDriveFilePubliclyShared(true);
  await pushSharedDriveConfigToServer({
    fileId,
    fileName,
    webViewLink,
    isPubliclyReadable: true,
    ownerEmail: getGoogleDriveUser()?.email || '',
  });

  notifyStatusChange({
    fileId,
    fileName,
    webViewLink,
    isPubliclyReadable: true,
    message: 'கோப்பு அனைவரும் பயன்படுத்தும்படி பகிரப்பட்டது (Shared with Anyone)!',
  });

  return { success: true, fileId, webViewLink };
};

/**
 * Fetch and parse data from Google Drive file, Apps Script Relay, or Google Sheet via Server Proxy
 */
export const fetchFromCloudProxy = async (targetIdOrUrl?: string): Promise<any | null> => {
  const sheetUrl = getGoogleSheetUrl();
  const relayUrl = getAppsScriptRelayUrl();
  const fileId = targetIdOrUrl ? extractDriveFileId(targetIdOrUrl) : getDesignatedDriveFileId();
  const queryParam = targetIdOrUrl && targetIdOrUrl.includes('spreadsheets')
    ? `url=${encodeURIComponent(targetIdOrUrl)}`
    : sheetUrl
    ? `url=${encodeURIComponent(sheetUrl)}`
    : `fileId=${encodeURIComponent(fileId)}${relayUrl ? `&relayUrl=${encodeURIComponent(relayUrl)}` : ''}`;

  try {
    const response = await fetch(`/api/drive/fetch?${queryParam}`);
    if (!response.ok) return null;
    const result = await response.json();

    if (result.success) {
      if (result.type === 'json' && result.data && (Array.isArray(result.data.beneficiaries) || Array.isArray(result.data.users))) {
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
 * Fetch directly from a configured Google Apps Script Relay URL (works even on static hosts without backend).
 */
const fetchFromAppsScriptRelay = async (fileId: string): Promise<any | null> => {
  const relayUrl = getAppsScriptRelayUrl();
  if (!relayUrl || !relayUrl.startsWith('https://script.google.com/')) return null;
  try {
    const sep = relayUrl.includes('?') ? '&' : '?';
    const resp = await fetch(`${relayUrl}${sep}fileId=${encodeURIComponent(fileId)}`);
    if (!resp.ok) return null;
    const text = await resp.text();
    return safeParseDriveJsonText(text);
  } catch (err) {
    console.warn('[Apps Script Relay] Direct fetch error:', err);
    return null;
  }
};

/**
 * Fetch and parse data from the designated Google Drive file or Google Sheet.
 * Automatically tries authenticated Drive API first if connected, then Apps Script Relay, then Server Proxy.
 */
export const fetchFromDesignatedDriveFile = async (customFileId?: string): Promise<any | null> => {
  const fileId = customFileId || getDesignatedDriveFileId();
  notifyStatusChange({ state: 'syncing', fileId, message: 'கூகிள் டிரைவ் சேமிப்பகத்திலிருந்து வாசிக்கப்படுகிறது...' });

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
            message: 'கூகிள் டிரைவ் கோப்பிலிருந்து தரவுகள் வெற்றிகரமாக பெறப்பட்டன.',
          });
          return data;
        }
        notifyStatusChange({
          state: 'idle',
          fileId,
          message: 'குறிக்கப்பட்ட டிரைவ் கோப்பு தற்போது காலியாக உள்ளது — காலியான தரவுத்தளத்தை சேமிக்கலாம்.',
        });
        return null;
      }
    } catch (e) {
      console.warn('[Google Drive] Authenticated API fetch warning:', e);
    }
  }

  // Step 2: Direct Apps Script Relay (if configured by owner, works on ALL browsers & static hosts)
  const relayData = await fetchFromAppsScriptRelay(fileId);
  if (relayData) {
    notifyStatusChange({
      state: 'synced',
      fileId,
      lastSyncedAt: new Date().toISOString(),
      message: 'பகிரப்பட்ட கூகிள் டிரைவ் ரிலே மூலம் தரவு பெறப்பட்டது.',
    });
    return relayData;
  }

  // Step 3: Server Proxy for shared public Drive file or Google Sheet
  try {
    const proxyData = await fetchFromCloudProxy(customFileId);
    if (proxyData && (Array.isArray(proxyData.beneficiaries) || Array.isArray(proxyData.users))) {
      notifyStatusChange({
        state: 'synced',
        fileId,
        lastSyncedAt: new Date().toISOString(),
        message: 'பகிரப்பட்ட கூகிள் டிரைவிலிருந்து தரவுகள் வெற்றிகரமாக பெறப்பட்டன.',
      });
      return proxyData;
    }
  } catch (proxyErr) {
    console.warn('[Google Drive] Proxy load attempt error:', proxyErr);
  }

  notifyStatusChange({
    state: 'idle',
    fileId,
    message: 'கூகிள் டிரைவ் சேமிப்பகம் தயார் நிலையில் உள்ளது.',
  });
  return null;
};

/**
 * Saves/updates data directly into the designated Google Drive file.
 * Uses PATCH media to update in-place, falls back to creating writable file on 403/404,
 * or pushes via shared Apps Script Relay when configured for non-authenticated staff browsers.
 */
export const saveToDesignatedDriveFile = async (
  snapshotData: any,
  customFileId?: string
): Promise<{ success: boolean; fileId: string; fileName: string; webViewLink?: string; timestamp: string }> => {
  const token = getGoogleAccessToken();
  const relayUrl = getAppsScriptRelayUrl();
  let fileId = customFileId || getDesignatedDriveFileId();

  // Fallback write via Shared Google Apps Script Relay for workstations without Google Login
  if (!token && relayUrl && relayUrl.startsWith('https://script.google.com/')) {
    notifyStatusChange({ state: 'syncing', fileId, message: 'பகிரப்பட்ட டிரைவ் ரிலே மூலம் சேமிக்கப்படுகிறது...' });
    const resp = await fetch(relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fileId, data: snapshotData }),
    });
    if (!resp.ok) {
      throw new Error(`Shared Drive Relay save failed (${resp.status})`);
    }
    const now = new Date().toISOString();
    const fileName = getDesignatedDriveFileName();
    notifyStatusChange({
      state: 'synced',
      fileId,
      fileName,
      lastSyncedAt: now,
      message: `பகிரப்பட்ட கூகிள் டிரைவ் கோப்பில் (${fileName}) சேமிக்கப்பட்டது!`,
    });
    return {
      success: true,
      fileId,
      fileName,
      timestamp: now,
    };
  }

  if (!token) {
    notifyStatusChange({
      state: 'error',
      message: 'கூகிள் டிரைவ் உள்நுழையப்படவில்லை. தயவுசெய்து Google Drive உடன் இணைக்கவும்.',
    });
    throw new Error('Google Drive is not authenticated. Please connect Google Drive first.');
  }

  notifyStatusChange({ state: 'syncing', fileId, message: 'டிரைவ் கோப்பில் சேமிக்கப்படுகிறது...' });

  const fileContent = JSON.stringify(snapshotData, null, 2);

  try {
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
      if (typeof window !== 'undefined' && savedMeta.webViewLink) {
        localStorage.setItem(STORAGE_KEYS.SHARED_WEB_LINK, savedMeta.webViewLink);
      }

      void pushSharedDriveConfigToServer({
        fileId: actualFileId,
        fileName: actualFileName,
        ...(savedMeta.webViewLink ? { webViewLink: savedMeta.webViewLink } : {}),
        ownerEmail: getGoogleDriveUser()?.email || '',
      });

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
    // create a writable master JSON file in the user's own Drive and publish its File ID to shared-config
    if (response.status === 404 || response.status === 403) {
      console.warn(`Target file ${fileId} not writable or not found (${response.status}). Creating writable master file in user's Drive...`);
      const newBackup = await uploadBackupToDrive(snapshotData, 'vaharai_ds_master_central_database.json');
      setDesignatedDriveFileId(newBackup.id, newBackup.name, true);
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
 * Debounced Auto-Drive Sync scheduler (runs when user has enabled Auto-Sync & is authenticated or Relay URL is configured)
 */
let driveAutoSyncTimer: any = null;

export const scheduleAutoDriveSync = (snapshotData?: any) => {
  if (typeof window === 'undefined') return;
  if (!isDriveAutoSyncEnabled()) return;
  if (!isGoogleDriveAuthenticated() && !getAppsScriptRelayUrl()) return;

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
