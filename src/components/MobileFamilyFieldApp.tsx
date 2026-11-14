import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  HouseholdData,
  Beneficiary,
  AssistanceRecord,
  GNDivision,
  User,
  PovertyScoringWeights,
  computeMembersAtAGlance,
} from '../types';
import { Language } from '../translations/i18n';
import { OfficialFamilyDossierWindow, DossierWindowTab } from './OfficialFamilyDossierWindow';
import { PWAInstallButton } from './PWAInstallButton';
import { VaharaiLogo } from './VaharaiLogo';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  OfflineFamilyChange,
  OfflineSyncMeta,
  loadOfflineSyncQueue,
  hydrateOfflineQueueFromIdb,
  loadOfflineSyncMeta,
  downloadFamiliesForOffline,
  queueOfflineFamilyChange,
  uploadPendingOfflineChangesToServer,
} from '../services/offlineMobileSync';
import { GpsShareStatus } from '../services/fieldLocationTracker';
import {
  CloudDownload,
  CloudUpload,
  Wifi,
  WifiOff,
  Users,
  Plus,
  Search,
  Edit3,
  FileText,
  CheckCircle2,
  Clock,
  RefreshCw,
  LogOut,
  Monitor,
  Smartphone,
  Download,
  AlertCircle,
  UserPlus,
  Info,
  MapPin,
  Lock,
  ShieldAlert,
} from 'lucide-react';

interface MobileFamilyFieldAppProps {
  currentUser: User;
  households: HouseholdData[];
  beneficiaries: Beneficiary[];
  assistanceRecords: AssistanceRecord[];
  divisions: GNDivision[];
  povertyWeights: PovertyScoringWeights;
  lang: Language;
  setLang: (lang: Language) => void;
  onDatabaseReload: () => void;
  onExitMobileMode: () => void;
  onLogout: () => void;
  gpsStatus?: GpsShareStatus;
  gpsLastCoords?: { lat: number; lng: number; accuracy?: number; updatedAt: string } | null;
  gpsSharingEnabled?: boolean;
  onToggleGpsSharing?: (enabled: boolean) => void;
  onRefreshGps?: () => void;
}

type MobileTab = 'families' | 'sync';

