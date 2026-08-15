import {
  ref,
  get,
  set,
  update,
  onValue,
  push,
  serverTimestamp,
  onDisconnect,
  type Unsubscribe,
} from "firebase/database";
import { getDb } from "./firebase";
import { paths, assignmentKey } from "./paths";
import { log, logError } from "./log";
import type {
  Driver,
  DriverAssignment,
  Order,
  DeliveryEvent,
  DeliveryEventType,
  DeliveryStatus,
  DriverLocation,
  Earning,
  WalletTransaction,
  DriverNotification,
  SupportTicket,
  ProofOfDelivery,
  Restaurant,
} from "@/types/forkfleet";

export const nowIso = () => new Date().toISOString();

export function toArray<T>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean) as T[];
  return Object.values(val as Record<string, T>);
}

/* ------------------------------------------------------------------ reads */

export async function readOnce<T>(path: string): Promise<T | null> {
  const snap = await get(ref(getDb(), path));
  return snap.exists() ? (snap.val() as T) : null;
}

export function subscribe<T>(path: string, cb: (value: T | null) => void): Unsubscribe {
  return onValue(
    ref(getDb(), path),
    (snap) => cb(snap.exists() ? (snap.val() as T) : null),
    (err) => logError("FIREBASE", `subscribe failed: ${path}`, err),
  );
}

/* ---------------------------------------------------------------- drivers */

/** Resolve the EXISTING driver profile for an authenticated Firebase user. Never creates one. */
export async function findDriverForUser(uid: string, email: string | null): Promise<Driver | null> {
  const all = await readOnce<Record<string, Driver>>(paths.drivers);
  if (!all) return null;
  const list = Object.entries(all)
    .filter(([key]) => key !== "live")
    .map(([key, value]) => ({ ...(value as Driver), id: (value as Driver)?.id ?? key }))
    .filter((d) => d && typeof d === "object" && d.is_deleted !== true);

  const byUid = list.find((d) => d.user_id === uid);
  if (byUid) return byUid;
  if (email) {
    const byEmail = list.find((d) => (d.email || "").toLowerCase() === email.toLowerCase());
    if (byEmail) return byEmail;
  }
  return null;
}

export async function linkDriverToAuthUser(driverId: string, uid: string) {
  await update(ref(getDb(), paths.driver(driverId)), { user_id: uid, updated_at: nowIso() });
}

export async function updateDriverProfile(driverId: string, patch: Partial<Driver>) {
  await update(ref(getDb(), paths.driver(driverId)), { ...patch, updated_at: nowIso() });
}

export async function setDriverOnline(driverId: string, online: boolean) {
  const patch: Partial<Driver> = {
    status: online ? "online" : "offline",
    updated_at: nowIso(),
  };
  patch[online ? "last_online_at" : "last_offline_at"] = nowIso();
  await update(ref(getDb(), paths.driver(driverId)), patch);
  log("STATUS", `driver ${driverId} -> ${online ? "online" : "offline"}`);
}

/* ------------------------------------------------------------ assignments */

export async function loadDriverAssignments(driverId: string): Promise<DriverAssignment[]> {
  const all = await readOnce<Record<string, DriverAssignment>>(paths.assignments);
  if (!all) return [];
  return Object.entries(all)
    .map(([key, value]) => ({ ...(value as DriverAssignment), id: (value as DriverAssignment)?.id ?? key }))
    .filter((a) => a && a.driver_id === driverId);
}

export function subscribeDriverAssignments(driverId: string, cb: (a: DriverAssignment[]) => void) {
  return subscribe<Record<string, DriverAssignment>>(paths.assignments, (all) => {
    if (!all) return cb([]);
    const list = Object.entries(all)
      .map(([key, value]) => ({ ...(value as DriverAssignment), id: (value as DriverAssignment)?.id ?? key }))
      .filter((a) => a && a.driver_id === driverId);
    log("ASSIGNMENT", `${list.filter((a) => a.is_active).length} active assignments found`);
    cb(list);
  });
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  assignment?: DriverAssignment;
}

