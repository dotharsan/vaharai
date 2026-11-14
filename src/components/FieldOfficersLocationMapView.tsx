import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { FieldOfficerLocation, GNDivision, User } from '../types';
import { Language } from '../translations/i18n';
import { fetchFieldOfficerLocations } from '../services/fieldLocationTracker';
import {
  MapPin,
  RefreshCw,
  Smartphone,
  Search,
  Navigation,
  Clock,
  ShieldAlert,
  Crosshair,
  Trash2,
  Radio,
} from 'lucide-react';

interface FieldOfficersLocationMapViewProps {
  currentUser: User;
  divisions: GNDivision[];
  lang: Language;
  selectedDsDivisionId?: string;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
// Koralaipattu North (Vaharai) Divisional Secretariat default center coordinates
const VAHARAI_CENTER = { lat: 8.1333, lng: 81.4417 };

const getRecencyTier = (updatedAt: string): 'live' | 'recent' | 'offline' => {
  const diffMs = Date.now() - Date.parse(updatedAt || '');
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'live';
  if (diffMs <= 5 * 60 * 1000) return 'live';
  if (diffMs <= 60 * 60 * 1000) return 'recent';
  return 'offline';
};

const formatRelativeTime = (iso: string, isTa: boolean): string => {
  const ms = Date.now() - Date.parse(iso || '');
  if (!Number.isFinite(ms) || ms < 0) return isTa ? 'இப்போது' : 'Just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return isTa ? `${sec} விநாடிகள் முன்` : `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return isTa ? `${min} நிமிடங்கள் முன்` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isTa ? `${hr} மணி முன்` : `${hr}h ago`;
  return new Date(iso).toLocaleDateString();
};

const getLocKey = (loc: FieldOfficerLocation): string =>
  loc.key || `${loc.userId}::${loc.deviceId}`;

const MapViewportController: React.FC<{
  selectedLocation: FieldOfficerLocation | null;
  locations: FieldOfficerLocation[];
  fitTrigger: number;
}> = ({ selectedLocation, locations, fitTrigger }) => {
  const map = useMap();
  const coreLib = useMapsLibrary('core');

  useEffect(() => {
    if (!map || !selectedLocation) return;
    map.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    const currentZoom = map.getZoom() || 11;
    if (currentZoom < 14) {
      map.setZoom(15);
    }
  }, [map, selectedLocation]);

  useEffect(() => {
    if (!map || !coreLib || fitTrigger === 0 || locations.length === 0) return;
    if (locations.length === 1) {
      map.panTo({ lat: locations[0].lat, lng: locations[0].lng });
      map.setZoom(15);
      return;
    }
    const bounds = new coreLib.LatLngBounds();
    locations.forEach((loc) => bounds.extend({ lat: loc.lat, lng: loc.lng }));
    map.fitBounds(bounds, 64);
  }, [map, coreLib, fitTrigger, locations]);

  return null;
};

const OfficerMarkerWithInfo: React.FC<{
  location: FieldOfficerLocation;
  isSelected: boolean;
  isTa: boolean;
  divisionName?: string;
  onSelect: () => void;
  onClose: () => void;
}> = ({ location, isSelected, isTa, divisionName, onSelect, onClose }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const tier = getRecencyTier(location.updatedAt);

  const pinColors =
    tier === 'live'
      ? { background: '#059669', borderColor: '#064e3b', glyphColor: '#ffffff' }
      : tier === 'recent'
      ? { background: '#d97706', borderColor: '#78350f', glyphColor: '#ffffff' }
      : { background: '#64748b', borderColor: '#334155', glyphColor: '#ffffff' };

  const badgeText =
    location.division && location.division !== 'ALL'
      ? location.division
      : location.userName.slice(0, 3).toUpperCase();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: location.lat, lng: location.lng }}
        title={`${location.userName} (${location.role} · GN ${location.division})`}
        onClick={onSelect}
      >
        <Pin
          background={pinColors.background}
          borderColor={pinColors.borderColor}
          glyphColor={pinColors.glyphColor}
          scale={isSelected ? 1.3 : 1.08}
        >
          <span className="text-[10px] font-black tracking-tight">{badgeText}</span>
        </Pin>
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose} maxWidth={290}>
          <div className="text-slate-900 space-y-1.5 p-0.5 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
              <div>
                <div className="font-black text-slate-950 text-sm leading-tight">
                  {location.userName}
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  ID: {location.userId} · {location.role}
                </div>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  tier === 'live'
                    ? 'bg-emerald-100 text-emerald-900'
                    : tier === 'recent'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tier === 'live'
                  ? isTa ? 'நேரலை' : 'Live'
                  : tier === 'recent'
                  ? isTa ? 'சமீபம்' : 'Recent'
                  : isTa ? 'பழையது' : 'Offline'}
              </span>
            </div>

            <div className="space-y-0.5 text-[11px]">
              <div>
                <strong>{isTa ? 'GN பிரிவு:' : 'GN Division:'}</strong>{' '}
                <span className="font-mono font-bold text-emerald-900">
                  {location.division}
                  {divisionName ? ` - ${divisionName}` : ''}
                </span>
              </div>
              <div>
                <strong>{isTa ? 'ஆயத்தொலைவுகள்:' : 'Coordinates:'}</strong>{' '}
                <span className="font-mono">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </span>
              </div>
              {typeof location.accuracy === 'number' && (
                <div>
                  <strong>{isTa ? 'துல்லியம்:' : 'Accuracy:'}</strong> ±{Math.round(location.accuracy)}m
                </div>
              )}
              <div>
                <strong>{isTa ? 'நிறுவப்பட்ட ஆப்:' : 'App Mode:'}</strong>{' '}
                {location.isInstalledPwa
                  ? isTa ? 'PWA மொபைல் ஆப் நிறுவப்பட்டது' : 'Installed PWA App'
                  : location.isMobileFieldMode
                  ? isTa ? 'மொபைல் களப் பயன்முறை' : 'Mobile Field Mode'
                  : isTa ? 'வலை உலாவி' : 'Web Browser'}
              </div>
              <div className="text-slate-500">
                <strong>{isTa ? 'கடைசிப் பதிவு:' : 'Last Seen:'}</strong>{' '}
                {new Date(location.updatedAt).toLocaleString()} ({formatRelativeTime(location.updatedAt, isTa)})
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const FieldOfficersLocationMapView: React.FC<FieldOfficersLocationMapViewProps> = ({
  currentUser,
  divisions,
  lang,
  selectedDsDivisionId,
}) => {
  const isTa = lang !== 'en';
  const [locations, setLocations] = useState<FieldOfficerLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'PWA'>('ALL');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const targetDsId = selectedDsDivisionId && selectedDsDivisionId !== 'ALL'
    ? selectedDsDivisionId
    : (currentUser.dsDivisionId || 'DS_VAHARAI');

  const refreshLocations = useCallback(async () => {
    setIsLoading(true);
    const list = await fetchFieldOfficerLocations(targetDsId);
    setLocations(list);
    setLastRefreshedAt(new Date().toISOString());
    setIsLoading(false);
  }, [targetDsId]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void refreshLocations();
    const timer = setInterval(() => {
      void refreshLocations();
    }, 15000);
    return () => clearInterval(timer);
  }, [isSuperAdmin, refreshLocations]);

  const handleRemoveDeviceLocation = async (key: string) => {
    try {
      const res = await fetch(`/api/field-locations?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLocations((prev) => prev.filter((item) => getLocKey(item) !== key));
        if (selectedKey === key) setSelectedKey(null);
      }
    } catch {
      // ignore
    }
  };

  const divisionMap = useMemo(() => {
    const mapObj = new globalThis.Map<string, GNDivision>();
    divisions.forEach((d) => {
      mapObj.set(d.code.trim().toUpperCase(), d);
    });
    return mapObj;
  }, [divisions]);

  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return locations.filter((loc) => {
      const tier = getRecencyTier(loc.updatedAt);
      if (statusFilter === 'LIVE' && tier !== 'live') return false;
      if (statusFilter === 'PWA' && !loc.isInstalledPwa && !loc.isMobileFieldMode) return false;
      if (q) {
        const hay = `${loc.userName} ${loc.userId} ${loc.division} ${loc.role}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [locations, searchQuery, statusFilter]);

  const selectedLocation = useMemo(
    () => filteredLocations.find((l) => getLocKey(l) === selectedKey) || null,
    [filteredLocations, selectedKey]
  );

  const liveCount = useMemo(
    () => locations.filter((l) => getRecencyTier(l.updatedAt) === 'live').length,
    [locations]
  );
  const pwaCount = useMemo(
    () => locations.filter((l) => l.isInstalledPwa || l.isMobileFieldMode).length,
    [locations]
  );

  if (!isSuperAdmin) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-8 space-y-2">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-base font-black text-slate-900">
          {isTa ? 'அணுகல் மறுக்கப்பட்டது' : 'Access Restricted'}
        </h2>
        <p className="text-xs text-slate-600">
          {isTa
            ? 'நிறுவப்பட்ட மொபைல் ஆப் பயனர்களின் நேரடி இருப்பிட வரைபடத்தை சுப்பர் அட்மின் (Super Admin) மட்டுமே பார்க்க முடியும்.'
            : 'Only Super Admin can view installed mobile app users on the live map.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                {isTa
                  ? 'மொபைல் ஆப் கள அலுவலர்களின் நேரடி இருப்பிட வரைபடம்'
                  : 'Installed Mobile App Live Location Map'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black inline-flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>{isTa ? `${liveCount} நேரலை` : `${liveCount} Live`}</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {isTa
                ? 'இந்த ஆப் நிறுவப்பட்ட தொலைபேசிகளின் தற்போதைய GPS இருப்பிடம், கிராம உத்தியோகத்தர் பிரிவு & கடைசிப் புதுப்பிப்பு நேரம்.'
                : 'Real-time GPS coordinates of phones with this app installed, showing GN division, role, and last sync time.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFitTrigger((n) => n + 1)}
            disabled={filteredLocations.length === 0}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-800 flex items-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isTa ? 'அனைத்தையும் காட்டு' : 'Fit All Pins'}</span>
          </button>

          <button
            type="button"
            onClick={() => void refreshLocations()}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isTa ? 'புதுப்பி' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-slate-500">
            {isTa ? 'மொத்த பதிவுக் கருவிகள்' : 'Tracked Devices'}
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-0.5">{locations.length}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-emerald-800">
            {isTa ? 'தற்போது நேரலை (<5 நிமிடம்)' : 'Live Now (<5m)'}
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950 mt-0.5">{liveCount}</div>
        </div>
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-sky-800">
            {isTa ? 'நிறுவப்பட்ட மொபைல் ஆப் (PWA)' : 'Installed Mobile Apps'}
          </div>
          <div className="text-2xl font-black font-mono text-sky-950 mt-0.5">{pwaCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-slate-500">
            {isTa ? 'கடைசி சோதனை' : 'Last Polled'}
          </div>
          <div className="text-xs font-bold font-mono text-slate-800 mt-1.5">
            {lastRefreshedAt ? new Date(lastRefreshedAt).toLocaleTimeString() : '—'}
          </div>
        </div>
      </div>

      {/* Main Split View: Officer List + Google Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Panel: Tracked Devices List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden h-[420px] lg:h-[620px]">
          <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTa ? 'பெயர், GN பிரிவு, பயனர் ID தேடுக...' : 'Search officer, GN division, ID...'}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`py-1.5 rounded-lg border ${
                  statusFilter === 'ALL'
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {isTa ? `அனைத்தும் (${locations.length})` : `All (${locations.length})`}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('LIVE')}
                className={`py-1.5 rounded-lg border ${
                  statusFilter === 'LIVE'
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {isTa ? `நேரலை (${liveCount})` : `Live (${liveCount})`}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PWA')}
                className={`py-1.5 rounded-lg border ${
                  statusFilter === 'PWA'
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {isTa ? `மொபைல் (${pwaCount})` : `App (${pwaCount})`}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredLocations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Smartphone className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">
                  {isTa
                    ? 'இதுவரை எந்தவொரு தொலைபேசி GPS இருப்பிடமும் பதிவாகவில்லை. கிராம உத்தியோகத்தர் மொபைல் அப்பில் உள்நுழைந்து Location அனுமதியை வழங்கியதும் இங்கு நேரலையில் தோன்றும்.'
                    : 'No device GPS locations reported yet. Locations appear here live once officers sign in on installed mobile apps and allow location access.'}
                </p>
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const locKey = getLocKey(loc);
                const tier = getRecencyTier(loc.updatedAt);
                const isSelected = locKey === selectedKey;
                const divInfo = divisionMap.get(loc.division.trim().toUpperCase());

                return (
                  <div
                    key={locKey}
                    onClick={() => setSelectedKey(locKey)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-700' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              tier === 'live'
                                ? 'bg-emerald-500 animate-pulse'
                                : tier === 'recent'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="text-xs font-black text-slate-900 truncate">
                            {loc.userName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-950 font-mono font-bold">
                            GN {loc.division}
                            {divInfo ? ` · ${isTa ? divInfo.nameTa : divInfo.nameEn}` : ''}
                          </span>
                          {(loc.isInstalledPwa || loc.isMobileFieldMode) && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 font-bold inline-flex items-center gap-0.5">
                              <Smartphone className="w-2.5 h-2.5" />
                              <span>{loc.isInstalledPwa ? 'PWA' : 'Mobile'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRemoveDeviceLocation(locKey);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title={isTa ? 'பட்டியலிலிருந்து நீக்கு' : 'Remove stale entry'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span className="inline-flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5 text-emerald-700" />
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-sans">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(loc.updatedAt, isTa)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Google Map Canvas with Explicit Height */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="w-full h-[520px] lg:h-[620px] relative bg-slate-100">
            {!GOOGLE_MAPS_API_KEY ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                <MapPin className="w-10 h-10 text-amber-500" />
                <p className="text-sm font-bold text-slate-800">
                  {isTa
                    ? 'Google Maps API Key இன்னும் அமைக்கப்படவில்லை (VITE_GOOGLE_MAPS_API_KEY).'
                    : 'Google Maps API Key is not configured (VITE_GOOGLE_MAPS_API_KEY).'}
                </p>
                <p className="text-xs text-slate-500 max-w-md">
                  {isTa
                    ? 'அமைப்புகள் முடிந்ததும் சேவையகத்தை மீளத் தொடங்கவும். ஆயத்தொலைவுகள் இடது பக்கப் பட்டியலில் தொடர்ந்து காட்டப்படும்.'
                    : 'Restart the dev server once configured. Coordinates remain visible in the officer list on the left.'}
                </p>
              </div>
            ) : (
              <APIProvider
                apiKey={GOOGLE_MAPS_API_KEY}
                libraries={['marker']}
                language={isTa ? 'ta' : 'en'}
                region="LK"
              >
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  defaultCenter={VAHARAI_CENTER}
                  defaultZoom={11}
                  gestureHandling="greedy"
                  className="w-full h-full"
                >
                  <MapViewportController
                    selectedLocation={selectedLocation}
                    locations={filteredLocations}
                    fitTrigger={fitTrigger}
                  />

                  {filteredLocations.map((loc) => {
                    const locKey = getLocKey(loc);
                    return (
                      <OfficerMarkerWithInfo
                        key={locKey}
                        location={loc}
                        isSelected={locKey === selectedKey}
                        isTa={isTa}
                        divisionName={
                          divisionMap.get(loc.division.trim().toUpperCase())?.[
                            isTa ? 'nameTa' : 'nameEn'
                          ]
                        }
                        onSelect={() => setSelectedKey(locKey)}
                        onClose={() => setSelectedKey(null)}
                      />
                    );
                  })}
                </GoogleMap>
              </APIProvider>
            )}
          </div>

          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
            <span>
              {isTa
                ? 'GPS இருப்பிடப் பகிர்வு அலுவலரின் அனுமதியுடன் இயங்குகிறது (எப்போது வேண்டுமானாலும் மொபைல் அப்பில் நிறுத்தலாம்).'
                : 'GPS sharing operates with explicit officer permission and can be paused anytime in the Mobile App.'}
            </span>
            <span className="font-mono">
              🟢 Live (&lt;5m) · 🟠 Recent (&lt;1h) · ⚫ Older
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
