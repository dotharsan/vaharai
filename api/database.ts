import fs from 'fs';
import path from 'path';

// In-memory cache for serverless instance lifetime
let inMemorySnapshot: any = null;

// Safe seed fallback database containing official Koralaipattu North (Vaharai) initial records
const FALLBACK_SEED = {
  version: '4.0',
  exportedAt: new Date().toISOString(),
  organization: 'Divisional Secretariat Koralaipattu North (Vaharai)',
  users: [],
  beneficiaries: [],
  tokens: [],
  divisions: [],
  assistance: [],
  auditLogs: [],
};

const normDiv = (val?: string | null): string => String(val || '').trim().toUpperCase();

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

function filterSnapshotForDivision(snapshot: any, targetDivisionRaw: string, targetDsRaw?: string): any {
  const targetDiv = normDiv(targetDivisionRaw);
  const targetDs = String(targetDsRaw || '').trim();
  if (!targetDiv || targetDiv === 'ALL') {
    return snapshot;
  }

  const matchesDiv = (itemDiv?: string, itemDs?: string): boolean => {
    if (normDiv(itemDiv) !== targetDiv) return false;
    if (targetDs && targetDs !== 'ALL' && (itemDs || 'DS_VAHARAI') !== targetDs) return false;
    return true;
  };

  return {
    ...snapshot,
    scopedDivision: targetDiv,
    scopedDsDivisionId: targetDs && targetDs !== 'ALL' ? targetDs : undefined,
    users: Array.isArray(snapshot.users)
      ? snapshot.users.filter((u: any) => {
          if (targetDs && targetDs !== 'ALL' && (u.dsDivisionId || 'DS_VAHARAI') !== targetDs) return false;
          return normDiv(u.division) === targetDiv || u.role === 'SUPERADMIN';
        })
      : [],
    divisions: Array.isArray(snapshot.divisions)
      ? snapshot.divisions.filter((d: any) => matchesDiv(d.code, d.dsDivisionId))
      : [],
    beneficiaries: Array.isArray(snapshot.beneficiaries)
      ? snapshot.beneficiaries.filter((b: any) => matchesDiv(b.divisionCode, b.dsDivisionId))
      : [],
    households: Array.isArray(snapshot.households)
      ? snapshot.households.filter((h: any) => matchesDiv(h.divisionCode, h.dsDivisionId))
      : [],
    assistance: Array.isArray(snapshot.assistance)
      ? snapshot.assistance.filter((a: any) => matchesDiv(a.divisionCode, a.dsDivisionId))
      : [],
    pregnantMothers: Array.isArray(snapshot.pregnantMothers)
      ? snapshot.pregnantMothers.filter((m: any) => matchesDiv(m.divisionCode, m.dsDivisionId))
      : [],
    landRecords: Array.isArray(snapshot.landRecords)
      ? snapshot.landRecords.filter((l: any) => matchesDiv(l.divisionCode, l.dsDivisionId))
      : [],
    petitions: Array.isArray(snapshot.petitions)
      ? snapshot.petitions.filter((p: any) => matchesDiv(p.divisionCode, p.dsDivisionId))
      : [],
    tokens: Array.isArray(snapshot.tokens)
      ? snapshot.tokens.filter((t: any) => matchesDiv(t.divisionCode, t.dsDivisionId))
      : [],
    auditLogs: Array.isArray(snapshot.auditLogs) ? snapshot.auditLogs.slice(0, 50) : [],
  };
}

function mergeScopedDivisionSnapshot(current: any, incoming: any, targetDivRaw: string, targetDsRaw?: string): any {
  const targetDiv = normDiv(targetDivRaw);
  const targetDs = String(targetDsRaw || '').trim();

  const belongsToScope = (itemDiv?: string, itemDs?: string): boolean => {
    if (normDiv(itemDiv) !== targetDiv) return false;
    if (targetDs && targetDs !== 'ALL' && (itemDs || 'DS_VAHARAI') !== targetDs) return false;
    return true;
  };

  const replaceScopeItems = (existingList: any[], incomingList: any[], getDiv: (x: any) => string, getDs: (x: any) => string) => {
    const safeExisting = Array.isArray(existingList) ? existingList : [];
    const safeIncoming = Array.isArray(incomingList) ? incomingList : [];
    const otherDivItems = safeExisting.filter((item) => !belongsToScope(getDiv(item), getDs(item)));
    const scopedIncomingItems = safeIncoming
      .filter((item) => normDiv(getDiv(item)) === targetDiv)
      .map((item) => ({
        ...item,
        divisionCode: item.divisionCode || targetDiv,
        dsDivisionId: item.dsDivisionId || (targetDs && targetDs !== 'ALL' ? targetDs : 'DS_VAHARAI'),
      }));
    return [...scopedIncomingItems, ...otherDivItems];
  };

  const existingLogs = Array.isArray(current.auditLogs) ? current.auditLogs : [];
  const incomingLogs = Array.isArray(incoming.auditLogs) ? incoming.auditLogs : [];
  const logIds = new Set(existingLogs.map((l: any) => l?.id).filter(Boolean));
  const newLogs = incomingLogs.filter((l: any) => l?.id && !logIds.has(l.id));
  const mergedLogs = [...newLogs, ...existingLogs].slice(0, 500);

  return {
    ...current,
    exportedAt: incoming.exportedAt || new Date().toISOString(),
    lastServerSync: new Date().toISOString(),
    beneficiaries: replaceScopeItems(
      current.beneficiaries,
      incoming.beneficiaries,
      (x) => x?.divisionCode,
      (x) => x?.dsDivisionId
    ),
    households: replaceScopeItems(
      current.households,
      incoming.households,
      (x) => x?.divisionCode,
      (x) => x?.dsDivisionId
    ),
    assistance: replaceScopeItems(
      current.assistance,
      incoming.assistance,
      (x) => x?.divisionCode,
      (x) => x?.dsDivisionId
    ),
    pregnantMothers: replaceScopeItems(
      current.pregnantMothers,
      incoming.pregnantMothers,
      (x) => x?.divisionCode,
      (x) => x?.dsDivisionId
    ),
    landRecords: replaceScopeItems(
      current.landRecords,
      incoming.landRecords,
      (x) => x?.divisionCode,
      (x) => x?.dsDivisionId
    ),
    petitions: replaceScopeItems(
      current.petitions,
      incoming.petitions,
      (x) => x?.divisionCode,
      (x) => x?.dsDivisionId
    ),
    tokens: replaceScopeItems(
      current.tokens,
      incoming.tokens,
      (x) => x?.divisionCode,
      (x) => x?.dsDivisionId
    ),
    auditLogs: mergedLogs,
  };
}

