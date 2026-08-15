import { useCallback } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/appStore";
import { useAuthDriver } from "./useAuthDriver";
import {
  enqueue,
  newRequestId,
  runMutation,
  type MutationName,
  type QueuedMutation,
} from "@/lib/offlineQueue";
import type { Driver, Order, ProofOfDelivery } from "@/types/forkfleet";
import { logError } from "@/lib/log";

export function useDeliveryActions() {
  const { driver } = useAuthDriver();
  const position = useAppStore((s) => s.position);
  const connected = useAppStore((s) => s.connected);

  const perform = useCallback(
    async (
      name: MutationName,
      order: Order,
      extra?: { reason?: string; code?: string; proof?: ProofOfDelivery },
    ) => {
      if (!driver) throw new Error("No driver session.");
      const clientRequestId = newRequestId();
      const item: QueuedMutation = {
        id: `${order.id}__${name}__${clientRequestId}`,
        name,
        ctx: {
          driverId: driver.id,
          order,
          location: position ? { latitude: position.latitude, longitude: position.longitude } : null,
          clientRequestId,
        },
        extra: { driver: driver as Driver, ...extra },
        queued_at: new Date().toISOString(),
      };

      if (!connected) {
        enqueue(item);
        toast.info("You're offline — action queued and will sync automatically.");
        return;
      }

      try {
        await runMutation(item);
      } catch (e) {
        const message = (e as Error).message || "Action failed";
        const isNetwork = /network|offline|unavailable|timeout/i.test(message);
        if (isNetwork) {
          enqueue(item);
          toast.info("Connection lost — action queued for sync.");
          return;
        }
        logError("ORDER", `${name} failed`, e);
        throw e;
      }
    },
    [driver, position, connected],
  );

  return { perform };
}