export const MobileFamilyFieldApp: React.FC<MobileFamilyFieldAppProps> = ({
  currentUser,
  households,
  beneficiaries,
  assistanceRecords,
  divisions,
  povertyWeights,
  lang,
  setLang,
  onDatabaseReload,
  onExitMobileMode,
  onLogout,
  gpsStatus = 'idle',
  gpsLastCoords = null,
  gpsSharingEnabled = true,
  onToggleGpsSharing,
  onRefreshGps,
}) => {
  const isTa = lang !== 'en';
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const isGramaNiladhari = currentUser.role === 'GRAMANIILATHARI';
  const rawUserDiv = (currentUser.division || '').trim().toUpperCase();
  const lockedDiv = rawUserDiv && rawUserDiv !== 'ALL' ? rawUserDiv : '';

  const [mobileTab, setMobileTab] = useState<MobileTab>('families');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiv, setSelectedDiv] = useState(lockedDiv || 'ALL');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const [pendingQueue, setPendingQueue] = useState<OfflineFamilyChange[]>(() => loadOfflineSyncQueue());
  const [syncMeta, setSyncMeta] = useState<OfflineSyncMeta>(() => loadOfflineSyncMeta());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [autoSyncOnReconnect, setAutoSyncOnReconnect] = useState(true);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Dossier Editor Modal State
  const [dossierOpen, setDossierOpen] = useState(false);
  const [dossierTab, setDossierTab] = useState<DossierWindowTab>('family-entry');
  const [editingHousehold, setEditingHousehold] = useState<HouseholdData | null>(null);

  const canEdit = isGramaNiladhari;
  const isSuperAdmin = false;

  // Hydrate offline queue from IndexedDB on boot
  useEffect(() => {
    hydrateOfflineQueueFromIdb().then((q) => {
      setPendingQueue(q);
      setSyncMeta(loadOfflineSyncMeta());
    });
  }, []);

  // Track online transition to auto-upload queued offline edits when network returns
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const transitionedOnline = !wasOnlineRef.current && isOnline;
    wasOnlineRef.current = isOnline;
    if (transitionedOnline && autoSyncOnReconnect && pendingQueue.length > 0 && !isUploading) {
      void handleUploadPending();
    }
  }, [isOnline, autoSyncOnReconnect, pendingQueue.length]);

  const showNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  };

  const pendingKeysSet = useMemo(() => new Set(pendingQueue.map((q) => q.familyKey.toUpperCase())), [pendingQueue]);

  const filteredHouseholds = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const activeDivFilter = lockedDiv || selectedDiv;
    return households.filter((h) => {
      const famKey = (h.familyCode || h.id).trim().toUpperCase();
      if (showPendingOnly && !pendingKeysSet.has(famKey)) return false;
      if (activeDivFilter !== 'ALL' && (h.divisionCode || '').trim().toUpperCase() !== activeDivFilter) return false;
      if (q) {
        const matchesFam =
          h.familyCode.toLowerCase().includes(q) ||
          h.applicantNameTa.toLowerCase().includes(q) ||
          (h.applicantNameEn || '').toLowerCase().includes(q) ||
          h.applicantNic.toLowerCase().includes(q) ||
          (h.phone || '').toLowerCase().includes(q) ||
          (h.address || '').toLowerCase().includes(q);
        if (!matchesFam) return false;
      }
      return true;
    });
  }, [households, searchTerm, selectedDiv, lockedDiv, showPendingOnly, pendingKeysSet]);

  const handleDownloadOffline = async () => {
    if (!isOnline) {
      showNotice(
        'error',
        isTa
          ? 'இணைய இணைப்பு இல்லை! சேவையகத்திலிருந்து தரவிறக்க இணையத்தை இயக்கவும் (தற்போது சேமிக்கப்பட்ட ஆஃப்லைன் தரவுகள் பயன்பாட்டில் உள்ளன).'
          : 'You are offline. Connect to the internet to download fresh data from the server.'
      );
      return;
    }
    setIsDownloading(true);
    const res = await downloadFamiliesForOffline(currentUser);
    setIsDownloading(false);
    setSyncMeta(loadOfflineSyncMeta());
    onDatabaseReload();
    if (res.success) {
      showNotice(
        'success',
        isTa
          ? `✅ ${lockedDiv ? `GN பிரிவு ${lockedDiv}: ` : ''}${res.familiesCount} குடும்பங்கள் & ${res.membersCount} உறுப்பினர்கள் ஆஃப்லைன் பயன்பாட்டிற்கு வெற்றிகரமாக பதிவிறக்கப்பட்டன!`
          : `✅ Downloaded ${res.familiesCount} families & ${res.membersCount} members${lockedDiv ? ` for GN ${lockedDiv}` : ''} for offline field work!`
      );
    } else {
      showNotice('error', res.error || 'Download failed');
    }
  };

  const handleUploadPending = async () => {
    if (pendingQueue.length === 0) {
      showNotice(
        'info',
        isTa ? 'சேவையகத்திற்கு அனுப்ப நிலுவையில் மாற்றங்கள் எதுவும் இல்லை.' : 'No pending offline updates to upload.'
      );
      return;
    }
    if (!isOnline) {
      showNotice(
        'error',
        isTa
          ? 'இப்போது ஆஃப்லைனில் உள்ளீர்கள்! இணையம் கிடைத்தவுடன் "பிரதான சேவையகத்திற்கு அனுப்பு" என்பதை அழுத்தவும்.'
          : 'Device is offline. Your updates are saved safely locally and can be uploaded once online.'
      );
      return;
    }
    setIsUploading(true);
    const res = await uploadPendingOfflineChangesToServer(currentUser);
    setIsUploading(false);
    setPendingQueue(loadOfflineSyncQueue());
    setSyncMeta(loadOfflineSyncMeta());
    onDatabaseReload();

    if (res.success) {
      showNotice(
        'success',
        isTa
          ? `✅ ${res.syncedFamilies} குடும்பங்கள் (${res.syncedMembers} உறுப்பினர்கள்) பிரதான சேவையகத்தில் வெற்றிகரமாக அப்டேட் செய்யப்பட்டன!`
          : `✅ Successfully synced ${res.syncedFamilies} offline families (${res.syncedMembers} members) to Main Server!`
      );
    } else {
      showNotice('error', res.error || 'Sync failed');
    }
  };

  const handleSaveOfflineFamily = ({
    household,
    savedMembers,
    removedMemberIds,
    isEdit,
  }: {
    household: HouseholdData;
    savedMembers: Beneficiary[];
    removedMemberIds: string[];
    isEdit: boolean;
  }) => {
    const res = queueOfflineFamilyChange({
      household,
      savedMembers,
      removedMemberIds,
      isEdit,
      user: currentUser,
    });
    setPendingQueue(res.queue);
    onDatabaseReload();
    setDossierOpen(false);
    setEditingHousehold(null);

    if (isOnline && autoSyncOnReconnect) {
      showNotice(
        'info',
        isTa
          ? `குடும்பம் ${household.familyCode} ஆஃப்லைன் வரிசையில் சேமிக்கப்பட்டது — பிரதான சேவையகத்திற்கு அனுப்பலாம்.`
          : `Saved ${household.familyCode}. Ready to sync with Main Server.`
      );
    } else {
      showNotice(
        'success',
        isTa
          ? `💾 ஆஃப்லைனில் பாதுகாப்பாக சேமிக்கப்பட்டது (${household.familyCode})! இணையம் வந்ததும் "சேவையகத்திற்கு அனுப்பு" அழுத்தவும்.`
          : `💾 Saved offline (${household.familyCode})! Tap "Sync to Server" when online.`
      );
    }
  };

  const handleExportPendingJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      officerId: currentUser.id,
      officerName: currentUser.name,
      pendingChanges: pendingQueue,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `vaharai_offline_updates_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openEditor = (h: HouseholdData | null, tab: DossierWindowTab) => {
    setEditingHousehold(h);
    setDossierTab(tab);
    setDossierOpen(true);
  };

  if (!isGramaNiladhari) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-md w-full text-center space-y-3 shadow-md">
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-base font-black text-slate-900">
            {isTa ? 'கிராம உத்தியோகத்தருக்கான மொபைல் ஆப்' : 'Grama Niladhari Mobile App Only'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isTa
              ? 'இந்த ஆஃப்லைன் மொபைல் ஆப் கிராம உத்தியோகத்தர் (Grama Niladhari) பயனர்களுக்காக மட்டுமே வடிவமைக்கப்பட்டுள்ளது.'
              : 'This Mobile Field App is restricted exclusively to Grama Niladhari users.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onExitMobileMode}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-extrabold"
            >
              {isTa ? 'டெஸ்க்டாப் அமைப்புக்குச் செல்' : 'Open Main Portal'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
            >
              {isTa ? 'வெளியேறு' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-20">
      {/* Sticky Native-Style Mobile App Bar */}
      <header className="sticky top-0 z-30 bg-emerald-950 text-white shadow-md border-b-2 border-amber-400">
        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-white p-1 rounded-full shrink-0">
              <VaharaiLogo size={28} className="w-7 h-7" dsDivisionId={currentUser.dsDivisionId || 'DS_VAHARAI'} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black truncate">
                  {isTa ? 'கிராம உத்தியோகத்தர் மொபைல் ஆப்' : 'GN Field Mobile App'}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 shrink-0 ${
                    isOnline ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50' : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                  <span>{isOnline ? (isTa ? 'ஆன்லைன்' : 'Online') : (isTa ? 'ஆஃப்லைன்' : 'Offline')}</span>
                </span>
              </div>
              <div className="text-[10px] text-emerald-200 truncate flex items-center gap-1.5">
                <span className="truncate">
                  {currentUser.name}
                  {lockedDiv ? ` · GN ${lockedDiv}` : ''} · {filteredHouseholds.length} {isTa ? 'குடும்பங்கள்' : 'Families'}
                </span>
                {gpsStatus === 'active' && (
                  <span className="px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-100 text-[9px] font-bold inline-flex items-center gap-0.5 shrink-0">
                    <MapPin className="w-2.5 h-2.5" />
                    GPS
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton lang={lang} compact />
            <button
              type="button"
              onClick={() => setLang(isTa ? 'en' : 'ta')}
              className="px-2 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-[11px] font-bold border border-emerald-700"
            >
              {isTa ? 'EN' : 'த'}
            </button>
            <button
              type="button"
              onClick={onExitMobileMode}
              className="p-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-700"
              title={isTa ? 'முழு டெஸ்க்டாப் அமைப்புக்குத் திரும்பு' : 'Switch to Full System'}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-700"
              title={isTa ? 'வெளியேறு' : 'Logout'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Offline / Sync Quick Action Strip */}
        <div className="bg-emerald-900/80 px-3 py-2 grid grid-cols-2 gap-2 border-t border-emerald-800">
          <button
            type="button"
            onClick={handleDownloadOffline}
            disabled={isDownloading}
            className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-60 text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 border border-white/20 transition-colors"
          >
            <CloudDownload className={`w-4 h-4 text-sky-300 shrink-0 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span className="truncate">
              {isDownloading
                ? isTa ? 'பதிவிறக்குகிறது...' : 'Downloading...'
                : isTa ? 'சர்வரிலிருந்து தரவிறக்கு' : 'Download Offline'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleUploadPending}
            disabled={isUploading}
            className={`px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 border transition-colors ${
              pendingQueue.length > 0
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow-sm'
                : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border-emerald-700'
            }`}
          >
            <CloudUpload className={`w-4 h-4 shrink-0 ${isUploading ? 'animate-pulse' : ''}`} />
            <span className="truncate">
              {isUploading
                ? isTa ? 'அனுப்புகிறது...' : 'Syncing...'
                : isTa ? `சர்வரிற்கு அனுப்பு (${pendingQueue.length})` : `Sync to Server (${pendingQueue.length})`}
            </span>
          </button>
        </div>
      </header>

      {/* Non-intrusive Status Notice */}
      {statusBanner && (
        <div
          className={`mx-3 mt-3 p-3 rounded-xl border text-xs font-bold flex items-start gap-2 shadow-sm ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : statusBanner.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-sky-50 border-sky-300 text-sky-950'
          }`}
        >
          {statusBanner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{statusBanner.text}</span>
        </div>
      )}

      {/* Offline Persistent Banner */}
      {!isOnline && (
        <div className="mx-3 mt-2.5 px-3 py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
          <span>
            {isTa
              ? 'ஆஃப்லைன் பயன்முறை — உங்கள் மாற்றங்கள் இத்தொலைபேசியில் பாதுகாப்பாக சேமிக்கப்படும்.'
              : 'Offline Mode — Updates are saved locally and queued for server sync.'}
          </span>
        </div>
      )}

      {/* MAIN CONTENT */}
      {mobileTab === 'families' ? (
        <div className="p-3 space-y-3 max-w-2xl mx-auto w-full">
          {/* Search + Filter Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isTa ? 'குடும்ப இலக்கம், தலைவர் பெயர், NIC தேடுக...' : 'Search Family Code, Head Name, NIC...'}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {lockedDiv ? (
                <div className="flex-1 min-w-[140px] px-2.5 py-2 text-xs font-extrabold border border-emerald-300 bg-emerald-50 text-emerald-950 rounded-xl flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                  <span className="truncate">
                    GN {lockedDiv} - {divisions.find((d) => d.code.trim().toUpperCase() === lockedDiv)?.[isTa ? 'nameTa' : 'nameEn'] || (isTa ? 'உங்கள் பிரிவு மட்டும்' : 'Your Division Only')}
                  </span>
                </div>
              ) : (
                <select
                  value={selectedDiv}
                  onChange={(e) => setSelectedDiv(e.target.value)}
                  className="flex-1 min-w-[140px] px-2.5 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                >
                  <option value="ALL">{isTa ? 'அனைத்து GN பிரிவுகள்' : 'All GN Divisions'}</option>
                  {divisions.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} - {isTa ? d.nameTa : d.nameEn}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => setShowPendingOnly((p) => !p)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-colors ${
                  showPendingOnly
                    ? 'bg-amber-500 text-slate-950 border-amber-600'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {isTa ? `நிலுவை (${pendingQueue.length})` : `Pending (${pendingQueue.length})`}
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => openEditor(null, 'family-entry')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isTa ? 'புதிய குடும்பம்' : 'New Family'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Family Cards */}
          <div className="space-y-2.5">
            {filteredHouseholds.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">
                  {households.length === 0
                    ? isTa
                      ? 'ஆஃப்லைன் குடும்பத் தரவுகள் இன்னும் பதிவிறக்கப்படவில்லை. மேலே "சர்வரிலிருந்து தரவிறக்கு" பொத்தானை அழுத்தவும் அல்லது புதிய குடும்பத்தைச் சேர்க்கவும்.'
                      : 'No offline family records yet. Tap "Download Offline" above or add a new family.'
                    : isTa
                    ? 'தேடலுக்குப் பொருந்தும் குடும்பம் இல்லை.'
                    : 'No matching families found.'}
                </p>
              </div>
            ) : (
              filteredHouseholds.map((h) => {
                const members = beneficiaries.filter((b) => b.familyCode === h.familyCode);
                const famKey = (h.familyCode || h.id).trim().toUpperCase();
                const isPendingUpload = pendingKeysSet.has(famKey);
                const g = computeMembersAtAGlance(members);

                return (
                  <div
                    key={h.id}
                    className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-2.5 ${
                      isPendingUpload ? 'border-amber-400 ring-1 ring-amber-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                            {h.familyCode}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {h.divisionCode}
                          </span>
                          {isPendingUpload && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 inline-flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{isTa ? 'சர்வர் ஒத்திசைவு நிலுவை' : 'Pending Upload'}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-black text-slate-900 mt-1 leading-snug">
                          {h.applicantNameTa}
                        </h3>
                        <div className="text-[11px] text-slate-600 font-mono">
                          NIC: {h.applicantNic} {h.phone ? `· ${h.phone}` : ''}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-black font-mono text-slate-900 leading-none">
                          {h.score100}<span className="text-[10px] text-slate-400">/100</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                          P{h.priorityRank}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                        👥 {members.length || h.totalMembersCount} {isTa ? 'உறுப்பினர்கள்' : 'Members'}
                      </span>
                      {g.disabilityCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                          மாற்றுத்திறனாளி: {g.disabilityCount}
                        </span>
                      )}
                      {g.over70Count > 0 && (
                        <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-bold">
                          70+: {g.over70Count}
                        </span>
                      )}
                      {h.commonAssets.welfareAssistance?.aswesumaCategory &&
                        h.commonAssets.welfareAssistance.aswesumaCategory !== 'NONE' && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-bold">
                            அஸ்வெசும: {h.commonAssets.welfareAssistance.aswesumaCategory}
                          </span>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditor(h, 'family-entry')}
                          className="py-2 px-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-extrabold flex items-center justify-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isTa ? 'குடும்பம் திருத்து' : 'Edit Family'}</span>
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditor(h, 'members')}
                          className="py-2 px-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-950 border border-teal-300 text-[11px] font-extrabold flex items-center justify-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isTa ? 'உறுப்பினர்' : 'Members'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditor(h, 'summary-a4')}
                        className="py-2 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 text-[11px] font-extrabold flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isTa ? 'சமரி / A4' : 'Summary'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* SYNC HUB & MOBILE INSTALL / APK INFO TAB */
        <div className="p-3 space-y-3 max-w-2xl mx-auto w-full">
          {/* Offline Sync Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-800" />
              <span>{isTa ? 'ஆஃப்லைன் தரவு & பிரதான சேவையக ஒத்திசைவு' : 'Offline Data & Main Server Sync'}</span>
            </h2>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  {isTa ? 'சேமிக்கப்பட்ட குடும்பங்கள்' : 'Offline Families'}
                </div>
                <div className="text-xl font-black font-mono text-slate-900">{households.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-bold text-amber-800 uppercase">
                  {isTa ? 'அனுப்ப நிலுவையில்' : 'Pending Upload'}
                </div>
                <div className="text-xl font-black font-mono text-amber-950">{pendingQueue.length}</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div>
                <strong>{isTa ? 'கடைசி தரவிறக்கம்:' : 'Last Downloaded:'}</strong>{' '}
                {syncMeta.lastDownloadedAt ? new Date(syncMeta.lastDownloadedAt).toLocaleString() : (isTa ? 'இதுவரை இல்லை' : 'Not yet')}
              </div>
              <div>
                <strong>{isTa ? 'கடைசி சர்வர் அப்டேட்:' : 'Last Synced to Server:'}</strong>{' '}
                {syncMeta.lastUploadedAt ? new Date(syncMeta.lastUploadedAt).toLocaleString() : (isTa ? 'இதுவரை இல்லை' : 'Not yet')}
              </div>
            </div>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-950 cursor-pointer">
              <span>{isTa ? 'இணையம் வந்தவுடன் தானாக சர்வரிற்கு அனுப்பு' : 'Auto-sync to Main Server when back online'}</span>
              <input
                type="checkbox"
                checked={autoSyncOnReconnect}
                onChange={(e) => setAutoSyncOnReconnect(e.target.checked)}
                className="rounded text-emerald-700"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadOffline}
                disabled={isDownloading}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
              >
                <CloudDownload className="w-4 h-4" />
                <span>{isTa ? 'சர்வரிலிருந்து தரவிறக்கு' : 'Download Existing Families'}</span>
              </button>
              <button
                type="button"
                onClick={handleUploadPending}
                disabled={isUploading || pendingQueue.length === 0}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
              >
                <CloudUpload className="w-4 h-4" />
                <span>{isTa ? `பிரதான சேவையகத்திற்கு அனுப்பு (${pendingQueue.length})` : `Upload to Main Server (${pendingQueue.length})`}</span>
              </button>
            </div>
          </div>

          {/* Pending Offline Queue Items */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                {isTa ? 'ஆஃப்லைன் மாற்றங்களின் பட்டியல்' : 'Queued Offline Updates'} ({pendingQueue.length})
              </h3>
              {pendingQueue.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportPendingJson}
                  className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isTa ? 'JSON காப்பு' : 'Backup JSON'}</span>
                </button>
              )}
            </div>

            {pendingQueue.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                {isTa ? 'அனைத்து தரவுகளும் பிரதான சேவையகத்துடன் ஒத்திசைக்கப்பட்டுள்ளன.' : 'All field records are synchronized with the main server.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingQueue.map((item) => (
                  <div key={item.familyKey} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-mono font-black text-emerald-900">{item.household.familyCode}</div>
                      <div className="font-bold text-slate-900 truncate">{item.household.applicantNameTa}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.savedMembers.length} {isTa ? 'உறுப்பினர்கள்' : 'members'} · {new Date(item.queuedAt).toLocaleString()}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 font-bold text-[10px] shrink-0">
                      {item.isEdit ? (isTa ? 'திருத்தம்' : 'Updated') : (isTa ? 'புதியது' : 'New')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live GPS Location Sharing Card for Super Admin Field Map */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>{isTa ? 'நேரடி GPS இருப்பிடப் பகிர்வு (Super Admin Map)' : 'Live GPS Location Sharing'}</span>
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  gpsStatus === 'active'
                    ? 'bg-emerald-100 text-emerald-900'
                    : gpsStatus === 'denied'
                    ? 'bg-rose-100 text-rose-900'
                    : gpsStatus === 'paused'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {gpsStatus === 'active'
                  ? isTa ? 'பகிரப்படுகிறது' : 'Active'
                  : gpsStatus === 'denied'
                  ? isTa ? 'அனுமதி மறுக்கப்பட்டது' : 'Denied'
                  : gpsStatus === 'paused'
                  ? isTa ? 'நிறுத்தப்பட்டது' : 'Paused'
                  : isTa ? 'இணைக்கிறது...' : 'Locating...'}
              </span>
            </div>

            {gpsLastCoords && (
              <div className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700">
                Lat: {gpsLastCoords.lat.toFixed(5)} · Lng: {gpsLastCoords.lng.toFixed(5)}
                {typeof gpsLastCoords.accuracy === 'number' ? ` (±${gpsLastCoords.accuracy}m)` : ''}
              </div>
            )}

            {gpsStatus === 'denied' && (
              <p className="text-[11px] text-rose-700 font-semibold">
                {isTa
                  ? 'தொலைபேசி உலாவியில் Location (GPS) அனுமதியை இயக்கி "இப்போது புதுப்பி" என்பதை அழுத்தவும்.'
                  : 'Enable Location permission in your browser settings and tap Refresh GPS.'}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              {onToggleGpsSharing && (
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gpsSharingEnabled}
                    onChange={(e) => onToggleGpsSharing(e.target.checked)}
                    className="rounded text-emerald-700"
                  />
                  <span>{isTa ? 'தற்போதைய இருப்பிடத்தைப் பகிர்' : 'Share Current GPS Location'}</span>
                </label>
              )}
              {onRefreshGps && (
                <button
                  type="button"
                  onClick={onRefreshGps}
                  disabled={!gpsSharingEnabled}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white text-[11px] font-bold"
                >
                  {isTa ? 'GPS புதுப்பி' : 'Refresh GPS'}
                </button>
              )}
            </div>
          </div>

          {/* Mobile App Install & Android APK Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-800" />
              <span>{isTa ? 'தொலைபேசி ஆப் நிறுவுதல் & APK உருவாக்கம்' : 'Phone App Install & Android APK Guide'}</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isTa
                ? 'இந்த ஆப் முழுமையான Offline PWA மொபைல் ஆப் ஆகும். Android Chrome அல்லது iPhone Safari-இல் "Add to Home Screen / Install App" மூலம் நேரடியாக உங்கள் தொலைபேசியில் நிறுவலாம் (APK போன்றே முகப்புத் திரையில் ஐகானுடன் ஆஃப்லைனில் இயங்கும்).'
                : 'This Field App is an offline-ready PWA. Install it directly from Android Chrome or iOS Safari onto your home screen to run offline like a native app.'}
            </p>
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={install}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>{isTa ? 'தொலைபேசியில் இப்போதே நிறுவு (Install Mobile App)' : 'Install Mobile App Now'}</span>
              </button>
            )}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <span>
                {isTa
                  ? 'தனி .APK கோப்பு தேவைப்பட்டால்: உங்கள் Shared App URL-ஐ PWABuilder (pwabuilder.com) தளத்தில் உள்ளிட்டு 1 நிமிடத்தில் Android .APK கோப்பாக உருவாக்கலாம்.'
                  : 'Need a standalone .apk file? Paste the Shared App URL into PWABuilder (pwabuilder.com) to package this PWA directly into a signed Android .apk.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Native-App Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-lg grid grid-cols-3 text-[11px] font-extrabold">
        <button
          type="button"
          onClick={() => setMobileTab('families')}
          className={`py-2.5 flex flex-col items-center justify-center gap-0.5 ${
            mobileTab === 'families' ? 'text-emerald-800 bg-emerald-50/70' : 'text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isTa ? 'குடும்பங்கள்' : 'Families'}</span>
        </button>

        <button
          type="button"
          onClick={() => canEdit && openEditor(null, 'family-entry')}
          disabled={!canEdit}
          className="py-2.5 flex flex-col items-center justify-center gap-0.5 text-white bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{isTa ? 'புதிய பதிவு' : 'Add Family'}</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('sync')}
          className={`py-2.5 flex flex-col items-center justify-center gap-0.5 relative ${
            mobileTab === 'sync' ? 'text-emerald-800 bg-emerald-50/70' : 'text-slate-600'
          }`}
        >
          <div className="relative">
            <CloudUpload className="w-4 h-4" />
            {pendingQueue.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 px-1.5 min-w-[16px] h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center">
                {pendingQueue.length}
              </span>
            )}
          </div>
          <span>{isTa ? 'ஒத்திசைவு (Sync)' : 'Sync Hub'}</span>
        </button>
      </nav>

      {/* Official Family & Members Editor Modal (Works 100% Offline) */}
      <OfficialFamilyDossierWindow
        isOpen={dossierOpen}
        initialTab={dossierTab}
        editingHousehold={editingHousehold}
        existingHouseholdsCount={households.length}
        existingBeneficiaries={beneficiaries}
        assistanceRecords={assistanceRecords}
        divisions={divisions}
        lang={lang}
        povertyWeights={povertyWeights}
        canEdit={canEdit}
        isSuperAdmin={isSuperAdmin}
        lockedDivisionCode={lockedDiv || undefined}
        onClose={() => {
          setDossierOpen(false);
          setEditingHousehold(null);
        }}
        onSaveFamily={handleSaveOfflineFamily}
      />
    </div>
  );
};
