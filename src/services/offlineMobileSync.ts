import {
  Beneficiary,
  HouseholdData,
  User,
  SystemAuditLog,
} from '../types';
import {
  fetchCentralDatabase,
  pushToCentralDatabase,
  restoreDatabaseFromSnapshot,
  createDatabaseSnapshot,
  filterSnapshotByDivision,
  pruneLocalStorageToDivision,
  loadHouseholds,
  saveHouseholds,
  loadBeneficiaries,
  saveBeneficiaries,
  loadAuditLogs,
  setStoredData,
  STORAGE_KEYS,
  DivisionScope,
} from './storage';
import {
  saveToDesignatedDriveFile,
  getAppsScriptRelayUrl,
  isDriveAutoSyncEnabled,
} from './googleDrive';
import { isGoogleDriveAuthenticated } from './auth';

export interface OfflineFamilyChange {
  familyKey: string; // household.familyCode || household.id
  household: HouseholdData;
  savedMembers: Beneficiary[];
  removedMemberIds: string[];
  isEdit: boolean;
  queuedAt: string;
  officerId: string;
  officerName: string;
}

export interface OfflineSyncMeta {
  lastDownloadedAt?: string;
  lastUploadedAt?: string;
  downloadedFamiliesCount?: number;
  downloadedMembersCount?: number;
  scopedDivision?: string;
}

const OFFLINE_QUEUE_KEY = 'vaharai_mobile_offline_sync_queue_v1';
const OFFLINE_META_KEY = 'vaharai_mobile_offline_meta_v1';

const IDB_NAME = 'vaharai_ds_offline_db';
const IDB_STORE = 'keyval';

const openMobileIdb = (): Promise<IDBDatabase | null> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const mobileIdbPut = async (key: string, value: any): Promise<void> => {
  const db = await openMobileIdb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
};

const mobileIdbGet = async <T>(key: string): Promise<T | null> => {
  const db = await openMobileIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as T) ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
};

export const loadOfflineSyncQueue = (): OfflineFamilyChange[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const hydrateOfflineQueueFromIdb = async (): Promise<OfflineFamilyChange[]> => {
  const local = loadOfflineSyncQueue();
  const idbData = await mobileIdbGet<OfflineFamilyChange[]>(OFFLINE_QUEUE_KEY);
  if (Array.isArray(idbData) && idbData.length > local.length) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(idbData));
    } catch {
      // ignore
    }
    return idbData;
  }
  return local;
};

export const saveOfflineSyncQueue = (queue: OfflineFamilyChange[]): void => {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore localStorage quota; IndexedDB persists full payload
  }
  void mobileIdbPut(OFFLINE_QUEUE_KEY, queue);
};

