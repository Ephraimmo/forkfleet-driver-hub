import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, Bell, Bike, LifeBuoy, Package, Star, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuthDriver } from "@/hooks/useAuthDriver";
import { useDriverOrders } from "@/hooks/useDriverOrders";
import { useDriverStats } from "@/hooks/useDriverStats";
import { setDriverOnline } from "@/lib/repo";
import { formatKm, formatMoney } from "@/lib/geo";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DeliveryCard } from "@/components/driver/DeliveryCard";
import { EmptyState } from "@/components/driver/EmptyState";
import { useAppStore } from "@/stores/appStore";

export const Route = createFileRoute("/_driver/home")({
  head: () => ({
    meta: [
      { title: "Driver dashboard — ForkFleet Driver" },
      { name: "description", content: "Go online, see today's deliveries, earnings and your active delivery at a glance." },
      { property: "og:title", content: "Driver dashboard — ForkFleet Driver" },
      { property: "og:description", content: "Your shift, deliveries and earnings in one place." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { driver, activeAssignments } = useAuthDriver();
  const { active, available, loading } = useDriverOrders();
  const stats = useDriverStats();
  const position = useAppStore((s) => s.position);
  const positionError = useAppStore((s) => s.positionError);
  const [toggling, setToggling] = useState(false);

  const online = driver?.status === "online";
  const duty = active.length > 0 ? "BUSY" : online ? "ONLINE" : "OFFLINE";

  const restaurantsWorked = useMemo(
    () => new Set(activeAssignments.map((a) => a.restaurant_id)).size,
    [activeAssignments],
  );

  const toggle = async (value: boolean) => {
    if (!driver) return;
    setToggling(true);
    try {
      await setDriverOnline(driver.id, value);
      toast.success(value ? "You're online — assignments enabled" : "You're offline");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setToggling(false);
    }
  };

  if (!driver) return null;

  return (
    <div className="space-y-4">
      <header className="surface-card space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="font-display text-2xl font-bold">{driver.full_name}</h1>
            <p className="text-xs text-muted-foreground">
              {driver.vehicle_type} · {driver.vehicle_plate ?? "no plate"} · {restaurantsWorked}{" "}
              restaurant{restaurantsWorked === 1 ? "" : "s"}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                duty === "ONLINE"
                  ? "bg-success/15 text-success"
                  : duty === "BUSY"
                    ? "bg-warning/20 text-warning"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {duty}
            </span>
            <div className="mt-2 flex items-center justify-end gap-2">
              <span className="text-xs font-semibold">{online ? "Online" : "Offline"}</span>
              <Switch checked={online} disabled={toggling} onCheckedChange={toggle} />
            </div>
          </div>
        </div>

        {!driver.is_verified && (
          <div className="rounded-lg bg-warning/15 p-3 text-sm text-warning">
            Your account is not verified yet. Complete verification in your profile to receive
            deliveries.
          </div>
        )}
        {positionError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            GPS unavailable: {positionError}
          </div>
        )}
        {position && (
          <p className="text-xs text-muted-foreground">
            GPS locked · {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
          </p>
        )}
      </header>

      <section className="grid grid-cols-3 gap-2">
        <Tile label="Deliveries today" value={String(stats.todayCount)} icon={Package} />
        <Tile label="Earned today" value={formatMoney(stats.todayEarnings)} icon={Wallet} />
        <Tile label="Distance" value={formatKm(stats.todayDistanceKm)} icon={Activity} />
        <Tile label="Acceptance" value={`${stats.acceptanceRate}%`} icon={TrendingUp} />
        <Tile label="Completion" value={`${stats.completionRate}%`} icon={Bike} />
        <Tile label="Rating" value={(driver.rating ?? 0).toFixed(2)} icon={Star} />
      </section>

      {active.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Current delivery</h2>
          {active.map((o) => (
            <DeliveryCard key={o.id} order={o} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Available deliveries</h2>
          <Link to="/deliveries" className="text-sm font-semibold text-primary">
            See all
          </Link>
        </div>
        {loading ? (
          <div className="surface-card h-28 animate-pulse" />
        ) : !online ? (
          <EmptyState
            icon={Bike}
            title="You're offline"
            description="Go online to start receiving delivery offers from the restaurants and branches you're authorized for."
          />
        ) : available.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No deliveries available"
            description="Nothing is ready for pickup at your authorized branches right now. Offers appear here instantly."
          />
        ) : (
          available.slice(0, 2).map((o) => <DeliveryCard key={o.id} order={o} />)
        )}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="lg" className="h-14">
          <Link to="/notifications">
            <Bell className="mr-2 size-5" /> Notifications
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-14">
          <Link to="/support">
            <LifeBuoy className="mr-2 size-5" /> Get support
          </Link>
        </Button>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="stat-tile">
      <Icon className="mb-1 size-4 text-muted-foreground" />
      <p className="font-display text-xl font-bold leading-tight">{value}</p>
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}
