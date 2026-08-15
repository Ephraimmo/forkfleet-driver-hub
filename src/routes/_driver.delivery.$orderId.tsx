import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Phone, MessageSquare, Navigation2, Store, User, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  subscribeOrder,
  subscribeOrderEvents,
  subscribeOrderChat,
  sendOrderMessage,
  loadRestaurant,
} from "@/lib/repo";
import { buildOrderViewModel, nextAction } from "@/lib/viewModel";
import { useDeliveryActions } from "@/hooks/useDeliveryActions";
import { useAuthDriver } from "@/hooks/useAuthDriver";
import { useAppStore } from "@/stores/appStore";
import { MapPanel, type MapMarker } from "@/components/driver/MapPanel";
import { StatusPill } from "@/components/driver/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKm, formatMoney, haversineKm, etaMinutes } from "@/lib/geo";
import type { DeliveryEvent, Order, ProofOfDelivery, Restaurant } from "@/types/forkfleet";

export const Route = createFileRoute("/_driver/delivery/$orderId")({
  head: () => ({
    meta: [
      { title: "Active delivery — ForkFleet Driver" },
      { name: "description", content: "Navigate, verify pickup, track live GPS and capture proof of delivery." },
      { property: "og:title", content: "Active delivery — ForkFleet Driver" },
      { property: "og:description", content: "Step-by-step delivery flow for ForkFleet drivers." },
    ],
  }),
  component: ActiveDelivery,
});

