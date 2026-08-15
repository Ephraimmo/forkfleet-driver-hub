import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { subscribe } from "@/lib/repo";
import { flushQueue, queueSize } from "@/lib/offlineQueue";
import { log } from "@/lib/log";

export function useConnectivity() {
  const setConnected = useAppStore((s) => s.setConnected);

  useEffect(() => {
    const unsub = subscribe<boolean>(".info/connected", (v) => {
      const connected = v === true;
      setConnected(connected);
      log("SYNC", connected ? "Firebase connected" : "Firebase disconnected");
      if (connected && queueSize() > 0) void flushQueue();
    });

    const onOnline = () => {
      setConnected(true);
      void flushQueue();
    };
    const onOffline = () => setConnected(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setConnected]);
}
