import { useState, useEffect, useCallback } from "react";
import { detectCountryFromCoords, type CountryInfo } from "@/lib/countries";

export interface UserLocation {
  latitude: number;
  longitude: number;
  country?: CountryInfo;
}

const LOCATION_CACHE_KEY = "trustpay_user_location";

const getCachedLocation = (): UserLocation | null => {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.latitude && parsed?.longitude) return parsed;
    return null;
  } catch {
    return null;
  }
};

const cacheLocation = (loc: UserLocation) => {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(loc));
  } catch {
    // no-op
  }
};

/**
 * Haversine distance in km between two lat/lng points
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(getCachedLocation());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try Telegram LocationManager first
      const tg = (window as any).Telegram?.WebApp;
      const lm = tg?.LocationManager;

      if (lm) {
        // Initialize LocationManager
        await new Promise<void>((resolve, reject) => {
          lm.init(() => {
            if (lm.isInited) {
              resolve();
            } else {
              reject(new Error("LocationManager init failed"));
            }
          });
        });

        if (!lm.isLocationAvailable) {
          // Location not available, fall through to browser API
          throw new Error("Location not available via Telegram");
        }

        // Request location
        const loc = await new Promise<UserLocation>((resolve, reject) => {
          lm.getLocation((data: any) => {
            if (data?.latitude && data?.longitude) {
              const country = detectCountryFromCoords(data.latitude, data.longitude);
              resolve({ latitude: data.latitude, longitude: data.longitude, country });
            } else {
              reject(new Error("Failed to get location from Telegram"));
            }
          });
        });

        setLocation(loc);
        cacheLocation(loc);
        setLoading(false);
        return loc;
      }
    } catch {
      // Fall through to browser geolocation
    }

    // Fallback: browser Geolocation API
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 min cache
        });
      });

      const country = detectCountryFromCoords(pos.coords.latitude, pos.coords.longitude);
      const loc: UserLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        country,
      };
      setLocation(loc);
      cacheLocation(loc);
      setLoading(false);
      return loc;
    } catch (err: any) {
      setError("Location unavailable");
      setLoading(false);
      return null;
    }
  }, []);

  // Auto-request on mount if not cached
  useEffect(() => {
    if (!location) {
      requestLocation();
    }
  }, []);

  return { location, loading, error, requestLocation };
}