/**
 * Authoritative eligibility check. Requires an EXACT active
 * driver + restaurant + branch tuple in /driverAssignments.
 */
export async function isDriverEligible(
  driverId: string,
  restaurantId: string | undefined | null,
  branchId: string | undefined | null,
): Promise<EligibilityResult> {
  if (!driverId) return { eligible: false, reason: "Missing driver identity." };
  if (!restaurantId) return { eligible: false, reason: "Order has no authoritative restaurant_id." };
  if (!branchId) return { eligible: false, reason: "Order has no authoritative branch_id." };

  const driver = await readOnce<Driver>(paths.driver(driverId));
  if (!driver || driver.is_deleted === true || driver.is_active !== true) {
    return { eligible: false, reason: "Driver account is not active." };
  }

  const key = assignmentKey(driverId, restaurantId, branchId);
  const assignment = await readOnce<DriverAssignment>(paths.assignment(key));
  const ok =
    !!assignment &&
    assignment.driver_id === driverId &&
    assignment.restaurant_id === restaurantId &&
    assignment.branch_id === branchId &&
    assignment.is_active === true;

  log("ELIGIBILITY", `driver=${driverId} restaurant=${restaurantId} branch=${branchId} result=${ok ? "ELIGIBLE" : "REJECTED"}`);

  if (!ok) {
    return {
      eligible: false,
      reason: "This driver is not authorized for the order's restaurant and branch.",
    };
  }
  return { eligible: true, assignment: assignment! };
}

/** Local mirror of the same rule, for filtering lists without extra reads. */
export function matchesActiveAssignment(
  assignments: DriverAssignment[],
  driverId: string,
  restaurantId?: string | null,
  branchId?: string | null,
): boolean {
  if (!restaurantId || !branchId) return false;
  return assignments.some(
    (a) =>
      a.is_active === true &&
      a.driver_id === driverId &&
      a.restaurant_id === restaurantId &&
      a.branch_id === branchId,
  );
}

/* ----------------------------------------------------------------- orders */

export function orderRestaurantId(order: Order) {
  return order.restaurant_id ?? order.restaurantId ?? null;
}
export function orderBranchId(order: Order) {
  return order.branch_id ?? order.branchId ?? null;
}

export function subscribeOrders(cb: (orders: Order[]) => void) {
  return subscribe<Record<string, Order>>(paths.orders, (all) => {
    if (!all) return cb([]);
    cb(
      Object.entries(all)
        .filter(([, v]) => v && typeof v === "object")
        .map(([key, value]) => ({ ...(value as Order), id: (value as Order)?.id ?? key })),
    );
  });
}

export function subscribeOrder(orderId: string, cb: (order: Order | null) => void) {
  return subscribe<Order>(paths.order(orderId), (o) => cb(o ? { ...o, id: o.id ?? orderId } : null));
}

export function subscribeOrderEvents(orderId: string, cb: (events: DeliveryEvent[]) => void) {
  return subscribe<Record<string, DeliveryEvent>>(paths.orderEvents(orderId), (all) => {
    const list = toArray<DeliveryEvent>(all).sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
    cb(list);
  });
}

/* ------------------------------------------------------- delivery events */

export interface MutationContext {
  driverId: string;
  order: Order;
  location?: { latitude: number; longitude: number } | null;
  note?: string;
  metadata?: Record<string, unknown>;
  clientRequestId: string;
}

