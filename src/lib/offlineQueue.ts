import type { Driver, Order, ProofOfDelivery } from "@/types/forkfleet";
import {
  acceptDelivery,
  rejectDelivery,
  arriveAtRestaurant,
  verifyPickup,
  pickUpOrder,
  startDelivery,
  arriveAtCustomer,
  completeDelivery,
  type MutationContext,
} from "./repo";
import { log, logError } from "./log";

export type MutationName =
  | "accept"
  | "reject"
  | "arrive_restaurant"
  | "verify_pickup"
  | "pickup"
  | "start"
  | "arrive_customer"
  | "complete";

export interface QueuedMutation {
  id: string;
  name: MutationName;
  ctx: {
    driverId: string;
    order: Order;
    location?: { latitude: number; longitude: number } | null;
    note?: string;
    clientRequestId: string;
  };
  extra?: {
    driver?: Driver;
    reason?: string;
    code?: string;
    proof?: ProofOfDelivery;
  };
  queued_at: string;
}

const KEY = "forkfleet.driver.queue.v1";
const listeners = new Set<(n: number) => void>();

function readQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as QueuedMutation[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedMutation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l(items.length));
}

export function queueSize() {
  return readQueue().length;
}

export function onQueueChange(cb: (n: number) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function enqueue(item: QueuedMutation) {
  const items = readQueue();
  // idempotent enqueue: same mutation + clientRequestId only once
  if (items.some((i) => i.id === item.id)) return;
  items.push(item);
  writeQueue(items);
  log("SYNC", `queued ${item.name} for ${item.ctx.order.id}`);
}

export async function runMutation(item: QueuedMutation): Promise<void> {
  const ctx: MutationContext = {
    driverId: item.ctx.driverId,
    order: item.ctx.order,
    location: item.ctx.location ?? null,
    ...(item.ctx.note ? { note: item.ctx.note } : {}),
    clientRequestId: item.ctx.clientRequestId,
  };
  switch (item.name) {
    case "accept":
      return acceptDelivery(ctx, item.extra!.driver!);
    case "reject":
      return rejectDelivery(ctx, item.extra?.reason ?? "Unspecified");
    case "arrive_restaurant":
      return arriveAtRestaurant(ctx);
    case "verify_pickup":
      return verifyPickup(ctx, item.extra?.code ?? "");
    case "pickup":
      return pickUpOrder(ctx);
    case "start":
      return startDelivery(ctx);
    case "arrive_customer":
      return arriveAtCustomer(ctx);
    case "complete":
      return completeDelivery(ctx, item.extra!.proof!);
  }
}

let flushing = false;

export async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    let items = readQueue();
    for (const item of [...items]) {
      try {
        await runMutation(item);
        items = readQueue().filter((i) => i.id !== item.id);
        writeQueue(items);
        log("SYNC", `synced queued ${item.name} for ${item.ctx.order.id}`);
      } catch (e) {
        logError("SYNC", `queued ${item.name} failed; keeping for retry`, e);
      }
    }
  } finally {
    flushing = false;
  }
}

export function newRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