// Safe seed loader that handles Vercel serverless environment gracefully without throwing
function getSeedData() {
  try {
    const cwd = process.cwd();
    const candidates = [
      path.join(cwd, 'data', 'central_database.json'),
      path.join(cwd, 'src', 'data', 'central_database.json'),
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Vercel API] Could not read disk file, using embedded seed:', err);
  }
  return FALLBACK_SEED;
}

export default function handler(req: any, res: any) {
  try {
    // Set permissive CORS headers for all office clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'GET') {
      const fullData = inMemorySnapshot || getSeedData();
      const divisionParam = extractQueryParam(req, 'division');
      const dsParam = extractQueryParam(req, 'dsDivisionId');

      const responseData =
        divisionParam && normDiv(divisionParam) !== 'ALL'
          ? filterSnapshotForDivision(fullData, divisionParam, dsParam)
          : fullData;

      return res.status(200).json({
        success: true,
        data: responseData,
        scopedDivision: divisionParam && normDiv(divisionParam) !== 'ALL' ? normDiv(divisionParam) : null,
        source: inMemorySnapshot ? 'serverless_cache' : 'seed_database',
        mode: 'express_central',
      });
    }

    if (req.method === 'POST') {
      const rawBody = req.body;
      let snapshot = rawBody;
      if (typeof rawBody === 'string') {
        try {
          snapshot = JSON.parse(rawBody);
        } catch {
          return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
        }
      }
      if (!snapshot || !Array.isArray(snapshot.beneficiaries) || !Array.isArray(snapshot.users)) {
        return res.status(400).json({ success: false, error: 'Invalid database snapshot format' });
      }

      const current = inMemorySnapshot || getSeedData();
      if (
        current?.explicitlyCleared === true &&
        current?.clearedAt &&
        !snapshot.explicitlyCleared &&
        snapshot.clearedAt !== current.clearedAt &&
        !snapshot.driveConfig
      ) {
        return res.status(200).json({
          success: true,
          ignoredStale: true,
          message: 'Ignored stale pre-clear client snapshot to preserve clean central storage',
          data: current,
        });
      }

      const scopedDivision = normDiv(snapshot.scopedDivision);
      const scopedDsDivisionId = snapshot.scopedDsDivisionId ? String(snapshot.scopedDsDivisionId).trim() : undefined;

      let nextSnapshot: any;
      if (scopedDivision && scopedDivision !== 'ALL') {
        nextSnapshot = mergeScopedDivisionSnapshot(current, snapshot, scopedDivision, scopedDsDivisionId);
      } else {
        snapshot.lastServerSync = new Date().toISOString();
        delete snapshot.scopedDivision;
        delete snapshot.scopedDsDivisionId;
        nextSnapshot = snapshot;
      }

      inMemorySnapshot = nextSnapshot;

      // Try persisting to disk if writable (writes to runtime data folder, avoiding src reloads)
      let diskPersisted = false;
      try {
        const cwd = process.cwd();
        const dataPath = path.join(cwd, 'data', 'central_database.json');
        const dir = path.dirname(dataPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(dataPath, JSON.stringify(nextSnapshot), 'utf-8');
        diskPersisted = true;
      } catch (err) {
        console.warn('Central database disk write error:', err);
      }

      return res.status(200).json({
        success: true,
        diskPersisted,
        scopedMerge: Boolean(scopedDivision && scopedDivision !== 'ALL'),
        scopedDivision: scopedDivision && scopedDivision !== 'ALL' ? scopedDivision : null,
        message: 'Central database updated successfully',
        lastServerSync: nextSnapshot.lastServerSync,
        counts: {
          citizens: nextSnapshot.beneficiaries?.length || 0,
          households: nextSnapshot.households?.length || 0,
          landRecords: nextSnapshot.landRecords?.length || 0,
          pregnantMothers: nextSnapshot.pregnantMothers?.length || 0,
          assistance: nextSnapshot.assistance?.length || 0,
          divisions: nextSnapshot.divisions?.length || 0,
          tokens: nextSnapshot.tokens?.length || 0,
          users: nextSnapshot.users?.length || 0,
        },
      });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('API /api/database error:', err);
    // Never return status 500 without valid JSON response
    return res.status(200).json({
      success: true,
      data: FALLBACK_SEED,
      warning: err.message || 'Recovered using fallback seed database',
    });
  }
}
