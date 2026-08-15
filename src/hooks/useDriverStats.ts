import { useEffect, useMemo, useState } from "react";
import { useAuthDriver } from "./useAuthDriver";
import { useDriverOrders } from "./useDriverOrders";
import { subscribeEarnings, subscribeWallet } from "@/lib/repo";
import type { Earning, WalletTransaction } from "@/types/forkfleet";

function isSameDay(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}

function withinDays(iso: string | undefined, days: number) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() <= days * 86_400_000;
}

export function useDriverStats() {
  const { driver } = useAuthDriver();
  const { mine, history } = useDriverOrders();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [wallet, setWallet] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    if (!driver?.id) return;
    const a = subscribeEarnings(driver.id, setEarnings);
    const b = subscribeWallet(driver.id, setWallet);
    return () => {
      a();
      b();
    };
  }, [driver?.id]);

  return useMemo(() => {
    const delivered = history.filter((o) => o.driverStatus === "delivered" || o.orderStatus === "delivered");
    const cancelled = history.filter((o) => ["cancelled", "failed"].includes(String(o.orderStatus)));
    const rejected = mine.filter((o) => o.driverStatus === "rejected");

    const todayEarnings = earnings
      .filter((e) => isSameDay(e.created_at))
      .reduce((s, e) => s + e.amount, 0);
    const weekEarnings = earnings.filter((e) => withinDays(e.created_at, 7)).reduce((s, e) => s + e.amount, 0);
    const monthEarnings = earnings.filter((e) => withinDays(e.created_at, 30)).reduce((s, e) => s + e.amount, 0);
    const pending = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);
    const paid = earnings.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);
    const tips = earnings.reduce((s, e) => s + (e.tip ?? 0), 0);
    const bonuses = earnings.reduce((s, e) => s + (e.bonus ?? 0), 0);

    const todayDeliveries = delivered.filter((o) => isSameDay(String(o.raw.updated_at)));
    const todayDistanceKm = todayDeliveries.reduce((s, o) => s + (o.distanceKm ?? 0), 0);

    const offers = delivered.length + cancelled.length + rejected.length;
    const acceptanceRate = offers ? Math.round(((offers - rejected.length) / offers) * 100) : 100;
    const completionRate = delivered.length + cancelled.length
      ? Math.round((delivered.length / (delivered.length + cancelled.length)) * 100)
      : 100;

    return {
      earnings,
      wallet,
      walletBalance: driver?.wallet_balance ?? wallet.reduce((s, t) => s + (t.type === "debit" || t.type === "withdrawal" ? -t.amount : t.amount), 0),
      todayCount: todayDeliveries.length,
      todayEarnings,
      weekEarnings,
      monthEarnings,
      pending,
      paid,
      tips,
      bonuses,
      todayDistanceKm,
      totalDelivered: delivered.length,
      totalCancelled: cancelled.length,
      totalRejected: rejected.length,
      acceptanceRate,
      completionRate,
    };
  }, [earnings, wallet, history, mine, driver?.wallet_balance]);
}
