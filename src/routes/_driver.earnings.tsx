import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { useDriverStats } from "@/hooks/useDriverStats";
import { useDriverOrders } from "@/hooks/useDriverOrders";
import { formatMoney } from "@/lib/geo";
import { EmptyState } from "@/components/driver/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_driver/earnings")({
  head: () => ({
    meta: [
      { title: "Earnings & wallet — ForkFleet Driver" },
      { name: "description", content: "Track today's, weekly and monthly delivery earnings, tips, wallet balance and settlement history." },
      { property: "og:title", content: "Earnings & wallet — ForkFleet Driver" },
      { property: "og:description", content: "Every payout, tip and adjustment from your ForkFleet deliveries." },
    ],
  }),
  component: EarningsPage,
});

function EarningsPage() {
  const s = useDriverStats();
  const { history } = useDriverOrders();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Earnings</h1>

      <section className="surface-card grid grid-cols-2 gap-2 p-4">
        <Stat label="Today" value={formatMoney(s.todayEarnings)} />
        <Stat label="This week" value={formatMoney(s.weekEarnings)} />
        <Stat label="This month" value={formatMoney(s.monthEarnings)} />
        <Stat label="Wallet balance" value={formatMoney(s.walletBalance)} />
        <Stat label="Pending" value={formatMoney(s.pending)} />
        <Stat label="Paid out" value={formatMoney(s.paid)} />
        <Stat label="Tips" value={formatMoney(s.tips)} />
        <Stat label="Bonuses" value={formatMoney(s.bonuses)} />
      </section>

      <Tabs defaultValue="earnings">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="earnings">Per delivery</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-2 pt-3">
          {s.earnings.length === 0 ? (
            <EmptyState icon={Wallet} title="No earnings yet" description="Completed deliveries are recorded here automatically." />
          ) : (
            s.earnings.map((e) => (
              <div key={e.id} className="surface-card flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{e.order_number ?? e.order_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()} · tip {formatMoney(e.tip)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatMoney(e.amount)}</p>
                  <p className="text-xs uppercase text-muted-foreground">{e.status}</p>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="wallet" className="space-y-2 pt-3">
          {s.wallet.length === 0 ? (
            <EmptyState icon={Wallet} title="No transactions" description="Credits, tips and withdrawals appear here." />
          ) : (
            s.wallet.map((t) => (
              <div key={t.transaction_id} className="surface-card flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{t.description ?? t.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <p className="font-bold">{formatMoney(t.amount)}</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-2 pt-3">
          <section className="surface-card grid grid-cols-2 gap-2 p-4">
            <Stat label="Total deliveries" value={String(s.totalDelivered)} />
            <Stat label="Cancelled" value={String(s.totalCancelled)} />
            <Stat label="Rejected" value={String(s.totalRejected)} />
            <Stat label="Acceptance rate" value={`${s.acceptanceRate}%`} />
            <Stat label="Completion rate" value={`${s.completionRate}%`} />
            <Stat label="History records" value={String(history.length)} />
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">{value}</p>
    </div>
  );
}
