import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAuthDriver } from "@/hooks/useAuthDriver";
import { subscribeNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/repo";
import { EmptyState } from "@/components/driver/EmptyState";
import { Button } from "@/components/ui/button";
import type { DriverNotification } from "@/types/forkfleet";

export const Route = createFileRoute("/_driver/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — ForkFleet Driver" },
      { name: "description", content: "Realtime delivery assignments, order changes, payment and support alerts." },
      { property: "og:title", content: "Notifications — ForkFleet Driver" },
      { property: "og:description", content: "Never miss a delivery assignment or dispatch update." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { driver } = useAuthDriver();
  const [items, setItems] = useState<DriverNotification[]>([]);

  useEffect(() => {
    if (!driver?.id) return;
    const unsub = subscribeNotifications(driver.id, setItems);
    return () => unsub();
  }, [driver?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Notifications</h1>
        {items.some((n) => !n.read) && driver && (
          <Button
            variant="outline"
            onClick={() => markAllNotificationsRead(driver.id, items.filter((n) => !n.read).map((n) => n.id))}
          >
            Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="Assignment offers and dispatch messages will appear here in real time." />
      ) : (
        items.map((n) => (
          <button
            key={n.id}
            onClick={() => driver && markNotificationRead(driver.id, n.id)}
            className={`surface-card w-full p-4 text-left ${n.read ? "opacity-70" : "border-primary"}`}
          >
            <p className="font-semibold">{n.title}</p>
            <p className="text-sm text-muted-foreground">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
          </button>
        ))
      )}
    </div>
  );
}
