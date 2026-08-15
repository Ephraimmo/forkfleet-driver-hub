import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapMarker {
  latitude: number;
  longitude: number;
  label: string;
  kind: "driver" | "pickup" | "dropoff";
}

const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function DeliveryMap({ markers, className }: { markers: MapMarker[]; className?: string }) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MlMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);

  useEffect(() => {
    if (!container.current || map.current) return;
    map.current = new maplibregl.Map({
      container: container.current,
      style: STYLE,
      center: [markers[0]?.longitude ?? 28.0473, markers[0]?.latitude ?? -26.2041],
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.current?.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markerRefs.current.forEach((mk) => mk.remove());
    markerRefs.current = [];

    const valid = markers.filter((mk) => isFinite(mk.latitude) && isFinite(mk.longitude));
    valid.forEach((mk) => {
      const el = document.createElement("div");
      el.className = [
        "flex items-center justify-center rounded-full border-2 text-[10px] font-bold uppercase",
        "size-7",
        mk.kind === "driver"
          ? "bg-primary text-primary-foreground border-primary"
          : mk.kind === "pickup"
            ? "bg-warning text-warning-foreground border-warning"
            : "bg-success text-success-foreground border-success",
      ].join(" ");
      el.textContent = mk.kind === "driver" ? "•" : mk.kind === "pickup" ? "P" : "D";
      el.title = mk.label;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([mk.longitude, mk.latitude])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText(mk.label))
        .addTo(m);
      markerRefs.current.push(marker);
    });

    if (valid.length === 1) {
      m.easeTo({ center: [valid[0]!.longitude, valid[0]!.latitude], zoom: 14 });
    } else if (valid.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      valid.forEach((mk) => bounds.extend([mk.longitude, mk.latitude]));
      m.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 600 });
    }
  }, [markers]);

  return <div ref={container} className={className} />;
}
