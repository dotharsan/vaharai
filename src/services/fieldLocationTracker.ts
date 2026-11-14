import { useState, useEffect, useCallback, useRef } from 'react';
import { FieldOfficerLocation, User } from '../types';

const DEVICE_ID_KEY = 'vaharai_ds_device_id_v1';
const GPS_OPT_OUT_KEY = 'vaharai_ds_gps_sharing_disabled_v1';
const LAST_COORDS_KEY = 'vaharai_ds_last_gps_fix_v1';

export type GpsShareStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'paused';

export const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') return 'server-device';
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const created = `DEV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return `DEV-SESSION-${Math.random().toString(36).slice(2, 8)}`;
  }
};

export const detectInstalledPwa = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as any)?.standalone === true
  );
};

export const isGpsSharingOptedOut = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(GPS_OPT_OUT_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setGpsSharingOptOut = (disabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    if (disabled) {
      localStorage.setItem(GPS_OPT_OUT_KEY, 'true');
    } else {
      localStorage.removeItem(GPS_OPT_OUT_KEY);
    }
  } catch {
    // ignore
  }
};

export const postFieldOfficerLocation = async (
  user: User,
  coords: { lat: number; lng: number; accuracy?: number; heading?: number | null; speed?: number | null },
  isMobileFieldMode: boolean
): Promise<boolean> => {
  const payload = {
    deviceId: getOrCreateDeviceId(),
    userId: user.id,
    userName: user.name,
    role: user.role,
    division: (user.division || 'ALL').trim().toUpperCase(),
    dsDivisionId: user.dsDivisionId || 'DS_VAHARAI',
    lat: coords.lat,
    lng: coords.lng,
    accuracy: coords.accuracy,
    heading: coords.heading ?? null,
    speed: coords.speed ?? null,
    isInstalledPwa: detectInstalledPwa(),
    isMobileFieldMode,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  try {
    localStorage.setItem(LAST_COORDS_KEY, JSON.stringify({ ...payload, cachedAt: new Date().toISOString() }));
  } catch {
    // ignore
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    const res = await fetch('/api/field-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const fetchFieldOfficerLocations = async (dsDivisionId?: string): Promise<FieldOfficerLocation[]> => {
  try {
    const query = dsDivisionId && dsDivisionId !== 'ALL' ? `?dsDivisionId=${encodeURIComponent(dsDivisionId)}` : '';
    const res = await fetch(`/api/field-locations${query}`);
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.locations) ? body.locations : [];
  } catch {
    return [];
  }
};

export const useFieldLocationReporter = (
  user: User | null,
  isMobileFieldMode: boolean
): {
  status: GpsShareStatus;
  lastCoords: { lat: number; lng: number; accuracy?: number; updatedAt: string } | null;
  isSharingEnabled: boolean;
  setSharingEnabled: (enabled: boolean) => void;
  refreshNow: () => void;
} => {
  const [isSharingEnabled, setIsSharingEnabled] = useState<boolean>(() => !isGpsSharingOptedOut());
  const [status, setStatus] = useState<GpsShareStatus>(() =>
    isGpsSharingOptedOut() ? 'paused' : 'idle'
  );
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number; accuracy?: number; updatedAt: string } | null>(null);

  const lastPostTimeRef = useRef<number>(0);

  const shouldTrack = Boolean(
    user &&
    user.role !== 'NORMAL' &&
    isSharingEnabled &&
    (detectInstalledPwa() || isMobileFieldMode || user.role === 'GRAMANIILATHARI')
  );

  const sendPosition = useCallback(
    async (pos: GeolocationPosition, force: boolean = false) => {
      if (!user) return;
      const now = Date.now();
      if (!force && now - lastPostTimeRef.current < 12000) {
        return;
      }
      lastPostTimeRef.current = now;
      const fix = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy || 0),
        heading: pos.coords.heading,
        speed: pos.coords.speed,
      };
      setLastCoords({ ...fix, updatedAt: new Date().toISOString() });
      setStatus('active');
      await postFieldOfficerLocation(user, fix, isMobileFieldMode);
    },
    [user, isMobileFieldMode]
  );

  const refreshNow = useCallback(() => {
    if (!user || !isSharingEnabled) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void sendPosition(pos, true);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, [user, isSharingEnabled, sendPosition]);

  const setSharingEnabled = useCallback((enabled: boolean) => {
    setGpsSharingOptOut(!enabled);
    setIsSharingEnabled(enabled);
    if (!enabled) {
      setStatus('paused');
    } else {
      setStatus('requesting');
    }
  }, []);

  useEffect(() => {
    if (!shouldTrack || !user) {
      if (!isSharingEnabled) setStatus('paused');
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    setStatus('requesting');

    // Immediate fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void sendPosition(pos, true);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        void sendPosition(pos, false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        }
      },
      { enableHighAccuracy: true, maximumAge: 20000, timeout: 20000 }
    );

    const handleOnline = () => {
      refreshNow();
    };
    window.addEventListener('online', handleOnline);

    const heartbeat = setInterval(() => {
      refreshNow();
    }, 60000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('online', handleOnline);
      clearInterval(heartbeat);
    };
  }, [shouldTrack, user?.id, isSharingEnabled, sendPosition, refreshNow]);

  return {
    status,
    lastCoords,
    isSharingEnabled,
    setSharingEnabled,
    refreshNow,
  };
};
