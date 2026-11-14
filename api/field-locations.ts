import fs from 'fs';
import path from 'path';

export interface StoredFieldLocation {
  deviceId: string;
  userId: string;
  userName: string;
  role: string;
  division: string;
  dsDivisionId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  isInstalledPwa: boolean;
  isMobileFieldMode: boolean;
  userAgent?: string;
  updatedAt: string;
}

const LOCATIONS_FILE_PATH = path.join(process.cwd(), 'data', 'field_locations.json');
let inMemoryLocations: Record<string, StoredFieldLocation> | null = null;

function loadLocationsStore(): Record<string, StoredFieldLocation> {
  if (inMemoryLocations) return inMemoryLocations;
  try {
    if (fs.existsSync(LOCATIONS_FILE_PATH)) {
      const raw = fs.readFileSync(LOCATIONS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const typed = parsed as Record<string, StoredFieldLocation>;
        inMemoryLocations = typed;
        return typed;
      }
    }
  } catch (err) {
    console.warn('Could not read field_locations.json:', err);
  }
  const emptyStore: Record<string, StoredFieldLocation> = {};
  inMemoryLocations = emptyStore;
  return emptyStore;
}

function saveLocationsStore(store: Record<string, StoredFieldLocation>): boolean {
  inMemoryLocations = store;
  try {
    const dir = path.dirname(LOCATIONS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCATIONS_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('Could not write field_locations.json:', err);
    return false;
  }
}

function extractQueryParam(req: any, key: string): string {
  if (req.query && typeof req.query[key] === 'string') {
    return req.query[key];
  }
  try {
    const rawUrl = String(req.url || '');
    const qIdx = rawUrl.indexOf('?');
    if (qIdx >= 0) {
      const params = new URLSearchParams(rawUrl.slice(qIdx + 1));
      return params.get(key) || '';
    }
  } catch {
    // ignore
  }
  return '';
}

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const store = loadLocationsStore();

    if (req.method === 'GET') {
      const dsFilter = extractQueryParam(req, 'dsDivisionId');
      let list = Object.entries(store).map(([k, v]) => ({ ...v, key: k }));
      if (dsFilter && dsFilter !== 'ALL') {
        list = list.filter((loc) => (loc.dsDivisionId || 'DS_VAHARAI') === dsFilter);
      }
      list.sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''));

      return res.status(200).json({
        success: true,
        locations: list,
        total: list.length,
      });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }

      const lat = Number(body?.lat);
      const lng = Number(body?.lng);
      const userId = String(body?.userId || '').trim();
      const deviceId = String(body?.deviceId || 'default-device').trim();

      if (!userId || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          error: 'Valid userId, lat, and lng coordinates are required.',
        });
      }

      const key = `${userId}::${deviceId}`;
      const record: StoredFieldLocation = {
        deviceId,
        userId,
        userName: String(body?.userName || userId).trim(),
        role: String(body?.role || 'GRAMANIILATHARI').trim(),
        division: String(body?.division || 'ALL').trim().toUpperCase(),
        dsDivisionId: String(body?.dsDivisionId || 'DS_VAHARAI').trim(),
        lat,
        lng,
        accuracy: Number.isFinite(Number(body?.accuracy)) ? Math.round(Number(body.accuracy)) : undefined,
        heading: Number.isFinite(Number(body?.heading)) ? Number(body.heading) : null,
        speed: Number.isFinite(Number(body?.speed)) ? Number(body.speed) : null,
        isInstalledPwa: Boolean(body?.isInstalledPwa),
        isMobileFieldMode: Boolean(body?.isMobileFieldMode),
        userAgent: typeof body?.userAgent === 'string' ? body.userAgent.slice(0, 180) : undefined,
        updatedAt: new Date().toISOString(),
      };

      const nextStore = { ...store, [key]: record };
      const diskPersisted = saveLocationsStore(nextStore);

      return res.status(200).json({
        success: true,
        diskPersisted,
        location: record,
      });
    }

    if (req.method === 'DELETE') {
      const key = extractQueryParam(req, 'key');
      if (key && store[key]) {
        const nextStore = { ...store };
        delete nextStore[key];
        saveLocationsStore(nextStore);
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('API /api/field-locations error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal error in field-locations API',
    });
  }
}