/** Deterministic idempotency key: orderId + driverId + eventType + clientRequestId. */
export function idempotencyKey(
  orderId: string,
  driverId: string,
  eventType: DeliveryEventType,
  clientRequestId: string,
) {
  return `${eventType}__${driverId}__${clientRequestId}`.replace(/[.#$/[\]]/g, "-");
}

async function writeEvent(eventType: DeliveryEventType, status: DeliveryStatus, ctx: MutationContext) {
  const orderId = ctx.order.id;
  const eventId = idempotencyKey(orderId, ctx.driverId, eventType, ctx.clientRequestId);
  const existing = await readOnce<DeliveryEvent>(paths.orderEvent(orderId, eventId));
  if (existing) {
    log("ORDER", `duplicate ${eventType} suppressed for ${orderId}`);
    return false;
  }
  const event: DeliveryEvent = {
    event_id: eventId,
    order_id: orderId,
    driver_id: ctx.driverId,
    restaurant_id: orderRestaurantId(ctx.order) ?? undefined,
    branch_id: orderBranchId(ctx.order) ?? undefined,
    event_type: eventType,
    status,
    timestamp: nowIso(),
    latitude: ctx.location?.latitude ?? null,
    longitude: ctx.location?.longitude ?? null,
    note: ctx.note ?? null,
    metadata: ctx.metadata ?? null,
  };
  await set(ref(getDb(), paths.orderEvent(orderId, eventId)), event);
  log("STATUS", `${ctx.order.order_number ?? orderId} -> ${status}`);
  return true;
}

async function guard(ctx: MutationContext) {
  const res = await isDriverEligible(
    ctx.driverId,
    orderRestaurantId(ctx.order),
    orderBranchId(ctx.order),
  );
  if (!res.eligible) throw new Error(res.reason ?? "Not authorized for this delivery.");
}

function assertOwnership(ctx: MutationContext) {
  if (ctx.order.driver_id && ctx.order.driver_id !== ctx.driverId) {
    throw new Error("This delivery belongs to another driver.");
  }
}

export async function acceptDelivery(ctx: MutationContext, driver: Driver) {
  await guard(ctx);
  const fresh = await readOnce<Order>(paths.order(ctx.order.id));
  if (fresh?.driver_id && fresh.driver_id !== ctx.driverId) {
    throw new Error("This delivery has already been taken by another driver.");
  }
  const created = await writeEvent("assignment_accepted", "accepted", ctx);
  if (!created) return;
  await update(ref(getDb(), paths.order(ctx.order.id)), {
    driver_id: ctx.driverId,
    driver_name: driver.full_name,
    driver_phone: driver.phone,
    driver_rating: driver.rating ?? null,
    driver_status: "accepted",
    status: "assigned",
    accepted_at: nowIso(),
    updated_at: nowIso(),
  });
}

export async function rejectDelivery(ctx: MutationContext, reason: string) {
  await guard(ctx);
  const created = await writeEvent("assignment_rejected", "rejected", { ...ctx, note: reason });
  if (!created) return;
  const patch: Record<string, unknown> = {
    rejected_at: nowIso(),
    rejection_reason: reason,
    updated_at: nowIso(),
  };
  if (ctx.order.driver_id === ctx.driverId) {
    patch["driver_id"] = null;
    patch["driver_name"] = null;
    patch["driver_phone"] = null;
    patch["driver_status"] = null;
    patch["status"] = "ready";
  }
  await update(ref(getDb(), paths.order(ctx.order.id)), patch);
}

export async function arriveAtRestaurant(ctx: MutationContext) {
  await guard(ctx);
  assertOwnership(ctx);
  const created = await writeEvent("arrived_at_restaurant", "arrived_at_restaurant", ctx);
  if (!created) return;
  await update(ref(getDb(), paths.order(ctx.order.id)), {
    driver_status: "arrived_at_restaurant",
    arrived_at_restaurant: nowIso(),
    updated_at: nowIso(),
  });
}

export async function verifyPickup(ctx: MutationContext, code: string) {
  await guard(ctx);
  assertOwnership(ctx);
  await writeEvent("pickup_verified", "arrived_at_restaurant", { ...ctx, metadata: { code } });
}

export async function pickUpOrder(ctx: MutationContext) {
  await guard(ctx);
  assertOwnership(ctx);
  const created = await writeEvent("order_picked_up", "picked_up", ctx);
  if (!created) return;
  await update(ref(getDb(), paths.order(ctx.order.id)), {
    driver_status: "picked_up",
    status: "picked_up",
    picked_up_at: nowIso(),
    updated_at: nowIso(),
  });
}

export async function startDelivery(ctx: MutationContext) {
  await guard(ctx);
  assertOwnership(ctx);
  const created = await writeEvent("en_route", "en_route", ctx);
  if (!created) return;
  await update(ref(getDb(), paths.order(ctx.order.id)), {
    driver_status: "en_route",
    status: "en_route",
    en_route_at: nowIso(),
    updated_at: nowIso(),
  });
}

export async function arriveAtCustomer(ctx: MutationContext) {
  await guard(ctx);
  assertOwnership(ctx);
  const created = await writeEvent("arrived_at_customer", "arrived_at_customer", ctx);
  if (!created) return;
  await update(ref(getDb(), paths.order(ctx.order.id)), {
    driver_status: "arrived_at_customer",
    arrived_at_customer: nowIso(),
    updated_at: nowIso(),
  });
}

export async function completeDelivery(ctx: MutationContext, proof: ProofOfDelivery) {
  await guard(ctx);
  assertOwnership(ctx);
  const created = await writeEvent("delivered", "delivered", { ...ctx, metadata: { proof_method: proof.method } });
  if (!created) return;

  await set(ref(getDb(), `${paths.order(ctx.order.id)}/proof_of_delivery`), proof);
  await update(ref(getDb(), paths.order(ctx.order.id)), {
    driver_status: "delivered",
    status: "delivered",
    delivered_at: nowIso(),
    delivered_latitude: ctx.location?.latitude ?? null,
    delivered_longitude: ctx.location?.longitude ?? null,
    updated_at: nowIso(),
  });

  await recordEarning(ctx.driverId, ctx.order);
  await clearLiveLocation(ctx.order.id);
}

/* --------------------------------------------------------------- earnings */

export async function recordEarning(driverId: string, order: Order) {
  const existing = await readOnce<Earning>(paths.earning(driverId, order.id));
  if (existing) return; // idempotent: one earning per delivery
  const base = Number(order.delivery_fee ?? 0);
  const tip = Number(order.tip ?? 0);
  const earning: Earning = {
    id: order.id,
    driver_id: driverId,
    order_id: order.id,
    order_number: order.order_number,
    base_amount: base,
    tip,
    bonus: 0,
    adjustment: 0,
    amount: base + tip,
    status: "pending",
    created_at: nowIso(),
  };
  await set(ref(getDb(), paths.earning(driverId, order.id)), earning);

  const txId = `tx_${order.id}`;
  const tx: WalletTransaction = {
    transaction_id: txId,
    driver_id: driverId,
    order_id: order.id,
    amount: earning.amount,
    type: "credit",
    status: "pending",
    description: `Delivery ${order.order_number ?? order.id}`,
    created_at: nowIso(),
  };
  await set(ref(getDb(), paths.walletTx(driverId, txId)), tx);
}

export function subscribeEarnings(driverId: string, cb: (e: Earning[]) => void) {
  return subscribe<Record<string, Earning>>(paths.earnings(driverId), (all) => cb(toArray<Earning>(all)));
}

export function subscribeWallet(driverId: string, cb: (t: WalletTransaction[]) => void) {
  return subscribe<Record<string, WalletTransaction>>(paths.wallet(driverId), (all) =>
    cb(toArray<WalletTransaction>(all).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))),
  );
}

