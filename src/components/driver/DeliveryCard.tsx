import { Link } from "@tanstack/react-router";
import { Bike, MapPin, Package, Store, Timer } from "lucide-react";
import type { DriverOrderViewModel } from "@/types/forkfleet";
import { formatKm, formatMoney, haversineKm } from "@/lib/geo";
import { useAppStore } from "@/stores/appStore";
import { StatusPill } from "./StatusPill";
import { Button } from "@/components/ui/button";

export function DeliveryCard({
  order,
  onAccept,
  onReject,
  busy,
}: {
  order: DriverOrderViewModel;
  onAccept?: () => void;
  onReject?: () => void;
  busy?: boolean;
}) {
  const position = useAppStore((s) => s.position);
  const pickupPoint =
    order.branch.latitude && order.branch.longitude
      ? { latitude: order.branch.latitude, longitude: order.branch.longitude }
      : null;
  const pickupKm = position && pickupPoint ? haversineKm(position, pickupPoint) : null;
  const earnings = order.deliveryFee + order.tip;

  return (
    <article className="surface-card space-y-3 p-4 shadow-elevate">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl font-bold leading-tight">{order.orderNumber}</p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Store className="size-4" /> {order.restaurant.name} · {order.branch.name}
          </p>
        </div>
        <StatusPill status={order.driverStatus} />
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="stat-tile">
          <p className="text-xs text-muted-foreground">Pickup</p>
          <p className="font-bold">{formatKm(pickupKm)}</p>
        </div>
        <div className="stat-tile">
          <p className="text-xs text-muted-foreground">Delivery</p>
          <p className="font-bold">{formatKm(order.distanceKm)}</p>
        </div>
        <div className="stat-tile">
          <p className="text-xs text-muted-foreground">Earnings</p>
          <p className="font-bold text-primary">{formatMoney(earnings)}</p>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          {order.deliveryAddress.street ?? "—"}
          {order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ""}
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Package className="size-4 shrink-0" /> {order.items.length} item
          {order.items.length === 1 ? "" : "s"} · {order.paymentStatus}
        </p>
        {order.specialInstructions && (
          <p className="flex items-center gap-2 text-warning">
            <Timer className="size-4 shrink-0" /> {order.specialInstructions}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {onReject && (
          <Button variant="outline" size="lg" className="flex-1" disabled={busy} onClick={onReject}>
            Reject
          </Button>
        )}
        {onAccept && (
          <Button size="lg" className="flex-1 text-base font-bold" disabled={busy} onClick={onAccept}>
            Accept
          </Button>
        )}
        {!onAccept && (
          <Button asChild size="lg" className="flex-1 text-base font-bold">
            <Link to="/delivery/$orderId" params={{ orderId: order.id }}>
              <Bike className="mr-1 size-5" /> Open delivery
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
