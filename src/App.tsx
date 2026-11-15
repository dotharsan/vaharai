import React, { useState, useEffect } from 'react';
import {
  User,
  Beneficiary,
  QueueToken,
  GNDivision,
  SystemAuditLog,
  AssistanceRecord,
  ServiceDefinition,
  PregnantMotherRecord,
  LandRecord,
  HouseholdData,
  PovertyScoringWeights,
  PublicPetition,
} from './types';
import { Language } from './translations/i18n';
import {
  loadUsers,
  saveUsers,
  loadBeneficiaries,
  saveBeneficiaries,
  loadTokens,
  saveTokens,
  loadDivisions,
  saveDivisions,
  loadAuditLogs,
  logAuditAction,
  loadAssistanceRecords,
  saveAssistanceRecords,
  loadServices,
  saveServices,
  loadPregnantMothers,
  savePregnantMothers,
  loadLandRecords,
  saveLandRecords,
  loadHouseholds,
  saveHouseholds,
  loadPovertyWeights,
  savePovertyWeights,
  loadPetitions,
  savePetitions,
  isRecordDeleted,
  fetchCentralDatabase,
  pushToCentralDatabase,
  restoreDatabaseFromSnapshot,
  isServerApiAvailable,
  createDatabaseSnapshot,
  getDsDivisionById,
  getLastLocalMutationAt,
  hydrateStorageFromIndexedDb,
  getLastClearAt,
  setLastClearAt,
  getActiveDivisionScope,
  filterSnapshotByDivision,
  pruneLocalStorageToDivision,
} from './services/storage';
import {
  getActiveUserSession,
  setActiveUserSession,
  signInWithGoogleDrive,
  getGoogleDriveUser,
  isGoogleDriveAuthenticated,
} from './services/auth';
import {
  fetchFromDesignatedDriveFile,
  saveToDesignatedDriveFile,
  getDesignatedDriveFileId,
  onDriveSyncStatusChange,
  DriveSyncStatus,
  getDriveSyncStatus,
  isCustomDesignatedFileSet,
  getGoogleSheetUrl,
  isDriveAutoSyncEnabled,
  fetchSharedDriveConfigFromServer,
  applySharedDriveConfigLocally,
  getAppsScriptRelayUrl,
  flushAutoDriveSync,
  isDriveSyncBusy,
} from './services/googleDrive';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { BeneficiariesView } from './components/BeneficiariesView';
import { ReceptionTokenView } from './components/ReceptionTokenView';
import { LiveCounterDisplayView } from './components/LiveCounterDisplayView';
import { StaffManagementView } from './components/StaffManagementView';
import { CsvManagementView } from './components/CsvManagementView';
import { DriveBackupView } from './components/DriveBackupView';
import { AiReportView } from './components/AiReportView';
import { ServiceAuditView } from './components/ServiceAuditView';
import { AssistanceDistributionView } from './components/AssistanceDistributionView';
import { ServiceManagementView } from './components/ServiceManagementView';
import { ElderlyOfficerManagementView } from './components/ElderlyOfficerManagementView';
import { PregnantMothersView } from './components/PregnantMothersView';
import { DisabilityOfficerManagementView } from './components/DisabilityOfficerManagementView';
import { PublicPetitionsView } from './components/PublicPetitionsView';
import { LandManagementView } from './components/LandManagementView';
import { FamilyDataCenterView } from './components/FamilyDataCenterView';
import { UniversalCitizenSearchView } from './components/UniversalCitizenSearchView';
import { DistrictMasterAdminView } from './components/DistrictMasterAdminView';
import { GnDivisionsManagementView } from './components/GnDivisionsManagementView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { StorageTransparencyModal } from './components/StorageTransparencyModal';
import { OfficeLayoutModal } from './components/OfficeLayoutModal';
import { Sidebar } from './components/Sidebar';
import { MobileFamilyFieldApp } from './components/MobileFamilyFieldApp';
import { FieldOfficersLocationMapView } from './components/FieldOfficersLocationMapView';
import { SuperAdminTransfersDeathsView } from './components/SuperAdminTransfersDeathsView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useFieldLocationReporter, detectInstalledPwa } from './services/fieldLocationTracker';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<User | null>(() => getActiveUserSession());
  const [lang, setLang] = useState<Language>('ta');
  const isOnline = useOnlineStatus();
  const [mobileFieldMode, setMobileFieldMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'mobile-field') return true;
    try {
      return localStorage.getItem('vaharai_mobile_field_mode') === 'true';
    } catch {
      return false;
    }
  });

  const setMobileModeEnabled = (next: boolean) => {
    setMobileFieldMode(next);
    try {
      if (next) {
        localStorage.setItem('vaharai_mobile_field_mode', 'true');
      } else {
        localStorage.removeItem('vaharai_mobile_field_mode');
      }
      const url = new URL(window.location.href);
      if (next) url.searchParams.set('mode', 'mobile-field');
      else url.searchParams.delete('mode');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  const [navState, setNavState] = useState<{ history: string[]; index: number }>({
    history: ['dashboard'],
    index: 0,
  });
  const currentTab = navState.history[navState.index] || 'dashboard';

  const navigateToTab = (nextTab: string) => {
    if (!nextTab) return;
    setNavState((prev) => {
      const active = prev.history[prev.index];
      if (active === nextTab) return prev;
      const nextHistory = [...prev.history.slice(0, prev.index + 1), nextTab];
      return { history: nextHistory, index: nextHistory.length - 1 };
    });
  };

  const resetNavTab = (tab: string) => {
    setNavState({ history: [tab], index: 0 });
  };

  const canGoBack = navState.index > 0;
  const canGoForward = navState.index < navState.history.length - 1;

  const handleGoBack = () => {
    setNavState((prev) =>
      prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev
    );
  };

  const handleGoForward = () => {
    setNavState((prev) =>
      prev.index < prev.history.length - 1 ? { ...prev, index: prev.index + 1 } : prev
    );
  };

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [selectedDsDivisionId, setSelectedDsDivisionId] = useState<string>(() => {
    const session = getActiveUserSession();
    if (session?.role === 'DISTRICT_ADMIN') return 'ALL';
    return session?.dsDivisionId || 'DS_VAHARAI';
  });

  // Persistent Databases
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(() => loadBeneficiaries());
  const [tokens, setTokens] = useState<QueueToken[]>(() => loadTokens());
  const [divisions, setDivisions] = useState<GNDivision[]>(() => loadDivisions());
  const [services, setServices] = useState<ServiceDefinition[]>(() => loadServices());
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => loadAuditLogs());
  const [assistanceRecords, setAssistanceRecords] = useState<AssistanceRecord[]>(() => loadAssistanceRecords());
  const [pregnantMothers, setPregnantMothers] = useState<PregnantMotherRecord[]>(() => loadPregnantMothers());
  const [landRecords, setLandRecords] = useState<LandRecord[]>(() => loadLandRecords());
  const [households, setHouseholds] = useState<HouseholdData[]>(() => loadHouseholds());
  const [povertyWeights, setPovertyWeights] = useState<PovertyScoringWeights>(() => loadPovertyWeights());
  const [petitions, setPetitions] = useState<PublicPetition[]>(() => loadPetitions());

  // Cloud & Drive Sync Status State
  const [driveSyncStatus, setDriveSyncStatus] = useState<DriveSyncStatus>(() => getDriveSyncStatus());
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(() => isGoogleDriveAuthenticated());
  const [driveUser, setDriveUser] = useState(() => getGoogleDriveUser());
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string>('');

  // Quick Barcode Scanner Modal
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // Office Layout Blueprint & Storage Transparency Modals
  const [showStorageModal, setShowStorageModal] = useState<boolean>(false);
  const [showOfficeLayoutModal, setShowOfficeLayoutModal] = useState<boolean>(false);

  // Google Maps Platform Case A Quota Exceeded State
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);
  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Report live GPS coordinates when app is installed as PWA, in Mobile Field Mode, or used by Grama Niladhari
  const gpsReporter = useFieldLocationReporter(
    currentUser,
    Boolean(mobileFieldMode && currentUser?.role === 'GRAMANIILATHARI')
  );

  // Restore active user session if exists
  useEffect(() => {
    const session = getActiveUserSession();
    if (session) {
      const found = users.find((u) => u.id === session.id) || session;
      if (found) {
        setCurrentUser(found);
        setSelectedDsDivisionId(found.role === 'DISTRICT_ADMIN' ? 'ALL' : (found.dsDivisionId || 'DS_VAHARAI'));
        if (found.role === 'GRAMANIILATHARI') {
          if (found.division && found.division.trim().toUpperCase() !== 'ALL') {
            pruneLocalStorageToDivision(found.division, found.dsDivisionId);
            handleDatabaseReload();
          }
        } else {
          setMobileModeEnabled(false);
        }
        if (found.role === 'DISTRICT_ADMIN') {
          resetNavTab('district');
        } else if (found.role === 'LAND_OFFICER') {
          resetNavTab('land');
        } else if (found.role === 'Reception Registrar') {
          resetNavTab('reception');
        } else if (found.role === 'NORMAL') {
          resetNavTab('live-display');
        } else if (found.role === 'ELDERLY_OFFICER') {
          resetNavTab('elderly');
        } else if (found.role === 'MATERNITY_OFFICER' || found.role === 'ECDO') {
          resetNavTab('maternity');
        } else if (found.role === 'DISABILITY_OFFICER') {
          resetNavTab('disability');
        }
      }
    }
  }, []);

  // Listen for Google Drive sync status & auth state updates (including 401 expiry / popup login)
  useEffect(() => {
    const syncAuthUi = () => {
      setIsDriveConnected(isGoogleDriveAuthenticated());
      setDriveUser(getGoogleDriveUser());
    };
    const unsubscribe = onDriveSyncStatusChange((st) => {
      setDriveSyncStatus(st);
      syncAuthUi();
    });
    window.addEventListener('vaharai_drive_auth_changed', syncAuthUi);
    return () => {
      unsubscribe();
      window.removeEventListener('vaharai_drive_auth_changed', syncAuthUi);
    };
  }, []);

  // Real-Time Cross-Tab / Cross-Window Synchronization on the same machine
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('vaharai_ds_sync_channel');
      channel.onmessage = () => {
        handleDatabaseReload();
      };
    }

    const handleLocalUpdate = () => {
      handleDatabaseReload();
    };
    window.addEventListener('vaharai_db_updated', handleLocalUpdate);

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('vaharai_ds_')) {
        handleDatabaseReload();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('vaharai_db_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Central Google Drive & Server Synchronization across multiple office computers & browsers
  useEffect(() => {
    let isMounted = true;
    let lastSyncedMutationAt = getLastLocalMutationAt();
    let lastCentralSyncStamp = '';

    const mergeByKey = <T extends Record<string, any>>(local: T[], remote: T[], keyFn: (x: T) => string, skipFn?: (x: T) => boolean): T[] => {
      const map = new Map<string, T>();
      local.forEach((item) => {
        if (skipFn && skipFn(item)) return;
        const k = keyFn(item);
        if (k) map.set(k, item);
      });
      remote.forEach((item) => {
        if (skipFn && skipFn(item)) return;
        const k = keyFn(item);
        if (!k) return;
        const existing = map.get(k);
        if (!existing) {
          map.set(k, item);
          return;
        }
        const remoteTime = item.updatedAt ? Date.parse(item.updatedAt) : 0;
        const localTime = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
        if (remoteTime > localTime) {
          map.set(k, item);
        }
      });
      return Array.from(map.values());
    };

    let lastPulledRemoteStamp = '';

    const hydrateAllFromRemote = (remote: any) => {
      if (!remote || !isMounted) return;
      const scope = getActiveDivisionScope();
      const effectiveRemote = scope
        ? filterSnapshotByDivision(remote, scope.division, scope.dsDivisionId)
        : remote;

      const incomingStamp = String(effectiveRemote.lastServerSync || effectiveRemote.exportedAt || '');
      if (incomingStamp && incomingStamp === lastPulledRemoteStamp) {
        return;
      }
      if (incomingStamp) lastPulledRemoteStamp = incomingStamp;
      if (effectiveRemote.driveConfig && typeof effectiveRemote.driveConfig === 'object') {
        applySharedDriveConfigLocally(effectiveRemote.driveConfig);
      }
      if (!scope && Array.isArray(effectiveRemote.dsDivisions) && effectiveRemote.dsDivisions.length > 0) {
        try {
          localStorage.setItem('vaharai_ds_secretariats_v1', JSON.stringify(effectiveRemote.dsDivisions));
        } catch { /* ignore */ }
      }
      if (typeof effectiveRemote.districtLogo === 'string' && effectiveRemote.districtLogo.trim()) {
        try {
          localStorage.setItem('vaharai_ds_district_logo_v1', effectiveRemote.districtLogo.trim());
        } catch { /* ignore */ }
      }
      if (Array.isArray(effectiveRemote.divisions) && effectiveRemote.divisions.length > 0) {
        const mergedDivs = scope
          ? effectiveRemote.divisions
          : mergeByKey(loadDivisions(), effectiveRemote.divisions, (d) => (d.code || '').trim().toUpperCase());
        saveDivisions(mergedDivs, false);
        setDivisions(mergedDivs);
      }
      if (!scope && Array.isArray(effectiveRemote.users) && effectiveRemote.users.length > 0) {
        const mergedUsers = mergeByKey(loadUsers(), effectiveRemote.users, (u) => u.id);
        saveUsers(mergedUsers, false);
        setUsers(mergedUsers);
      }

      // If remote explicitly cleared all beneficiaries/records more recently than this browser, mirror empty state
      const remoteClearTime = effectiveRemote.clearedAt ? Date.parse(effectiveRemote.clearedAt) : 0;
      const localClearTime = getLastClearAt() ? Date.parse(getLastClearAt()) : 0;
      if (
        !scope &&
        effectiveRemote.explicitlyCleared === true &&
        Array.isArray(effectiveRemote.beneficiaries) &&
        effectiveRemote.beneficiaries.length === 0 &&
        remoteClearTime > localClearTime
      ) {
        setLastClearAt(effectiveRemote.clearedAt);
        saveBeneficiaries([], false, false);
        setBeneficiaries([]);
        saveHouseholds([], false);
        setHouseholds([]);
        saveLandRecords([], false);
        setLandRecords([]);
        savePregnantMothers([], false);
        setPregnantMothers([]);
        saveAssistanceRecords([], false);
        setAssistanceRecords([]);
        saveTokens([], false);
        setTokens([]);
        savePetitions([], false);
        setPetitions([]);
        return;
      }

      // Guard against stale remote Drive/server snapshots exported before the local storage wipe
      const remoteDataStamp = Date.parse(String(effectiveRemote.lastServerSync || effectiveRemote.exportedAt || '')) || 0;
      if (!scope && localClearTime > 0 && !effectiveRemote.explicitlyCleared && (remoteDataStamp === 0 || remoteDataStamp <= localClearTime)) {
        return;
      }

      if (Array.isArray(effectiveRemote.beneficiaries)) {
        const baseLocal = scope
          ? loadBeneficiaries().filter((b) => (b.divisionCode || '').trim().toUpperCase() === scope.division)
          : loadBeneficiaries();
        const mergedBens = effectiveRemote.beneficiaries.length > 0
          ? mergeByKey(
              baseLocal,
              effectiveRemote.beneficiaries,
              (b) => b.id || b.nic,
              (b) => isRecordDeleted(b.id, b.nic)
            )
          : baseLocal;
        saveBeneficiaries(mergedBens, false, false);
        setBeneficiaries(mergedBens);
      }
      if (Array.isArray(effectiveRemote.households)) {
        const baseLocal = scope
          ? loadHouseholds().filter((h) => (h.divisionCode || '').trim().toUpperCase() === scope.division)
          : loadHouseholds();
        const mergedHouseholds = effectiveRemote.households.length > 0
          ? mergeByKey(baseLocal, effectiveRemote.households, (h) => h.familyCode || h.id)
          : baseLocal;
        saveHouseholds(mergedHouseholds, false);
        setHouseholds(mergedHouseholds);
      }
      if (Array.isArray(effectiveRemote.landRecords)) {
        const baseLocal = scope
          ? loadLandRecords().filter((l) => (l.divisionCode || '').trim().toUpperCase() === scope.division)
          : loadLandRecords();
        const mergedLand = effectiveRemote.landRecords.length > 0
          ? mergeByKey(baseLocal, effectiveRemote.landRecords, (l) => l.id || l.permitNo)
          : baseLocal;
        saveLandRecords(mergedLand, false);
        setLandRecords(mergedLand);
      }
      if (Array.isArray(effectiveRemote.pregnantMothers)) {
        const baseLocal = scope
          ? loadPregnantMothers().filter((m) => (m.divisionCode || '').trim().toUpperCase() === scope.division)
          : loadPregnantMothers();
        const mergedMat = effectiveRemote.pregnantMothers.length > 0
          ? mergeByKey(baseLocal, effectiveRemote.pregnantMothers, (m) => m.id || m.nic, (m) => isRecordDeleted(m.id, m.nic))
          : baseLocal;
        savePregnantMothers(mergedMat, false);
        setPregnantMothers(mergedMat);
      }
      if (Array.isArray(effectiveRemote.assistance)) {
        const baseLocal = scope
          ? loadAssistanceRecords().filter((a) => (a.divisionCode || '').trim().toUpperCase() === scope.division)
          : loadAssistanceRecords();
        const mergedAid = effectiveRemote.assistance.length > 0
          ? mergeByKey(baseLocal, effectiveRemote.assistance, (a) => a.id)
          : baseLocal;
        saveAssistanceRecords(mergedAid, false);
        setAssistanceRecords(mergedAid);
      }
      if (Array.isArray(effectiveRemote.tokens)) {
        const baseLocal = scope
          ? loadTokens().filter((t) => (t.divisionCode || '').trim().toUpperCase() === scope.division)
          : loadTokens();
        const mergedTokens = effectiveRemote.tokens.length > 0
          ? mergeByKey(baseLocal, effectiveRemote.tokens, (t) => t.id)
          : baseLocal;
        saveTokens(mergedTokens, false);
        setTokens(mergedTokens);
      }
      if (Array.isArray(effectiveRemote.petitions)) {
        const baseLocal = scope
          ? loadPetitions().filter((p) => (p.divisionCode || '').trim().toUpperCase() === scope.division)
          : loadPetitions();
        const mergedPetitions = effectiveRemote.petitions.length > 0
          ? mergeByKey(baseLocal, effectiveRemote.petitions, (p) => p.id)
          : baseLocal;
        savePetitions(mergedPetitions, false);
        setPetitions(mergedPetitions);
      }
    };

    // Boot: Sync shared Drive config from central server, then pull shared Google Drive storage (skipped for GN-scoped users so other divisions never download)
    const pullFromDesignatedDrive = async () => {
      try {
        if (getActiveDivisionScope()) return;
        await fetchSharedDriveConfigFromServer();
        const driveData = await fetchFromDesignatedDriveFile();
        if (driveData && isMounted) {
          hydrateAllFromRemote(driveData);
        }
      } catch (e) {
        console.warn('[Google Drive] Boot fetch warning:', e);
      }
    };

    const runCentralSyncCycle = async (forcePull: boolean = false) => {
      if (!isMounted) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      try {
        const rawQueue = localStorage.getItem('vaharai_mobile_offline_sync_queue_v1');
        if (rawQueue && JSON.parse(rawQueue).length > 0) {
          // Wait for MobileFamilyFieldApp safe-merge upload instead of blind overwrite
          return;
        }
      } catch {
        // ignore
      }

      const activeScope = getActiveDivisionScope();
      const currentMutationAt = getLastLocalMutationAt();
      const hasLocalChanges = currentMutationAt > lastSyncedMutationAt;

      if (forcePull && !activeScope) {
        await fetchSharedDriveConfigFromServer();
      }

      // 1. Push any local mutations to central server immediately (server merges scoped division if GN user)
      if (hasLocalChanges && isServerApiAvailable()) {
        const pushed = await pushToCentralDatabase(createDatabaseSnapshot(activeScope));
        if (pushed) {
          lastSyncedMutationAt = currentMutationAt;
        }
      }

      // 2. Google Drive shared sync check (skipped for GN-scoped users so other divisions never download or overwrite)
      const canWriteDrive = !activeScope && (isGoogleDriveAuthenticated() || !!getAppsScriptRelayUrl());
      if (canWriteDrive) {
        try {
          if (hasLocalChanges && isDriveAutoSyncEnabled() && !isDriveSyncBusy()) {
            await saveToDesignatedDriveFile(createDatabaseSnapshot(null));
            lastSyncedMutationAt = currentMutationAt;
          } else if (!hasLocalChanges && !isDriveSyncBusy()) {
            const driveData = await fetchFromDesignatedDriveFile();
            if (driveData && isMounted) {
              hydrateAllFromRemote(driveData);
            }
          }
        } catch {
          // silent offline fallback
        }
      } else if (!activeScope && forcePull && !isDriveSyncBusy()) {
        try {
          const driveData = await fetchFromDesignatedDriveFile();
          if (driveData && isMounted) {
            hydrateAllFromRemote(driveData);
          }
        } catch {
          // silent fallback
        }
      }

      // 3. Central Server pull for all collections (filtered by ?division=... when GN user is active)
      if (isServerApiAvailable() && (!hasLocalChanges || forcePull)) {
        try {
          const central = await fetchCentralDatabase(activeScope);
          if (central && isMounted) {
            const stamp = String(central.lastServerSync || central.exportedAt || '');
            if (forcePull || !stamp || stamp !== lastCentralSyncStamp) {
              hydrateAllFromRemote(central);
              if (stamp) lastCentralSyncStamp = stamp;
            }
          }
        } catch {
          // offline fallback
        }
      }
    };

    const syncInit = async () => {
      // 1. Restore any large datasets (>5MB) saved in IndexedDB before syncing with server
      const restoredFromIdb = await hydrateStorageFromIndexedDb();
      if (restoredFromIdb && isMounted) {
        handleDatabaseReload();
      }

      const activeScope = getActiveDivisionScope();
      if (activeScope) {
        pruneLocalStorageToDivision(activeScope.division, activeScope.dsDivisionId);
        handleDatabaseReload();
      } else {
        await pullFromDesignatedDrive();
      }

      // 2. Pull central database & push merged snapshot if local IndexedDB had extra records
      try {
        if (isServerApiAvailable()) {
          const localBeforeCount = loadBeneficiaries().length + loadHouseholds().length;
          const central = await fetchCentralDatabase(activeScope);
          if (central && isMounted) {
            const centralCount = (central.beneficiaries?.length || 0) + (central.households?.length || 0);
            hydrateAllFromRemote(central);
            if (central.lastServerSync) lastCentralSyncStamp = String(central.lastServerSync);
            if (localBeforeCount > centralCount) {
              await pushToCentralDatabase(createDatabaseSnapshot(activeScope));
            }
          }
        }
      } catch (err) {
        console.warn('Initial central sync failed:', err);
      }
      lastSyncedMutationAt = getLastLocalMutationAt();
    };

    syncInit();

    const syncInterval = setInterval(() => {
      void runCentralSyncCycle(false);
    }, 25000);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        if (!getActiveDivisionScope()) {
          void flushAutoDriveSync();
        }
        return;
      }
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void runCentralSyncCycle(true);
      }
    };
    const handlePageHide = () => {
      if (!getActiveDivisionScope()) {
        void flushAutoDriveSync();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveUserSession(user);
    const initialDsId = user.role === 'DISTRICT_ADMIN' ? 'ALL' : (user.dsDivisionId || 'DS_VAHARAI');
    setSelectedDsDivisionId(initialDsId);

    if (user.role === 'GRAMANIILATHARI') {
      const gnDiv = (user.division || '').trim().toUpperCase();
      if (gnDiv && gnDiv !== 'ALL') {
        pruneLocalStorageToDivision(gnDiv, user.dsDivisionId || 'DS_VAHARAI');
        handleDatabaseReload();
        const scope = { division: gnDiv, dsDivisionId: user.dsDivisionId || 'DS_VAHARAI' };
        void fetchCentralDatabase(scope).then((central) => {
          if (central) {
            restoreDatabaseFromSnapshot(filterSnapshotByDivision(central, scope.division, scope.dsDivisionId));
            pruneLocalStorageToDivision(scope.division, scope.dsDivisionId);
            handleDatabaseReload();
          }
        });
      }
      if (detectInstalledPwa()) {
        setMobileModeEnabled(true);
      }
    } else {
      setMobileModeEnabled(false);
    }

    if (user.role === 'DISTRICT_ADMIN') {
      resetNavTab('district');
    } else if (user.role === 'LAND_OFFICER') {
      resetNavTab('land');
    } else if (user.role === 'Reception Registrar') {
      resetNavTab('reception');
    } else if (user.role === 'NORMAL') {
      resetNavTab('live-display');
    } else if (user.role === 'ELDERLY_OFFICER') {
      resetNavTab('elderly');
    } else if (user.role === 'MATERNITY_OFFICER' || user.role === 'ECDO') {
      resetNavTab('maternity');
    } else if (user.role === 'DISABILITY_OFFICER') {
      resetNavTab('beneficiaries');
    } else {
      resetNavTab('dashboard');
    }
    logAuditAction(user.id, user.name, 'USER_LOGIN', `Logged in with role: ${user.role}`);
    setAuditLogs(loadAuditLogs());
  };

  const handleLogout = () => {
    if (currentUser) {
      logAuditAction(currentUser.id, currentUser.name, 'USER_LOGOUT', 'Logged out');
    }
    setCurrentUser(null);
    setActiveUserSession(null);
    setAuditLogs(loadAuditLogs());
  };

  const handleAuditLog = (action: string, details: string) => {
    if (currentUser) {
      logAuditAction(currentUser.id, currentUser.name, action, details);
      setAuditLogs(loadAuditLogs());
    }
  };

  // Multi-Tenant Isolation Context
  const isDistrictAdmin = currentUser?.role === 'DISTRICT_ADMIN';
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const isAdmin = currentUser?.role === 'ADMIN 1' || currentUser?.role === 'ADMIN 2' || isSuperAdmin || isDistrictAdmin;

  // Active divisional tenant identifier:
  // For DISTRICT_ADMIN: if selectedDsDivisionId === 'ALL', tenant scope is whole district (no isolation).
  // If selectedDsDivisionId !== 'ALL', tenant scope is the selected secretariat.
  // For other users: strictly isolated to their own currentUser.dsDivisionId (default 'DS_VAHARAI').
  const activeTenantDsId = isDistrictAdmin
    ? (selectedDsDivisionId !== 'ALL' ? selectedDsDivisionId : null)
    : (currentUser?.dsDivisionId || 'DS_VAHARAI');

  const handleUpdateUsers = (newUsers: User[]) => {
    if (isDistrictAdmin) {
      setUsers(newUsers);
      saveUsers(newUsers);
    } else {
      const activeDs = currentUser?.dsDivisionId || 'DS_VAHARAI';
      const otherUsers = users.filter((u) => (u.dsDivisionId || 'DS_VAHARAI') !== activeDs);
      const stampedUsers = newUsers.map((u) => ({
        ...u,
        dsDivisionId: u.dsDivisionId || activeDs,
        createdBySuperAdminId: u.createdBySuperAdminId || currentUser?.id,
      }));
      const merged = [...otherUsers, ...stampedUsers];
      setUsers(merged);
      saveUsers(merged);
    }
    if (currentUser) {
      const updatedSelf = newUsers.find((u) => u.id === currentUser.id);
      if (updatedSelf) {
        setCurrentUser(updatedSelf);
        setActiveUserSession(updatedSelf);
      }
    }
  };

  const handleUpdateDivisions = (newDivs: GNDivision[]) => {
    if (!activeTenantDsId) {
      setDivisions(newDivs);
      saveDivisions(newDivs);
    } else {
      const stamped = newDivs.map((d) => ({
        ...d,
        dsDivisionId: d.dsDivisionId || activeTenantDsId,
      }));
      const others = divisions.filter((d) => (d.dsDivisionId || 'DS_VAHARAI') !== activeTenantDsId);
      const merged = [...others, ...stamped];
      setDivisions(merged);
      saveDivisions(merged);
    }
  };

  const handleUpdateBeneficiaries = (newItems: Beneficiary[]) => {
    if (isDistrictAdmin || !activeTenantDsId) {
      setBeneficiaries(newItems);
      saveBeneficiaries(newItems);
    } else {
      const stamped = newItems.map((b) => ({
        ...b,
        dsDivisionId: b.dsDivisionId || activeTenantDsId,
      }));
      const others = beneficiaries.filter((b) => (b.dsDivisionId || 'DS_VAHARAI') !== activeTenantDsId);
      const merged = [...others, ...stamped];
      setBeneficiaries(merged);
      saveBeneficiaries(merged);
    }
  };

  const handleUpdateTokens = (newTokens: QueueToken[]) => {
    if (isDistrictAdmin || !activeTenantDsId) {
      setTokens(newTokens);
      saveTokens(newTokens);
    } else {
      const stamped = newTokens.map((t) => ({
        ...t,
        dsDivisionId: t.dsDivisionId || activeTenantDsId,
      }));
      const others = tokens.filter((t) => (t.dsDivisionId || 'DS_VAHARAI') !== activeTenantDsId);
      const merged = [...others, ...stamped];
      setTokens(merged);
      saveTokens(merged);
    }
  };

  const handleUpdateAssistanceRecords = (newRecords: AssistanceRecord[]) => {
    if (isDistrictAdmin || !activeTenantDsId) {
      setAssistanceRecords(newRecords);
      saveAssistanceRecords(newRecords);
    } else {
      const stamped = newRecords.map((a) => ({
        ...a,
        dsDivisionId: a.dsDivisionId || activeTenantDsId,
      }));
      const others = assistanceRecords.filter((a) => (a.dsDivisionId || 'DS_VAHARAI') !== activeTenantDsId);
      const merged = [...others, ...stamped];
      setAssistanceRecords(merged);
      saveAssistanceRecords(merged);
    }
  };

  const handleUpdateServices = (newServices: ServiceDefinition[]) => {
    setServices(newServices);
    saveServices(newServices);
  };

  const handleUpdatePregnantMothers = (newRecords: PregnantMotherRecord[]) => {
    if (isDistrictAdmin || !activeTenantDsId) {
      setPregnantMothers(newRecords);
      savePregnantMothers(newRecords);
    } else {
      const stamped = newRecords.map((m) => ({
        ...m,
        dsDivisionId: m.dsDivisionId || activeTenantDsId,
      }));
      const others = pregnantMothers.filter((m) => (m.dsDivisionId || 'DS_VAHARAI') !== activeTenantDsId);
      const merged = [...others, ...stamped];
      setPregnantMothers(merged);
      savePregnantMothers(merged);
    }
  };

  const handleUpdateLandRecords = (newLand: LandRecord[]) => {
    if (isDistrictAdmin || !activeTenantDsId) {
      setLandRecords(newLand);
      saveLandRecords(newLand);
    } else {
      const stamped = newLand.map((l) => ({
        ...l,
        dsDivisionId: l.dsDivisionId || activeTenantDsId,
      }));
      const others = landRecords.filter((l) => (l.dsDivisionId || 'DS_VAHARAI') !== activeTenantDsId);
      const merged = [...others, ...stamped];
      setLandRecords(merged);
      saveLandRecords(merged);
    }
  };

  const handleUpdateHouseholds = (newHouseholds: HouseholdData[]) => {
    if (isDistrictAdmin || !activeTenantDsId) {
      setHouseholds(newHouseholds);
      saveHouseholds(newHouseholds);
    } else {
      const stamped = newHouseholds.map((h) => ({
        ...h,
        dsDivisionId: h.dsDivisionId || activeTenantDsId,
      }));
      const others = households.filter((h) => (h.dsDivisionId || 'DS_VAHARAI') !== activeTenantDsId);
      const merged = [...others, ...stamped];
      setHouseholds(merged);
      saveHouseholds(merged);
    }
  };

  const handleUpdatePovertyWeights = (weights: PovertyScoringWeights) => {
    setPovertyWeights(weights);
    savePovertyWeights(weights);
  };

  const handleUpdatePetitions = (newPetitions: PublicPetition[]) => {
    if (isDistrictAdmin || !activeTenantDsId) {
      setPetitions(newPetitions);
      savePetitions(newPetitions);
    } else {
      const stamped = newPetitions.map((p) => ({
        ...p,
        dsDivisionId: p.dsDivisionId || activeTenantDsId,
      }));
      const others = petitions.filter((p) => (p.dsDivisionId || 'DS_VAHARAI') !== activeTenantDsId);
      const merged = [...others, ...stamped];
      setPetitions(merged);
      savePetitions(merged);
    }
  };

  // Strict GN Division Lock for Grama Niladhari users (never show/download other divisions)
  const gnLockedDiv =
    currentUser?.role === 'GRAMANIILATHARI' &&
    currentUser.division &&
    currentUser.division.trim().toUpperCase() !== 'ALL'
      ? currentUser.division.trim().toUpperCase()
      : null;
  const matchesDivisionScope = (itemDivCode?: string) =>
    !gnLockedDiv || (itemDivCode || '').trim().toUpperCase() === gnLockedDiv;

  // Scoped datasets filtered by tenant secretariat AND GN division lock
  const scopedDivisions = divisions.filter(
    (d) =>
      (!activeTenantDsId || (d.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId) &&
      (!gnLockedDiv || (d.code || '').trim().toUpperCase() === gnLockedDiv)
  );

  const scopedBeneficiaries = beneficiaries.filter(
    (b) =>
      (!activeTenantDsId || (b.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId) &&
      matchesDivisionScope(b.divisionCode)
  );

  const scopedTokens = tokens.filter(
    (t) =>
      (!activeTenantDsId || (t.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId) &&
      matchesDivisionScope(t.divisionCode)
  );

  const scopedAssistanceRecords = assistanceRecords.filter(
    (a) =>
      (!activeTenantDsId || (a.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId) &&
      matchesDivisionScope(a.divisionCode)
  );

  const scopedPregnantMothers = pregnantMothers.filter(
    (m) =>
      (!activeTenantDsId || (m.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId) &&
      matchesDivisionScope(m.divisionCode)
  );

  const scopedLandRecords = landRecords.filter(
    (l) =>
      (!activeTenantDsId || (l.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId) &&
      matchesDivisionScope(l.divisionCode)
  );

  const scopedHouseholds = households.filter(
    (h) =>
      (!activeTenantDsId || (h.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId) &&
      matchesDivisionScope(h.divisionCode)
  );

  const scopedPetitions = petitions.filter(
    (p) =>
      (!activeTenantDsId || (p.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId) &&
      matchesDivisionScope(p.divisionCode)
  );

  const scopedUsers = isDistrictAdmin
    ? (selectedDsDivisionId !== 'ALL'
        ? users.filter((u) => u.dsDivisionId === selectedDsDivisionId || u.role === 'DISTRICT_ADMIN')
        : users)
    : users.filter((u) => (u.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId);

  const handleDatabaseReload = () => {
    setUsers(loadUsers());
    setBeneficiaries(loadBeneficiaries());
    setTokens(loadTokens());
    setDivisions(loadDivisions());
    setServices(loadServices());
    setAuditLogs(loadAuditLogs());
    setAssistanceRecords(loadAssistanceRecords());
    setPregnantMothers(loadPregnantMothers());
    setLandRecords(loadLandRecords());
    setHouseholds(loadHouseholds());
    setPovertyWeights(loadPovertyWeights());
    setPetitions(loadPetitions());
  };

  const handleQuickSyncNow = async () => {
    setIsManualSyncing(true);
    setSyncToastMessage('');
    try {
      const scope = getActiveDivisionScope();
      if (scope) {
        const central = await fetchCentralDatabase(scope);
        if (central) {
          restoreDatabaseFromSnapshot(filterSnapshotByDivision(central, scope.division, scope.dsDivisionId));
          pruneLocalStorageToDivision(scope.division, scope.dsDivisionId);
          handleDatabaseReload();
          setSyncToastMessage(
            lang === 'ta'
              ? `GN பிரிவு ${scope.division} தரவுகள் மட்டும் சர்வரிலிருந்து புதுப்பிக்கப்பட்டன!`
              : `Refreshed GN ${scope.division} data from server!`
          );
        } else {
          setSyncToastMessage(lang === 'ta' ? 'சர்வர் இணைப்பு கிடைக்கவில்லை' : 'Could not reach server');
        }
        return;
      }

      await fetchSharedDriveConfigFromServer();
      const driveData = await fetchFromDesignatedDriveFile();
      if (driveData && Array.isArray(driveData.beneficiaries)) {
        restoreDatabaseFromSnapshot(driveData);
        handleDatabaseReload();
        setSyncToastMessage(lang === 'ta' ? 'பகிரப்பட்ட டிரைவ் கோப்பிலிருந்து தரவுகள் பெறப்பட்டன!' : 'Pulled latest from shared Drive file!');
      } else if (isGoogleDriveAuthenticated() || !!getAppsScriptRelayUrl()) {
        const snapshot = createDatabaseSnapshot();
        await saveToDesignatedDriveFile(snapshot);
        setSyncToastMessage(lang === 'ta' ? 'டிரைவ் கோப்பில் சேமிக்கப்பட்டது!' : 'Saved to Drive file!');
      } else if (isServerApiAvailable()) {
        const central = await fetchCentralDatabase();
        if (central) {
          restoreDatabaseFromSnapshot(central);
          handleDatabaseReload();
          setSyncToastMessage(lang === 'ta' ? 'சர்வர் தரவுகள் புதுப்பிக்கப்பட்டன!' : 'Server data refreshed!');
        }
      } else {
        setSyncToastMessage(lang === 'ta' ? 'டிரைவ் கோப்பை பகிர அல்லது இணைக்க Drive பக்கத்தை திறக்கவும்' : 'Open Google Drive settings to connect or share');
      }
    } catch (err: any) {
      setSyncToastMessage(err.message || 'Sync failed');
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setSyncToastMessage(''), 4000);
    }
  };

  const handleSaveToDriveNow = async () => {
    setIsManualSyncing(true);
    setSyncToastMessage(lang === 'ta' ? 'டிரைவில் சேமிக்கப்படுகிறது...' : 'Saving to Google Drive & Central Server...');
    try {
      const scope = getActiveDivisionScope();
      const snapshot = createDatabaseSnapshot(scope);
      await pushToCentralDatabase(snapshot);

      if (scope) {
        setSyncToastMessage(
          lang === 'ta'
            ? `✅ GN பிரிவு ${scope.division} தரவுகள் பிரதான சர்வரில் பாதுகாப்பாக இணைக்கப்பட்டன!`
            : `✅ GN ${scope.division} records synced safely to Central Server!`
        );
        return;
      }

      if (isGoogleDriveAuthenticated() || !!getAppsScriptRelayUrl()) {
        const res = await saveToDesignatedDriveFile(snapshot);
        setDriveSyncStatus(getDriveSyncStatus());
        setSyncToastMessage(
          lang === 'ta'
            ? `✅ கூகிள் டிரைவில் வெற்றிகரமாக சேமிக்கப்பட்டது! (${res.fileName})`
            : `✅ Successfully saved to Google Drive! (${res.fileName})`
        );
      } else {
        setSyncToastMessage(
          lang === 'ta'
            ? 'ℹ️ மத்திய சர்வரில் சேமிக்கப்பட்டது. Google Drive-இல் நேரடியாக எழுத Drive பக்கத்தில் கணக்கை இணைக்கவும்.'
            : 'ℹ️ Saved to Central Server. Connect Google Drive in Drive settings to write to Drive directly.'
        );
      }
    } catch (err: any) {
      setSyncToastMessage(err.message || 'Drive save failed');
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setSyncToastMessage(''), 5000);
    }
  };

  const handleConnectDriveDirect = async () => {
    try {
      setIsManualSyncing(true);
      await signInWithGoogleDrive();
      setIsDriveConnected(true);
      setDriveUser(getGoogleDriveUser());
      const driveData = await fetchFromDesignatedDriveFile();
      if (driveData && driveData.beneficiaries) {
        restoreDatabaseFromSnapshot(driveData);
        handleDatabaseReload();
      } else {
        await saveToDesignatedDriveFile(createDatabaseSnapshot());
      }
      setSyncToastMessage(lang === 'ta' ? 'கூகிள் டிரைவ் வெற்றிகரமாக இணைக்கப்பட்டது!' : 'Google Drive connected successfully!');
    } catch (e: any) {
      console.warn('Drive direct connect:', e);
      setSyncToastMessage(e.message || 'Drive connect failed');
      // If admin, open Drive settings tab to show alternatives
      if (currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN 1' || currentUser?.role === 'ADMIN 2') {
        navigateToTab('drive');
      }
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setSyncToastMessage(''), 5000);
    }
  };

  const handleDownloadQuickBackup = () => {
    const snapshot = createDatabaseSnapshot();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vaharai_ds_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setSyncToastMessage(lang === 'ta' ? 'JSON காப்புப்பிரதி பதிவிறக்கப்பட்டது!' : 'JSON backup downloaded!');
    setTimeout(() => setSyncToastMessage(''), 4000);
  };

  const handleUploadQuickBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const snapshot = JSON.parse(text);
        restoreDatabaseFromSnapshot(snapshot);
        handleDatabaseReload();
        setSyncToastMessage(lang === 'ta' ? 'தரவுகள் வெற்றிகரமாக மீட்டமைக்கப்பட்டன!' : 'Database successfully restored!');
      } catch (err: any) {
        setSyncToastMessage(lang === 'ta' ? 'செல்லுபடியற்ற JSON கோப்பு!' : 'Invalid JSON file!');
      } finally {
        setTimeout(() => setSyncToastMessage(''), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // If user signed out, show official login screen
  if (!currentUser) {
    return (
      <LoginView
        users={users}
        lang={lang}
        setLang={setLang}
        onLoginSuccess={handleLoginSuccess}
        mobileFieldPreferred={mobileFieldMode}
        onToggleMobileFieldPreferred={setMobileModeEnabled}
      />
    );
  }

  // Safety checks for Role-based Tab Access
  const isReception = currentUser.role === 'Reception Registrar';
  const isNormal = currentUser.role === 'NORMAL'; // Dedicated Live Counter TV user
  const isGramaNiladhari = currentUser.role === 'GRAMANIILATHARI';
  const isElderlyOfficer = currentUser.role === 'ELDERLY_OFFICER';
  const isMaternityOfficer = currentUser.role === 'MATERNITY_OFFICER' || currentUser.role === 'ECDO';
  const isDisabilityOfficer = currentUser.role === 'DISABILITY_OFFICER';
  const isLandOfficer = currentUser.role === 'LAND_OFFICER';

  const canAccessElderly = isAdmin || isElderlyOfficer || isGramaNiladhari;
  const canAccessMaternity = isAdmin || isMaternityOfficer || isGramaNiladhari;
  const canAccessDisability = isAdmin || isDisabilityOfficer || isGramaNiladhari || currentUser.role === 'DATAENRY OFFCER';
  const canAccessLand = isAdmin || isLandOfficer;
  const canAccessFamilyCenter = !isReception && !isNormal && !isLandOfficer;
  const canAccessStaff = isSuperAdmin || isDistrictAdmin;
  const canAccessGnDivisions = isSuperAdmin || isDistrictAdmin;
  const canAccessDistrict = isDistrictAdmin;

  let safeTab = currentTab;
  if (isNormal) {
    safeTab = 'live-display';
  } else if (currentTab === 'district' && !canAccessDistrict) {
    safeTab = 'dashboard';
  } else if (currentTab === 'gn-divisions' && !canAccessGnDivisions) {
    safeTab = 'dashboard';
  } else if (isLandOfficer && currentTab !== 'universal-search' && currentTab !== 'petitions') {
    safeTab = 'land';
  } else if (isElderlyOfficer && currentTab !== 'universal-search' && currentTab !== 'petitions' && currentTab !== 'family-center') {
    safeTab = 'elderly';
  } else if (isMaternityOfficer && currentTab !== 'universal-search' && currentTab !== 'petitions' && currentTab !== 'family-center') {
    safeTab = 'maternity';
  } else if (isDisabilityOfficer && currentTab !== 'universal-search' && currentTab !== 'petitions' && currentTab !== 'family-center') {
    safeTab = 'disability';
  } else if (currentTab === 'land' && !canAccessLand) {
    safeTab = 'dashboard';
  } else if (currentTab === 'family-center' && !canAccessFamilyCenter) {
    safeTab = 'dashboard';
  } else if (currentTab === 'staff' && !canAccessStaff) {
    safeTab = 'dashboard';
  } else if (currentTab === 'field-map' && !isSuperAdmin) {
    safeTab = 'dashboard';
  } else if (currentTab === 'transfers-deaths' && !isSuperAdmin) {
    safeTab = 'dashboard';
  } else if (currentTab === 'services' && !isSuperAdmin) {
    safeTab = 'dashboard';
  } else if (currentTab === 'beneficiaries' && isReception) {
    safeTab = 'reception';
  } else if (currentTab === 'assistance' && (isReception || isNormal || isLandOfficer)) {
    safeTab = isLandOfficer ? 'land' : 'dashboard';
  } else if (currentTab === 'drive' && !isAdmin) {
    safeTab = 'dashboard';
  } else if (currentTab === 'ai-report' && !isAdmin) {
    safeTab = 'dashboard';
  } else if (currentTab === 'service-audit' && !isAdmin) {
    safeTab = 'dashboard';
  } else if (currentTab === 'elderly' && !canAccessElderly) {
    safeTab = 'dashboard';
  } else if (currentTab === 'maternity' && !canAccessMaternity) {
    safeTab = 'dashboard';
  } else if (currentTab === 'disability' && !canAccessDisability) {
    safeTab = 'dashboard';
  }

  const gmpQuotaBanner = gmpQuotaExceeded ? (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 hover:text-amber-800"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  ) : null;

  if (mobileFieldMode && isGramaNiladhari) {
    return (
      <>
        {gmpQuotaBanner}
        <MobileFamilyFieldApp
          currentUser={currentUser}
          households={scopedHouseholds}
          beneficiaries={scopedBeneficiaries}
          assistanceRecords={scopedAssistanceRecords}
          divisions={scopedDivisions}
          povertyWeights={povertyWeights}
          lang={lang}
          setLang={setLang}
          onDatabaseReload={handleDatabaseReload}
          onExitMobileMode={() => setMobileModeEnabled(false)}
          onLogout={handleLogout}
          gpsStatus={gpsReporter.status}
          gpsLastCoords={gpsReporter.lastCoords}
          gpsSharingEnabled={gpsReporter.isSharingEnabled}
          onToggleGpsSharing={gpsReporter.setSharingEnabled}
          onRefreshGps={gpsReporter.refreshNow}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {gmpQuotaBanner}
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        currentTab={safeTab}
        setCurrentTab={navigateToTab}
        lang={lang}
        setLang={setLang}
        onLogout={handleLogout}
        onOpenScanner={() => setShowScanner(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isDriveConnected={isDriveConnected}
        driveSyncStatus={driveSyncStatus}
        isSyncing={isManualSyncing}
        onSaveToDriveNow={handleSaveToDriveNow}
        onOpenStorageTransparency={() => setShowStorageModal(true)}
        onOpenOfficeLayout={() => setShowOfficeLayoutModal(true)}
        selectedDsDivisionId={selectedDsDivisionId}
        onSelectDsDivision={(dsId) => setSelectedDsDivisionId(dsId)}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onOpenMobileFieldApp={isGramaNiladhari ? () => setMobileModeEnabled(true) : undefined}
      />

      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg no-print">
          <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
          <span>{lang === 'ta' ? 'ஆஃப்லைன் பயன்முறை — சேமிக்கப்பட்ட தரவுகள்' : 'Offline Mode — Cached data is being used.'}</span>
        </div>
      )}

      {/* Floating Status / Sync Toast */}
      {syncToastMessage && (
        <div className="fixed top-12 right-4 z-50 bg-emerald-950 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-700 flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <span>{syncToastMessage}</span>
        </div>
      )}

      {/* Main Layout: Left Sidebar + Page View */}
      <div className="flex-1 flex overflow-hidden w-full">
        {currentUser && !isNormal && (
          <Sidebar
            currentUser={currentUser}
            currentTab={safeTab}
            setCurrentTab={navigateToTab}
            lang={lang}
            onLogout={handleLogout}
            onOpenScanner={() => setShowScanner(true)}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            isDriveConnected={isDriveConnected}
            driveSyncStatus={driveSyncStatus}
            isSyncing={isManualSyncing}
            onQuickSync={handleQuickSyncNow}
            onSaveToDriveNow={handleSaveToDriveNow}
            selectedDsDivisionId={selectedDsDivisionId}
            transfersDeathsBadgeCount={
              isSuperAdmin
                ? scopedHouseholds.filter(
                    (h) => h.residencyStatus === 'TRANSFERRED_GN' || h.residencyStatus === 'TRANSFERRED_EXTERNAL_DS'
                  ).length +
                  scopedBeneficiaries.filter((b) => b.status === 'TRANSFERRED' || b.status === 'DECEASED').length
                : undefined
            }
          />
        )}

        {/* Main View Area with strict overflow safety */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 no-print overflow-x-hidden max-w-7xl mx-auto w-full">
        {!isNormal && (
          <div className="mb-4 flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-2xs no-print">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGoBack}
                disabled={!canGoBack}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-800 disabled:opacity-40 disabled:hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title={lang === 'ta' ? 'பின் செல்ல (Back)' : 'Go Back'}
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-800" />
                <span>{lang === 'ta' ? 'பின் (Back)' : 'Back'}</span>
              </button>
              <button
                type="button"
                onClick={handleGoForward}
                disabled={!canGoForward}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-800 disabled:opacity-40 disabled:hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title={lang === 'ta' ? 'முன் செல்ல (Forward)' : 'Go Forward'}
              >
                <span>{lang === 'ta' ? 'முன் (Forward)' : 'Forward'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-800" />
              </button>
            </div>
            <div className="text-[11px] font-mono text-slate-500 hidden sm:flex items-center gap-1.5">
              <span>{navState.index + 1} / {navState.history.length}</span>
            </div>
          </div>
        )}
        {safeTab === 'district' && (
          <DistrictMasterAdminView
            currentUser={currentUser}
            users={users}
            divisions={divisions}
            beneficiaries={beneficiaries}
            tokens={tokens}
            petitions={petitions}
            households={households}
            pregnantMothers={pregnantMothers}
            lang={lang}
            onUpdateUsers={handleUpdateUsers}
            onAuditLog={handleAuditLog}
            onSelectDsDivision={(dsId: string) => {
              setSelectedDsDivisionId(dsId);
              navigateToTab('dashboard');
            }}
          />
        )}

        {safeTab === 'gn-divisions' && (
          <GnDivisionsManagementView
            currentUser={currentUser}
            divisions={scopedDivisions}
            users={scopedUsers}
            lang={lang}
            onUpdateDivisions={handleUpdateDivisions}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'dashboard' && (
          <DashboardView
            beneficiaries={scopedBeneficiaries}
            tokens={scopedTokens}
            divisions={scopedDivisions}
            users={scopedUsers}
            auditLogs={isSuperAdmin ? auditLogs : []}
            assistanceRecords={scopedAssistanceRecords}
            pregnantMothers={scopedPregnantMothers}
            landRecords={scopedLandRecords}
            households={scopedHouseholds}
            currentUser={currentUser}
            lang={lang}
            onNavigate={(tab) => navigateToTab(tab)}
            selectedDsDivisionId={selectedDsDivisionId}
          />
        )}

        {safeTab === 'universal-search' && (
          <UniversalCitizenSearchView
            beneficiaries={scopedBeneficiaries}
            tokens={scopedTokens}
            assistanceRecords={scopedAssistanceRecords}
            pregnantMothers={scopedPregnantMothers}
            divisions={scopedDivisions}
            currentUser={currentUser}
            lang={lang}
          />
        )}

        {safeTab === 'elderly' && (
          <ElderlyOfficerManagementView
            beneficiaries={isDistrictAdmin ? beneficiaries : scopedBeneficiaries}
            divisions={isDistrictAdmin ? divisions : scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'maternity' && (
          <PregnantMothersView
            pregnantMothers={isDistrictAdmin ? pregnantMothers : scopedPregnantMothers}
            beneficiaries={isDistrictAdmin ? beneficiaries : scopedBeneficiaries}
            divisions={isDistrictAdmin ? divisions : scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            onUpdatePregnantMothers={handleUpdatePregnantMothers}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'disability' && (
          <DisabilityOfficerManagementView
            beneficiaries={isDistrictAdmin ? beneficiaries : scopedBeneficiaries}
            divisions={isDistrictAdmin ? divisions : scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'petitions' && (
          <PublicPetitionsView
            petitions={isDistrictAdmin ? petitions : scopedPetitions}
            divisions={isDistrictAdmin ? divisions : scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            onUpdatePetitions={handleUpdatePetitions}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'beneficiaries' && (
          <BeneficiariesView
            beneficiaries={scopedBeneficiaries}
            divisions={scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'reception' && (
          <ReceptionTokenView
            tokens={scopedTokens}
            beneficiaries={scopedBeneficiaries}
            divisions={scopedDivisions}
            services={services}
            assistanceRecords={scopedAssistanceRecords}
            pregnantMothers={scopedPregnantMothers}
            landRecords={scopedLandRecords}
            households={scopedHouseholds}
            currentUser={currentUser}
            lang={lang}
            onUpdateTokens={handleUpdateTokens}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onUpdateServices={handleUpdateServices}
            onAuditLog={handleAuditLog}
            onNavigateToLiveDisplay={() => navigateToTab('live-display')}
            onNavigateToServices={() => navigateToTab('services')}
          />
        )}

        {safeTab === 'live-display' && (
          <LiveCounterDisplayView
            tokens={scopedTokens}
            beneficiaries={scopedBeneficiaries}
            divisions={scopedDivisions}
            lang={lang}
            onUpdateTokens={handleUpdateTokens}
            onAuditLog={handleAuditLog}
            isNormalUser={isNormal}
          />
        )}

        {safeTab === 'services' && (
          <ServiceManagementView
            services={services}
            currentUser={currentUser}
            lang={lang}
            onUpdateServices={handleUpdateServices}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'ai-report' && (
          <AiReportView
            beneficiaries={scopedBeneficiaries}
            tokens={scopedTokens}
            divisions={scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'assistance' && (
          <AssistanceDistributionView
            assistanceRecords={scopedAssistanceRecords}
            beneficiaries={scopedBeneficiaries}
            divisions={scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateAssistanceRecords={handleUpdateAssistanceRecords}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'family-center' && (
          <FamilyDataCenterView
            households={scopedHouseholds}
            beneficiaries={scopedBeneficiaries}
            assistanceRecords={scopedAssistanceRecords}
            divisions={scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            povertyWeights={povertyWeights}
            onUpdateHouseholds={handleUpdateHouseholds}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onUpdatePovertyWeights={handleUpdatePovertyWeights}
            onAuditLog={handleAuditLog}
            onOpenMobileFieldApp={isGramaNiladhari ? () => setMobileModeEnabled(true) : undefined}
          />
        )}

        {safeTab === 'land' && (
          <LandManagementView
            landRecords={scopedLandRecords}
            divisions={scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateLandRecords={handleUpdateLandRecords}
            onAuditLog={handleAuditLog}
            onNavigateToCsv={() => navigateToTab('csv')}
          />
        )}

        {safeTab === 'csv' && !isDistrictAdmin && (
          <CsvManagementView
            beneficiaries={scopedBeneficiaries}
            users={scopedUsers}
            divisions={scopedDivisions}
            assistanceRecords={scopedAssistanceRecords}
            pregnantMothers={scopedPregnantMothers}
            landRecords={scopedLandRecords}
            households={scopedHouseholds}
            currentUser={currentUser}
            lang={lang}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onUpdateUsers={handleUpdateUsers}
            onUpdateDivisions={handleUpdateDivisions}
            onUpdateAssistanceRecords={handleUpdateAssistanceRecords}
            onUpdatePregnantMothers={handleUpdatePregnantMothers}
            onUpdateLandRecords={handleUpdateLandRecords}
            onUpdateHouseholds={handleUpdateHouseholds}
            onAuditLog={handleAuditLog}
            onNavigateToDrive={() => navigateToTab('drive')}
          />
        )}

        {safeTab === 'drive' && (
          <DriveBackupView
            currentUser={currentUser}
            lang={lang}
            onDatabaseReload={handleDatabaseReload}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'service-audit' && (
          <ServiceAuditView
            tokens={scopedTokens}
            beneficiaries={scopedBeneficiaries}
            divisions={scopedDivisions}
            users={scopedUsers}
            currentUser={currentUser}
            lang={lang}
            onUpdateTokens={handleUpdateTokens}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'staff' && (
          <StaffManagementView
            users={scopedUsers}
            divisions={scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateUsers={handleUpdateUsers}
            onAuditLog={handleAuditLog}
          />
        )}

        {safeTab === 'field-map' && isSuperAdmin && (
          <FieldOfficersLocationMapView
            currentUser={currentUser}
            divisions={scopedDivisions}
            lang={lang}
            selectedDsDivisionId={selectedDsDivisionId}
          />
        )}

        {safeTab === 'transfers-deaths' && isSuperAdmin && (
          <SuperAdminTransfersDeathsView
            households={scopedHouseholds}
            beneficiaries={scopedBeneficiaries}
            divisions={scopedDivisions}
            currentUser={currentUser}
            lang={lang}
            onUpdateHouseholds={handleUpdateHouseholds}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onAuditLog={handleAuditLog}
          />
        )}
      </main>
      </div>

      {/* Barcode / NIC Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal
          beneficiaries={beneficiaries}
          lang={lang}
          onSelectBeneficiary={() => {
            if (!isReception && !isNormal) {
              navigateToTab('beneficiaries');
            } else if (isReception) {
              navigateToTab('reception');
            } else {
              navigateToTab('live-display');
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Storage Transparency Modal (Requirement 08) */}
      <StorageTransparencyModal
        isOpen={showStorageModal}
        onClose={() => setShowStorageModal(false)}
        lang={lang}
      />

      {/* Office Layout Blueprint Modal (Requirement 01: 33 Counters Map) */}
      <OfficeLayoutModal
        isOpen={showOfficeLayoutModal}
        onClose={() => setShowOfficeLayoutModal(false)}
        lang={lang}
      />

      {/* Official Civic Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 text-center text-xs text-slate-500 no-print w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 {isDistrictAdmin && (!selectedDsDivisionId || selectedDsDivisionId === 'ALL')
              ? (lang === 'ta' ? 'மட்டக்களப்பு மாவட்ட செயலகம் (14 பிரதேச செயலகங்கள்)' : 'Batticaloa District Secretariat (14 DS Divisions)')
              : (() => {
                  const activeDs = getDsDivisionById(isDistrictAdmin ? selectedDsDivisionId : currentUser?.dsDivisionId);
                  return activeDs
                    ? (lang === 'ta' ? `${activeDs.nameTa} பிரதேச செயலகம் · மட்டக்களப்பு மாவட்டம்` : `${activeDs.nameEn} Divisional Secretariat · Batticaloa District`)
                    : (lang === 'ta' ? 'பிரதேச செயலகம் · மட்டக்களப்பு மாவட்டம்' : 'Divisional Secretariat · Batticaloa District');
                })()}
          </span>
          <div className="flex items-center gap-3 text-[10px] sm:text-[11px] font-mono text-slate-400 flex-wrap justify-center">
            <span>Live Display: Normal User Support</span>
            <span>·</span>
            <span>Roles: SuperAdmin, Admin 1, Admin 2</span>
            <span>·</span>
            <span>Cloud: Google Drive</span>
            <span>·</span>
            <span>Print: Thermal 58/80mm & PDF</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