function ActiveDelivery() {
  const { orderId } = useParams({ from: "/_driver/delivery/$orderId" });
  const { driver } = useAuthDriver();
  const { perform } = useDeliveryActions();
  const position = useAppStore((s) => s.position);
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [messages, setMessages] = useState<{ id: string; sender: string; body: string; created_at: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const a = subscribeOrder(orderId, (o) => {
      setOrder(o);
      setLoaded(true);
    });
    const b = subscribeOrderEvents(orderId, setEvents);
    const c = subscribeOrderChat(orderId, setMessages);
    return () => {
      a();
      b();
      c();
    };
  }, [orderId]);

  useEffect(() => {
    const rid = order?.restaurant_id ?? order?.restaurantId;
    if (!rid) return;
    loadRestaurant(rid).then(setRestaurant).catch(() => undefined);
  }, [order?.restaurant_id, order?.restaurantId]);

  const vm = useMemo(
    () => (order ? buildOrderViewModel(order, { restaurant, events }) : null),
    [order, restaurant, events],
  );

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    if (position) list.push({ ...position, label: "You", kind: "driver" });
    if (vm?.branch.latitude && vm.branch.longitude)
      list.push({ latitude: vm.branch.latitude, longitude: vm.branch.longitude, label: `${vm.restaurant.name} · ${vm.branch.name}`, kind: "pickup" });
    if (vm?.deliveryAddress.latitude && vm.deliveryAddress.longitude)
      list.push({ latitude: vm.deliveryAddress.latitude, longitude: vm.deliveryAddress.longitude, label: "Customer", kind: "dropoff" });
    return list;
  }, [position, vm]);

  if (!loaded) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!vm) return <p className="surface-card p-6 text-center">This order no longer exists.</p>;
  if (driver && vm.driverId && vm.driverId !== driver.id)
    return <p className="surface-card p-6 text-center">This delivery is assigned to another driver.</p>;

  const target =
    vm.driverStatus === "picked_up" || vm.driverStatus === "en_route" || vm.driverStatus === "arrived_at_customer"
      ? vm.deliveryAddress
      : { latitude: vm.branch.latitude, longitude: vm.branch.longitude };
  const distance =
    position && target.latitude && target.longitude
      ? haversineKm(position, { latitude: target.latitude, longitude: target.longitude })
      : null;

  const step = nextAction(vm.driverStatus);

  const run = async (fn: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handlePrimary = async () => {
    if (!step || !order) return;
    switch (step.key) {
      case "arrive_restaurant":
        return run(() => perform("arrive_restaurant", order), "Arrival recorded");
      case "pickup":
        return run(async () => {
          await perform("verify_pickup", order, { code });
          await perform("pickup", order);
        }, "Order picked up");
      case "start":
        return run(() => perform("start", order), "Delivery started");
      case "arrive_customer":
        return run(() => perform("arrive_customer", order), "Arrival recorded");
      case "complete": {
        const expected = (order.delivery_pin ?? "") as string;
        if (expected && pin.trim() !== expected) {
          toast.error("Delivery PIN does not match.");
          return;
        }
        const proof: ProofOfDelivery = {
          method: expected ? "pin" : "confirmation",
          value: expected ? pin.trim() : "customer_confirmed",
          recorded_at: new Date().toISOString(),
          latitude: position?.latitude ?? null,
          longitude: position?.longitude ?? null,
        };
        return run(() => perform("complete", order, { proof }), "Delivery completed");
      }
    }
  };

  const navUrl =
    target.latitude && target.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=driving`
      : null;

  return (
    <div className="space-y-4">
      <header className="surface-card space-y-2 p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{vm.orderNumber}</h1>
          <StatusPill status={vm.driverStatus} />
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="size-4" /> {vm.restaurant.name} · {vm.branch.name}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="stat-tile">
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="font-bold">{formatKm(distance)}</p>
          </div>
          <div className="stat-tile">
            <p className="text-xs text-muted-foreground">ETA</p>
            <p className="font-bold">{distance ? `${etaMinutes(distance)} min` : "—"}</p>
          </div>
          <div className="stat-tile">
            <p className="text-xs text-muted-foreground">You earn</p>
            <p className="font-bold text-primary">{formatMoney(vm.deliveryFee + vm.tip)}</p>
          </div>
        </div>
      </header>

      <MapPanel markers={markers} className="h-64 w-full overflow-hidden rounded-xl" />

      <div className="grid grid-cols-3 gap-2">
        <Button asChild variant="outline" size="lg" className="h-14" disabled={!navUrl}>
          <a href={navUrl ?? "#"} target="_blank" rel="noreferrer">
            <Navigation2 className="size-5" />
          </a>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-14">
          <a href={`tel:${vm.customer.phone}`}>
            <Phone className="size-5" />
          </a>
        </Button>
        <Button variant="outline" size="lg" className="h-14" onClick={() => document.getElementById("chat")?.scrollIntoView({ behavior: "smooth" })}>
          <MessageSquare className="size-5" />
        </Button>
      </div>

      <section className="surface-card space-y-2 p-4">
        <h2 className="font-display text-lg font-bold">Customer</h2>
        <p className="flex items-center gap-2 text-sm">
          <User className="size-4" /> {vm.customer.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {vm.deliveryAddress.street}
          {vm.deliveryAddress.city ? `, ${vm.deliveryAddress.city}` : ""}
        </p>
        {vm.deliveryInstructions && <p className="text-sm text-warning">{vm.deliveryInstructions}</p>}
      </section>

      <section className="surface-card space-y-2 p-4">
        <h2 className="font-display text-lg font-bold">Order</h2>
        {vm.items.length === 0 && <p className="text-sm text-muted-foreground">No item detail on this order.</p>}
        {vm.items.map((item, i) => (
          <div key={item.id ?? i} className="flex justify-between text-sm">
            <span>
              {item.quantity ?? 1} × {item.name ?? "Item"}
            </span>
            <span>{formatMoney(item.price)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
          <span>Total ({vm.paymentStatus})</span>
          <span>{formatMoney(vm.total)}</span>
        </div>
        {vm.specialInstructions && <p className="text-sm text-warning">{vm.specialInstructions}</p>}
      </section>

      {step?.key === "pickup" && (
        <section className="surface-card space-y-2 p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <ShieldCheck className="size-5" /> Verify pickup
          </h2>
          <p className="text-sm text-muted-foreground">
            Confirm the order number and bags with the branch before collecting.
          </p>
          <Input
            className="h-12"
            placeholder="Pickup code (optional)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </section>
      )}

      {step?.key === "complete" && (
        <section className="surface-card space-y-2 p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <ShieldCheck className="size-5" /> Proof of delivery
          </h2>
          <Input
            className="h-12"
            placeholder={order?.delivery_pin ? "Enter customer PIN" : "Customer confirmation"}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </section>
      )}

      {step && (
        <Button size="lg" className="h-16 w-full text-lg font-bold" disabled={busy} onClick={handlePrimary}>
          {busy && <Loader2 className="mr-2 size-5 animate-spin" />}
          {step.label.toUpperCase()}
        </Button>
      )}

      <section className="surface-card space-y-2 p-4">
        <h2 className="font-display text-lg font-bold">Timeline</h2>
        {events.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.event_id} className="flex gap-3 text-sm">
              <span className="w-16 shrink-0 text-muted-foreground">
                {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="font-medium">{e.event_type.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="chat" className="surface-card space-y-2 p-4">
        <h2 className="font-display text-lg font-bold">Messages</h2>
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {messages.map((m) => (
            <p
              key={m.id}
              className={`rounded-lg px-3 py-2 text-sm ${m.sender === "driver" ? "bg-primary/15" : "bg-muted"}`}
            >
              {m.body}
            </p>
          ))}
          {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!draft.trim() || !driver) return;
            await sendOrderMessage(orderId, driver.id, draft.trim());
            setDraft("");
          }}
        >
          <Input className="h-12" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message customer" />
          <Button type="submit" size="lg">
            Send
          </Button>
        </form>
      </section>
    </div>
  );
}
