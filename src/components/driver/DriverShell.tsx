import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Package, Wallet, Bell, User, WifiOff, Navigation, CloudUpload } from "lucide-react";
import { useAuthDriver } from "@/hooks/useAuthDriver";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useDriverOrders } from "@/hooks/useDriverOrders";
import { useAppStore } from "@/stores/appStore";
import { onQueueChange, queueSize, flushQueue } from "@/lib/offlineQueue";
import { subscribeNotifications } from "@/lib/repo";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/deliveries", label: "Deliveries", icon: Package },
  { to: "/earnings", label: "Earnings", icon: Wallet },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function DriverShell({ children }: { children: ReactNode }) {
  const { ready, user, driver, profileMissing } = useAuthDriver();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const connected = useAppStore((s) => s.connected);
  const online = driver?.status === "online";
  const { active } = useDriverOrders();
  const [pending, setPending] = useState(0);
  const [unread, setUnread] = useState(0);

  useConnectivity();
  useLocationTracking({
    enabled: !!driver && (online || active.length > 0),
    driverId: driver?.id ?? null,
    activeOrderId: active[0]?.id ?? null,
    activeStatus: active[0]?.driverStatus ?? null,
  });

  useEffect(() => {
    setPending(queueSize());
    const unsub = onQueueChange(setPending);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!driver?.id) return;
    const unsub = subscribeNotifications(driver.id, (list) =>
      setUnread(list.filter((n) => !n.read).length),
    );
    return () => unsub();
  }, [driver?.id]);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", replace: true });
  }, [ready, user, navigate]);

  if (!ready || (!driver && !profileMissing)) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (profileMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="surface-card max-w-md space-y-3 p-6 text-center">
          <h1 className="text-xl font-bold">No driver profile linked</h1>
          <p className="text-sm text-muted-foreground">
            Your account signed in successfully, but no ForkFleet driver profile matches it. Create
            your profile now so it appears in the Management Console, or ask operations to link an
            existing driver record.
          </p>
          <Button
            className="w-full"
            disabled={creatingProfile}
            onClick={async () => {
              if (!user) return;
              setCreatingProfile(true);
              try {
                await createMissingProfile();
                toast.success("Driver profile created");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setCreatingProfile(false);
              }
            }}
          >
            {creatingProfile && <Loader2 className="mr-2 size-4 animate-spin" />} Create my driver
            profile
          </Button>
          <Link to="/login" className="block text-sm font-semibold text-primary underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }


  const activeDelivery = active[0];

  return (
    <div className="min-h-screen bg-background pb-28">
      {!connected && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground">
          <WifiOff className="size-4" /> You&apos;re offline — updates will sync automatically
        </div>
      )}
      {pending > 0 && (
        <button
          onClick={() => void flushQueue()}
          className="flex w-full items-center justify-center gap-2 bg-warning px-3 py-2 text-sm font-semibold text-warning-foreground"
        >
          <CloudUpload className="size-4" /> {pending} pending update{pending > 1 ? "s" : ""} — tap to sync
        </button>
      )}

      <main className="mx-auto w-full max-w-2xl p-4">{children}</main>

      {activeDelivery && !pathname.startsWith("/delivery/") && (
        <Link
          to="/delivery/$orderId"
          params={{ orderId: activeDelivery.id }}
          className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-elevate"
          style={{ width: "calc(100% - 2rem)" }}
        >
          <span className="flex items-center gap-2">
            <Navigation className="size-5" />
            <span className="text-left">
              <span className="block text-xs font-semibold uppercase opacity-80">Active delivery</span>
              <span className="block text-sm font-bold">
                {activeDelivery.orderNumber} · {activeDelivery.driverStatus.replace(/_/g, " ")}
              </span>
            </span>
          </span>
          <span className="text-sm font-bold">Open →</span>
        </Link>
      )}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-2xl">
          {NAV.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-6" />
                {label}
                {to === "/notifications" && unread > 0 && (
                  <span className="absolute right-1/4 top-2 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
