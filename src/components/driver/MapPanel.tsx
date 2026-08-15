import { Suspense, lazy } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapMarker } from "./DeliveryMap";

const DeliveryMap = lazy(() => import("./DeliveryMap"));

export function MapPanel({ markers, className = "h-56 w-full rounded-xl overflow-hidden" }: { markers: MapMarker[]; className?: string }) {
  const fallback = <Skeleton className={className} />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <DeliveryMap markers={markers} className={className} />
      </Suspense>
    </ClientOnly>
  );
}

export type { MapMarker };