/* --------------------------------------------------------------- location */

export async function publishLiveLocation(orderId: string, driverId: string, loc: DriverLocation) {
  const payload: DriverLocation = {
    latitude: loc.latitude,
    longitude: loc.longitude,
    heading: loc.heading ?? null,
    speed: loc.speed ?? null,
    updated_at: nowIso(),
    driver_id: driverId,
    order_id: orderId,
  };
  await set(ref(getDb(), paths.driverLive(orderId)), payload);
  const node = ref(getDb(), paths.driverLive(orderId));
  onDisconnect(node).update({ updated_at: serverTimestamp() as unknown as string });
}

export async function clearLiveLocation(orderId: string) {
  await set(ref(getDb(), paths.driverLive(orderId)), null);
}

export async function publishDriverPosition(driverId: string, lat: number, lng: number) {
  await update(ref(getDb(), paths.driver(driverId)), {
    current_latitude: lat,
    current_longitude: lng,
    updated_at: nowIso(),
  });
}

/* ---------------------------------------------------------- notifications */

export function subscribeNotifications(driverId: string, cb: (n: DriverNotification[]) => void) {
  return subscribe<Record<string, DriverNotification>>(paths.notifications(driverId), (all) =>
    cb(toArray<DriverNotification>(all).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))),
  );
}

