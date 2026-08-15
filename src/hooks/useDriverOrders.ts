import { useEffect, useMemo, useState } from "react";
import { useAuthDriver } from "./useAuthDriver";
import { subscribeOrders, subscribeRestaurants, orderBranchId, orderRestaurantId, matchesActiveAssignment } from "@/lib/repo";
import { buildOrderViewModel, ACTIVE_STATUSES } from "@/lib/viewModel";
import type { Order, Restaurant, DriverOrderViewModel } from "@/types/forkfleet";
import { useAppStore } from "@/stores/appStore";

const OFFERABLE_ORDER_STATUSES = ["ready", "preparing", "accepted", "pending", "awaiting_driver", "ready_for_pickup"];

export function useDriverOrders() {
  const { driver, activeAssignments } = useAuthDriver();
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<Record<string, Restaurant>>({});
  const [loading, setLoading] = useState(true);
  const setActiveOrderId = useAppStore((s) => s.setActiveOrderId);

  useEffect(() => {
    const unsubOrders = subscribeOrders((list) => {
      setOrders(list);
      setLoading(false);
    });
    const unsubRestaurants = subscribeRestaurants(setRestaurants);
    return () => {
      unsubOrders();
      unsubRestaurants();
    };
  }, []);

  const models = useMemo(() => {
    if (!driver) return [] as DriverOrderViewModel[];
    return orders.map((o) =>
      buildOrderViewModel(o, { restaurant: restaurants[orderRestaurantId(o) ?? ""] ?? null }),
    );
  }, [orders, restaurants, driver]);

  const mine = useMemo(
    () => (driver ? models.filter((m) => m.driverId === driver.id) : []),
    [models, driver],
  );

  const active = useMemo(
    () => mine.filter((m) => ACTIVE_STATUSES.includes(m.driverStatus) && m.orderStatus !== "cancelled"),
    [mine],
  );

  const available = useMemo(() => {
    if (!driver) return [];
    return models.filter((m) => {
      const o = m.raw;
      if (o.driver_id) return false;
      if (!OFFERABLE_ORDER_STATUSES.includes(String(o.status))) return false;
      if (o.order_type && o.order_type !== "delivery") return false;
      return matchesActiveAssignment(
        activeAssignments,
        driver.id,
        orderRestaurantId(o),
        orderBranchId(o),
      );
    });
  }, [models, driver, activeAssignments]);

  const history = useMemo(
    () =>
      mine
        .filter((m) => ["delivered", "cancelled", "failed", "rejected"].includes(String(m.orderStatus)) || m.driverStatus === "delivered")
        .sort((a, b) => String(b.raw.updated_at ?? "").localeCompare(String(a.raw.updated_at ?? ""))),
    [mine],
  );

  useEffect(() => {
    setActiveOrderId(active[0]?.id ?? null);
  }, [active, setActiveOrderId]);

  return { loading, models, mine, active, available, history, restaurants };
}