export const loadOfflineSyncMeta = (): OfflineSyncMeta => {
  try {
    const raw = localStorage.getItem(OFFLINE_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveOfflineSyncMeta = (meta: OfflineSyncMeta): void => {
  try {
    localStorage.setItem(OFFLINE_META_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
  void mobileIdbPut(OFFLINE_META_KEY, meta);
};

const resolveUserDivisionScope = (user?: User): DivisionScope | null => {
  if (!user) return null;
  const div = (user.division || '').trim().toUpperCase();
  if (div && div !== 'ALL') {
    return {
      division: div,
      dsDivisionId: user.dsDivisionId || 'DS_VAHARAI',
    };
  }
  return null;
};

/**
 * Step 1: Download existing families & members STRICTLY for this Grama Niladhari's division
 * from Main Server (/api/database?division=...). Other divisions are NEVER downloaded!
 */
export const downloadFamiliesForOffline = async (user?: User): Promise<{
  success: boolean;
  familiesCount: number;
  membersCount: number;
  error?: string;
}> => {
  try {
    const scope = resolveUserDivisionScope(user);
    const central = await fetchCentralDatabase(scope);
    if (!central || (!Array.isArray(central.households) && !Array.isArray(central.beneficiaries))) {
      return {
        success: false,
        familiesCount: loadHouseholds().length,
        membersCount: loadBeneficiaries().length,
        error: 'Could not reach main server (/api/database). Check internet connection.',
      };
    }

    const filteredCentral = scope
      ? filterSnapshotByDivision(central, scope.division, scope.dsDivisionId)
      : central;

    // Preserve any un-uploaded offline queue edits for this division so downloading never wipes field changes
    const pendingQueue = await hydrateOfflineQueueFromIdb();
    const scopedQueue = scope
      ? pendingQueue.filter(
          (q) => (q.household.divisionCode || '').trim().toUpperCase() === scope.division
        )
      : pendingQueue;

    restoreDatabaseFromSnapshot(filteredCentral);
    if (scope) {
      pruneLocalStorageToDivision(scope.division, scope.dsDivisionId);
    }

    if (scopedQueue.length > 0) {
      let currentHouseholds = loadHouseholds();
      let currentBeneficiaries = loadBeneficiaries();
      for (const change of scopedQueue) {
        const merged = applyChangeToArrays(currentHouseholds, currentBeneficiaries, change);
        currentHouseholds = merged.households;
        currentBeneficiaries = merged.beneficiaries;
      }
      saveHouseholds(currentHouseholds, false);
      saveBeneficiaries(currentBeneficiaries, false, false);
    }

    const familiesCount = loadHouseholds().length;
    const membersCount = loadBeneficiaries().length;
    const prevMeta = loadOfflineSyncMeta();
    saveOfflineSyncMeta({
      ...prevMeta,
      lastDownloadedAt: new Date().toISOString(),
      downloadedFamiliesCount: familiesCount,
      downloadedMembersCount: membersCount,
      scopedDivision: scope?.division,
    });

    return {
      success: true,
      familiesCount,
      membersCount,
    };
  } catch (err: any) {
    return {
      success: false,
      familiesCount: loadHouseholds().length,
      membersCount: loadBeneficiaries().length,
      error: err?.message || 'Download failed',
    };
  }
};

export const applyChangeToArrays = (
  baseHouseholds: HouseholdData[],
  baseBeneficiaries: Beneficiary[],
  change: OfflineFamilyChange
): { households: HouseholdData[]; beneficiaries: Beneficiary[] } => {
  const famKeyUpper = (change.household.familyCode || change.household.id).trim().toUpperCase();
  const existingIdx = baseHouseholds.findIndex(
    (h) =>
      h.id === change.household.id ||
      (h.familyCode && h.familyCode.trim().toUpperCase() === famKeyUpper)
  );
  let nextHouseholds: HouseholdData[];
  if (existingIdx >= 0) {
    nextHouseholds = [...baseHouseholds];
    nextHouseholds[existingIdx] = change.household;
  } else {
    nextHouseholds = [change.household, ...baseHouseholds];
  }

  const savedMap = new Map(change.savedMembers.map((m) => [m.id, m]));
  const removedSet = new Set(change.removedMemberIds);
  const updatedExisting = baseBeneficiaries
    .filter((b) => !removedSet.has(b.id))
    .map((b) => savedMap.get(b.id) || b);
  const existingIds = new Set(updatedExisting.map((b) => b.id));
  const newlyAdded = change.savedMembers.filter((m) => !existingIds.has(m.id));
  const nextBeneficiaries = [...newlyAdded, ...updatedExisting];

  return {
    households: nextHouseholds,
    beneficiaries: nextBeneficiaries,
  };
};

/**
 * Step 2: Queue a family + member save locally (works 100% offline!)
 * Enforces Grama Niladhari division lock if assigned.
 */
export const queueOfflineFamilyChange = (payload: {
  household: HouseholdData;
  savedMembers: Beneficiary[];
  removedMemberIds: string[];
  isEdit: boolean;
  user: User;
}): {
  nextHouseholds: HouseholdData[];
  nextBeneficiaries: Beneficiary[];
  queue: OfflineFamilyChange[];
} => {
  const dsId = payload.user.role === 'DISTRICT_ADMIN'
    ? (payload.household.dsDivisionId || 'DS_VAHARAI')
    : (payload.user.dsDivisionId || payload.household.dsDivisionId || 'DS_VAHARAI');

  const userDiv = (payload.user.division || '').trim().toUpperCase();
  const lockedDiv =
    payload.user.role === 'GRAMANIILATHARI' && userDiv && userDiv !== 'ALL'
      ? userDiv
      : payload.household.divisionCode;

  const stampedHousehold: HouseholdData = {
    ...payload.household,
    divisionCode: lockedDiv,
    dsDivisionId: payload.household.dsDivisionId || dsId,
    updatedAt: new Date().toISOString(),
  };

  const stampedMembers: Beneficiary[] = payload.savedMembers.map((m) => ({
    ...m,
    divisionCode: lockedDiv,
    dsDivisionId: m.dsDivisionId || dsId,
    updatedAt: new Date().toISOString(),
  }));

  const familyKey = (stampedHousehold.familyCode || stampedHousehold.id).trim().toUpperCase();
  const currentQueue = loadOfflineSyncQueue();
  const existingQueueEntry = currentQueue.find((q) => q.familyKey === familyKey);
  const combinedRemovedIds = Array.from(
    new Set([...(existingQueueEntry?.removedMemberIds || []), ...payload.removedMemberIds])
  );

  const nextEntry: OfflineFamilyChange = {
    familyKey,
    household: stampedHousehold,
    savedMembers: stampedMembers,
    removedMemberIds: combinedRemovedIds,
    isEdit: existingQueueEntry ? existingQueueEntry.isEdit : payload.isEdit,
    queuedAt: new Date().toISOString(),
    officerId: payload.user.id,
    officerName: payload.user.name,
  };

  const nextQueue = [
    nextEntry,
    ...currentQueue.filter((q) => q.familyKey !== familyKey),
  ];
  saveOfflineSyncQueue(nextQueue);

  const merged = applyChangeToArrays(loadHouseholds(), loadBeneficiaries(), nextEntry);
  saveHouseholds(merged.households, false);
  saveBeneficiaries(merged.beneficiaries, false, false);

  return {
    nextHouseholds: merged.households,
    nextBeneficiaries: merged.beneficiaries,
    queue: nextQueue,
  };
};

/**
 * Step 3: Safely merge all pending offline family/member changes onto this officer's division
 * and push via scoped division merge (/api/database preserves all other GN divisions).
 */
export const uploadPendingOfflineChangesToServer = async (
  user: User
): Promise<{
  success: boolean;
  syncedFamilies: number;
  syncedMembers: number;
  error?: string;
}> => {
  const queue = await hydrateOfflineQueueFromIdb();
  if (queue.length === 0) {
    return { success: true, syncedFamilies: 0, syncedMembers: 0 };
  }

  const scope = resolveUserDivisionScope(user);

  try {
    // 1. Fetch latest snapshot ONLY for this GN division from main server
    const latestRemote = await fetchCentralDatabase(scope);
    let mergedHouseholds: HouseholdData[] =
      latestRemote && Array.isArray(latestRemote.households)
        ? latestRemote.households
        : loadHouseholds();
    let mergedBeneficiaries: Beneficiary[] =
      latestRemote && Array.isArray(latestRemote.beneficiaries)
        ? latestRemote.beneficiaries
        : loadBeneficiaries();

    if (scope) {
      mergedHouseholds = mergedHouseholds.filter(
        (h) => (h.divisionCode || '').trim().toUpperCase() === scope.division
      );
      mergedBeneficiaries = mergedBeneficiaries.filter(
        (b) => (b.divisionCode || '').trim().toUpperCase() === scope.division
      );
    }

    if (latestRemote) {
      restoreDatabaseFromSnapshot({
        ...latestRemote,
        households: mergedHouseholds,
        beneficiaries: mergedBeneficiaries,
      });
    }

    // 2. Apply queued mobile edits chronologically (oldest first)
    const relevantQueue = scope
      ? queue.filter((q) => (q.household.divisionCode || '').trim().toUpperCase() === scope.division)
      : queue;

    const chronological = [...relevantQueue].reverse();
    let totalMembersTouched = 0;
    for (const change of chronological) {
      const res = applyChangeToArrays(mergedHouseholds, mergedBeneficiaries, change);
      mergedHouseholds = res.households;
      mergedBeneficiaries = res.beneficiaries;
      totalMembersTouched += change.savedMembers.length;
    }

    // 3. Record audit log entry for mobile sync
    const existingLogs = loadAuditLogs();
    const syncLog: SystemAuditLog = {
      id: `LOG-MOB-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      action: 'MOBILE_FIELD_OFFLINE_SYNC',
      details: `GN Mobile App (${scope?.division || 'ALL'}) uploaded ${relevantQueue.length} offline family update(s) (${totalMembersTouched} members) to Main Server.`,
    };

    saveHouseholds(mergedHouseholds, false);
    saveBeneficiaries(mergedBeneficiaries, false, false);
    setStoredData(STORAGE_KEYS.AUDIT_LOGS, [syncLog, ...existingLogs.slice(0, 499)]);

    const snapshot = createDatabaseSnapshot(scope);
    const ok = await pushToCentralDatabase(snapshot);
    if (!ok) {
      return {
        success: false,
        syncedFamilies: 0,
        syncedMembers: 0,
        error: 'Main server did not accept sync response. Changes remain safely queued offline.',
      };
    }

    // 4. Only full-access users push direct Drive snapshots; GN division users never overwrite shared Drive with 1 division
    if (!scope && (isGoogleDriveAuthenticated() || !!getAppsScriptRelayUrl()) && isDriveAutoSyncEnabled()) {
      try {
        await saveToDesignatedDriveFile(snapshot);
      } catch {
        // non-fatal; central server already persisted
      }
    }

    // 5. Clear synced items from queue
    const remainingQueue = scope
      ? queue.filter((q) => (q.household.divisionCode || '').trim().toUpperCase() !== scope.division)
      : [];
    saveOfflineSyncQueue(remainingQueue);
    const prevMeta = loadOfflineSyncMeta();
    saveOfflineSyncMeta({
      ...prevMeta,
      lastUploadedAt: new Date().toISOString(),
      downloadedFamiliesCount: mergedHouseholds.length,
      downloadedMembersCount: mergedBeneficiaries.length,
      scopedDivision: scope?.division,
    });

    return {
      success: true,
      syncedFamilies: relevantQueue.length,
      syncedMembers: totalMembersTouched,
    };
  } catch (err: any) {
    return {
      success: false,
      syncedFamilies: 0,
      syncedMembers: 0,
      error: err?.message || 'Upload failed. Changes stay safely queued offline.',
    };
  }
};