export async function markNotificationRead(driverId: string, id: string) {
  await update(ref(getDb(), `${paths.notifications(driverId)}/${id}`), { read: true });
}

export async function markAllNotificationsRead(driverId: string, ids: string[]) {
  const updates: Record<string, unknown> = {};
  ids.forEach((id) => (updates[`${paths.notifications(driverId)}/${id}/read`] = true));
  if (Object.keys(updates).length) await update(ref(getDb()), updates);
}

/* --------------------------------------------------------------- support */

export function subscribeSupportTickets(driverId: string, cb: (t: SupportTicket[]) => void) {
  return subscribe<Record<string, SupportTicket>>(paths.support, (all) =>
    cb(
      toArray<SupportTicket>(all)
        .filter((t) => t.driver_id === driverId)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    ),
  );
}

export async function createSupportTicket(
  driverId: string,
  input: { subject: string; category: string; message: string; order_id?: string | null },
) {
  const node = push(ref(getDb(), paths.support));
  const id = node.key!;
  const ticket: SupportTicket = {
    id,
    driver_id: driverId,
    subject: input.subject,
    category: input.category,
    status: "open",
    order_id: input.order_id ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
    messages: {
      m0: { id: "m0", sender: "driver", body: input.message, created_at: nowIso() },
    },
  };
  await set(node, ticket);
  return id;
}

export async function addSupportMessage(ticketId: string, body: string) {
  const node = push(ref(getDb(), `${paths.supportTicket(ticketId)}/messages`));
  await set(node, { id: node.key, sender: "driver", body, created_at: nowIso() });
  await update(ref(getDb(), paths.supportTicket(ticketId)), { updated_at: nowIso(), status: "open" });
}

/* ------------------------------------------------------------ order chat */

export function subscribeOrderChat(
  orderId: string,
  cb: (m: { id: string; sender: string; body: string; created_at: string }[]) => void,
) {
  type Msg = { id: string; sender: string; body: string; created_at: string };
  return subscribe<Record<string, Msg>>(paths.chat(orderId), (all) =>
    cb(toArray<Msg>(all).sort((a, b) => (a.created_at > b.created_at ? 1 : -1))),
  );
}

export async function sendOrderMessage(orderId: string, driverId: string, body: string) {
  const node = push(ref(getDb(), paths.chat(orderId)));
  await set(node, { id: node.key, sender: "driver", driver_id: driverId, body, created_at: nowIso() });
}

/* ----------------------------------------------------------- restaurants */

export async function loadRestaurant(restaurantId: string): Promise<Restaurant | null> {
  const r = await readOnce<Restaurant>(paths.restaurant(restaurantId));
  return r ? { ...r, id: r.id ?? restaurantId } : null;
}

export function subscribeRestaurants(cb: (r: Record<string, Restaurant>) => void) {
  return subscribe<Record<string, Restaurant>>(paths.restaurants, (all) => cb(all ?? {}));
}
