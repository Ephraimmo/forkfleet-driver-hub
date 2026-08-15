import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/appStore";
import { publishLiveLocation, publishDriverPosition } from "@/lib/repo";
import { haversineKm } from "@/lib/geo";
import { log, logError } from "@/lib/log";

/**
 * Real device GPS tracking with adaptive publish intervals.
 * - online + idle: low frequency (60s)
 * - active delivery: 15s
 * - arrived_at_customer / en_route close to customer: 7s high precision
 */
export function useLocationTracking(params: {
  enabled: boolean;
  driverId: string | null;
  activeOrderId: string | null;
  activeStatus?: string | null;
}) {
  const { enabled, driverId, activeOrderId, activeStatus } = params;
  const setPosition = useAppStore((s) => s.setPosition);
  const setPositionError = useAppStore((s) => s.setPositionError);
  const lastPublish = useRef(0);
  const lastPoint = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!enabled || !driverId) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setPositionError("Geolocation is not available on this device.");
      return;
    }

    const interval = () => {
      if (!activeOrderId) return 60_000;
      if (activeStatus === "arrived_at_customer" || activeStatus === "en_route") return 7_000;
      return 15_000;
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const point = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          accuracy: pos.coords.accuracy,
        };
        setPosition(point);
        setPositionError(null);

        const now = Date.now();
        const movedKm = lastPoint.current ? haversineKm(lastPoint.current, point) : Infinity;
        const dueByTime = now - lastPublish.current >= interval();
        const dueByMovement = movedKm > 0.05;
        if (!dueByTime && !dueByMovement) return;

        lastPublish.current = now;
        lastPoint.current = point;
        log("LOCATION", `Updated: ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`);

        publishDriverPosition(driverId, point.latitude, point.longitude).catch((e) =>
          logError("LOCATION", "driver position publish failed", e),
        );
        if (activeOrderId) {
          publishLiveLocation(activeOrderId, driverId, {
            latitude: point.latitude,
            longitude: point.longitude,
            heading: point.heading ?? null,
            speed: point.speed ?? null,
            updated_at: new Date().toISOString(),
          }).catch((e) => logError("LOCATION", "live location publish failed", e));
        }
      },
      (err) => {
        setPositionError(err.message);
        logError("LOCATION", "watchPosition error", err);
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, driverId, activeOrderId, activeStatus, setPosition, setPositionError]);
}
