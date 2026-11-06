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

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<User | null>(() => getActiveUserSession());
  const [lang, setLang] = useState<Language>('ta');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
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

  // Restore active user session if exists
  useEffect(() => {
    const session = getActiveUserSession();
    if (session) {
      const found = users.find((u) => u.id === session.id);
      if (found) {
        setCurrentUser(found);
        setSelectedDsDivisionId(found.role === 'DISTRICT_ADMIN' ? 'ALL' : (found.dsDivisionId || 'DS_VAHARAI'));
        if (found.role === 'DISTRICT_ADMIN') {
          setCurrentTab('district');
        } else if (found.role === 'LAND_OFFICER') {
          setCurrentTab('land');
        } else if (found.role === 'Reception Registrar') {
          setCurrentTab('reception');
        } else if (found.role === 'NORMAL') {
          setCurrentTab('live-display');
        } else if (found.role === 'ELDERLY_OFFICER') {
          setCurrentTab('elderly');
        } else if (found.role === 'MATERNITY_OFFICER' || found.role === 'ECDO') {
          setCurrentTab('maternity');
        } else if (found.role === 'DISABILITY_OFFICER') {
          setCurrentTab('disability');
        }
      }
    }
  }, []);

  // Listen for Google Drive sync status updates
  useEffect(() => {
    const unsubscribe = onDriveSyncStatusChange((st) => {
      setDriveSyncStatus(st);
      setIsDriveConnected(isGoogleDriveAuthenticated());
      setDriveUser(getGoogleDriveUser());
    });
    return unsubscribe;
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

  // Central Google Drive & Server Synchronization across multiple office computers
  useEffect(() => {
    let isMounted = true;

    // Boot: Attempt to load from the designated Google Drive file or Google Sheet via Server Proxy
    const pullFromDesignatedDrive = async () => {
      try {
        const driveData = await fetchFromDesignatedDriveFile();
        if (driveData && isMounted && Array.isArray(driveData.beneficiaries) && driveData.beneficiaries.length > 0) {
          const localItems = loadBeneficiaries().filter((b) => !isRecordDeleted(b.id, b.nic));
          // Merge: Preserve all local newly added records, add any remote records that haven't been deleted
          const map = new Map<string, Beneficiary>();
          driveData.beneficiaries
            .filter((b: Beneficiary) => !isRecordDeleted(b.id, b.nic))
            .forEach((b: Beneficiary) => map.set(b.id || b.nic, b));
          localItems.forEach((b: Beneficiary) => map.set(b.id || b.nic, b));
          const merged = Array.from(map.values()).filter((b) => !isRecordDeleted(b.id, b.nic));
          saveBeneficiaries(merged, false);
          setBeneficiaries(merged);
          console.log(`[Google Drive] Boot: Auto-loaded ${merged.length} records.`);
        }
      } catch (e) {
        console.warn('[Google Drive] Boot fetch warning:', e);
      }
    };

    const syncInit = async () => {
      await pullFromDesignatedDrive();

      // Check central database API
      try {
        if (isServerApiAvailable()) {
          const central = await fetchCentralDatabase();
          if (central && isMounted) {
            if (Array.isArray(central.beneficiaries) && central.beneficiaries.length > 0) {
              const localItems = loadBeneficiaries().filter((b) => !isRecordDeleted(b.id, b.nic));
              const map = new Map<string, Beneficiary>();
              central.beneficiaries
                .filter((b: Beneficiary) => !isRecordDeleted(b.id, b.nic))
                .forEach((b: Beneficiary) => map.set(b.id || b.nic, b));
              localItems.forEach((b: Beneficiary) => map.set(b.id || b.nic, b));
              const merged = Array.from(map.values()).filter((b) => !isRecordDeleted(b.id, b.nic));
              saveBeneficiaries(merged, false);
              setBeneficiaries(merged);
            }
          }
        }
      } catch (err) {
        console.warn('Initial central sync failed:', err);
      }
    };

    syncInit();

    // Polling interval: NEVER delete or clobber local data!
    // Safely merges new records and ensures newly uploaded CSVs are preserved!
    const syncInterval = setInterval(async () => {
      if (!isMounted) return;

      // 1. Google Drive sync check
      if (isGoogleDriveAuthenticated()) {
        try {
          const driveData = await fetchFromDesignatedDriveFile();
          if (driveData && isMounted && Array.isArray(driveData.beneficiaries)) {
            const local = loadBeneficiaries().filter((b) => !isRecordDeleted(b.id, b.nic));
            const existingNics = new Set(local.map((b) => b.nic));
            const existingIds = new Set(local.map((b) => b.id));
            const newFromRemote = driveData.beneficiaries.filter(
              (b: Beneficiary) => !isRecordDeleted(b.id, b.nic) && !existingNics.has(b.nic) && !existingIds.has(b.id)
            );
            if (newFromRemote.length > 0) {
              const merged = [...local, ...newFromRemote];
              saveBeneficiaries(merged, false);
              setBeneficiaries(merged);
            } else if (local.length !== driveData.beneficiaries.length) {
              // Local has changes (new CSV or deletions) -> sync to Google Drive!
              await saveToDesignatedDriveFile(createDatabaseSnapshot());
            }
          }
        } catch {
          // silent offline fallback
        }
      }

      // 2. Central Server sync check
      if (isServerApiAvailable()) {
        try {
          const central = await fetchCentralDatabase();
          if (central && isMounted) {
            const local = loadBeneficiaries().filter((b) => !isRecordDeleted(b.id, b.nic));
            if (Array.isArray(central.beneficiaries)) {
              const existingNics = new Set(local.map((b) => b.nic));
              const existingIds = new Set(local.map((b) => b.id));
              const newFromCentral = central.beneficiaries.filter(
                (b: Beneficiary) => !isRecordDeleted(b.id, b.nic) && !existingNics.has(b.nic) && !existingIds.has(b.id)
              );
              if (newFromCentral.length > 0) {
                const merged = [...local, ...newFromCentral];
                saveBeneficiaries(merged, false);
                setBeneficiaries(merged);
              } else if (local.length !== central.beneficiaries.length) {
                // Local has changes (new CSV or deletions) -> push to central server!
                await pushToCentralDatabase(createDatabaseSnapshot());
              }
            }
            if (Array.isArray(central.tokens) && central.tokens.length > 0) {
              const localTokens = loadTokens();
              const existingTokenIds = new Set(localTokens.map((t) => t.id));
              const newTokens = central.tokens.filter((t: QueueToken) => !existingTokenIds.has(t.id));
              if (newTokens.length > 0) {
                const mergedTokens = [...localTokens, ...newTokens];
                setTokens(mergedTokens);
                saveTokens(mergedTokens);
              }
            }
            if (Array.isArray(central.assistance) && central.assistance.length > 0) {
              const localAssistance = loadAssistanceRecords();
              const existingIds = new Set(localAssistance.map((a) => a.id));
              const newAid = central.assistance.filter((a: AssistanceRecord) => !existingIds.has(a.id));
              if (newAid.length > 0) {
                const mergedAid = [...localAssistance, ...newAid];
                saveAssistanceRecords(mergedAid);
                setAssistanceRecords(mergedAid);
              }
            }
          }
        } catch {
          // offline fallback
        }
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveUserSession(user);
    const initialDsId = user.role === 'DISTRICT_ADMIN' ? 'ALL' : (user.dsDivisionId || 'DS_VAHARAI');
    setSelectedDsDivisionId(initialDsId);
    if (user.role === 'DISTRICT_ADMIN') {
      setCurrentTab('district');
    } else if (user.role === 'LAND_OFFICER') {
      setCurrentTab('land');
    } else if (user.role === 'Reception Registrar') {
      setCurrentTab('reception');
    } else if (user.role === 'NORMAL') {
      setCurrentTab('live-display');
    } else if (user.role === 'ELDERLY_OFFICER') {
      setCurrentTab('elderly');
    } else if (user.role === 'MATERNITY_OFFICER' || user.role === 'ECDO') {
      setCurrentTab('maternity');
    } else if (user.role === 'DISABILITY_OFFICER') {
      setCurrentTab('beneficiaries');
    } else {
      setCurrentTab('dashboard');
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

  // Scoped datasets filtered by tenant secretariat
  const scopedDivisions = activeTenantDsId
    ? divisions.filter((d) => (d.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId)
    : divisions;

  const scopedBeneficiaries = activeTenantDsId
    ? beneficiaries.filter((b) => (b.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId)
    : beneficiaries;

  const scopedTokens = activeTenantDsId
    ? tokens.filter((t) => (t.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId)
    : tokens;

  const scopedAssistanceRecords = activeTenantDsId
    ? assistanceRecords.filter((a) => (a.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId)
    : assistanceRecords;

  const scopedPregnantMothers = activeTenantDsId
    ? pregnantMothers.filter((m) => (m.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId)
    : pregnantMothers;

  const scopedLandRecords = activeTenantDsId
    ? landRecords.filter((l) => (l.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId)
    : landRecords;

  const scopedHouseholds = activeTenantDsId
    ? households.filter((h) => (h.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId)
    : households;

  const scopedPetitions = activeTenantDsId
    ? petitions.filter((p) => (p.dsDivisionId || 'DS_VAHARAI') === activeTenantDsId)
    : petitions;

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
      if (isGoogleDriveAuthenticated()) {
        const driveData = await fetchFromDesignatedDriveFile();
        if (driveData && driveData.beneficiaries) {
          restoreDatabaseFromSnapshot(driveData);
          handleDatabaseReload();
          setSyncToastMessage(lang === 'ta' ? 'டிரைவ் கோப்பிலிருந்து தரவுகள் பெறப்பட்டன!' : 'Pulled latest from Drive file!');
        } else {
          const snapshot = createDatabaseSnapshot();
          await saveToDesignatedDriveFile(snapshot);
          setSyncToastMessage(lang === 'ta' ? 'டிரைவ் கோப்பில் சேமிக்கப்பட்டது!' : 'Saved to Drive file!');
        }
      } else if (isServerApiAvailable()) {
        const central = await fetchCentralDatabase();
        if (central) {
          restoreDatabaseFromSnapshot(central);
          handleDatabaseReload();
          setSyncToastMessage(lang === 'ta' ? 'சர்வர் தரவுகள் புதுப்பிக்கப்பட்டன!' : 'Server data refreshed!');
        }
      } else {
        setSyncToastMessage(lang === 'ta' ? 'டிரைவை இணைக்க வலதுபுறம் உள்ள பொத்தானை அழுத்தவும்' : 'Connect Google Drive to sync across browsers');
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
      const snapshot = createDatabaseSnapshot();
      await pushToCentralDatabase(snapshot);

      if (isGoogleDriveAuthenticated()) {
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
            ? 'ℹ️ மத்திய சர்வரில் சேமிக்கப்பட்டது. Google Drive-இல் நேரடியாக சேமிக்க Drive பக்கத்தில் கணக்கை இணைக்கவும்.'
            : 'ℹ️ Saved to Central Server. Connect Google Drive in Drive settings to save to your personal Drive.'
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
        setCurrentTab('drive');
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
  } else if (isElderlyOfficer && currentTab !== 'universal-search' && currentTab !== 'petitions') {
    safeTab = 'elderly';
  } else if (isMaternityOfficer && currentTab !== 'universal-search' && currentTab !== 'petitions') {
    safeTab = 'maternity';
  } else if (isDisabilityOfficer && currentTab !== 'universal-search' && currentTab !== 'petitions') {
    safeTab = 'disability';
  } else if (currentTab === 'land' && !canAccessLand) {
    safeTab = 'dashboard';
  } else if (currentTab === 'family-center' && !canAccessFamilyCenter) {
    safeTab = 'dashboard';
  } else if (currentTab === 'staff' && !canAccessStaff) {
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        currentTab={safeTab}
        setCurrentTab={setCurrentTab}
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
      />

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
            setCurrentTab={setCurrentTab}
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
          />
        )}

        {/* Main View Area with strict overflow safety */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 no-print overflow-x-hidden max-w-7xl mx-auto w-full">
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
              setCurrentTab('dashboard');
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
            auditLogs={auditLogs}
            currentUser={currentUser}
            lang={lang}
            onNavigate={(tab) => setCurrentTab(tab)}
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
            onNavigateToLiveDisplay={() => setCurrentTab('live-display')}
            onNavigateToServices={() => setCurrentTab('services')}
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
            onNavigateToCsv={() => setCurrentTab('csv')}
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
            currentUser={currentUser}
            lang={lang}
            onUpdateBeneficiaries={handleUpdateBeneficiaries}
            onUpdateUsers={handleUpdateUsers}
            onUpdateAssistanceRecords={handleUpdateAssistanceRecords}
            onUpdatePregnantMothers={handleUpdatePregnantMothers}
            onUpdateLandRecords={handleUpdateLandRecords}
            onAuditLog={handleAuditLog}
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
      </main>
      </div>

      {/* Barcode / NIC Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal
          beneficiaries={beneficiaries}
          lang={lang}
          onSelectBeneficiary={() => {
            if (!isReception && !isNormal) {
              setCurrentTab('beneficiaries');
            } else if (isReception) {
              setCurrentTab('reception');
            } else {
              setCurrentTab('live-display');
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
