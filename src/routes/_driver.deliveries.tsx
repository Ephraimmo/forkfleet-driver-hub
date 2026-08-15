import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { useDriverOrders } from "@/hooks/useDriverOrders";
import { useDeliveryActions } from "@/hooks/useDeliveryActions";
import { DeliveryCard } from "@/components/driver/DeliveryCard";
import { EmptyState } from "@/components/driver/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { DriverOrderViewModel } from "@/types/forkfleet";

const REASONS = [
  "Too far",
  "Vehicle problem",
  "Restaurant unavailable",
  "Customer issue",
  "Personal emergency",
  "Other",
];

export const Route = createFileRoute("/_driver/deliveries")({
  head: () => ({
    meta: [
      { title: "Deliveries — ForkFleet Driver" },
      { name: "description", content: "Available, active and past deliveries for the branches you are authorized to serve." },
      { property: "og:title", content: "Deliveries — ForkFleet Driver" },
      { property: "og:description", content: "Accept or reject delivery offers in real time." },
    ],
  }),
  component: DeliveriesPage,
});

function DeliveriesPage() {
  const { available, active, history, loading } = useDriverOrders();
  const { perform } = useDeliveryActions();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<DriverOrderViewModel | null>(null);
  const [reason, setReason] = useState(REASONS[0]!);

  const accept = async (o: DriverOrderViewModel) => {
    setBusy(o.id);
    try {
      await perform("accept", o.raw);
      toast.success(`Accepted ${o.orderNumber}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    setBusy(rejecting.id);
    try {
      await perform("reject", rejecting.raw, { reason });
      toast.success("Delivery rejected and returned to dispatch");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      setRejecting(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Deliveries</h1>
      <Tabs defaultValue="available">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-3 pt-3">
          {loading ? (
            <div className="surface-card h-32 animate-pulse" />
          ) : available.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No offers right now"
              description="You only see orders from restaurant branches where you hold an active assignment."
            />
          ) : (
            available.map((o) => (
              <DeliveryCard
                key={o.id}
                order={o}
                busy={busy === o.id}
                onAccept={() => accept(o)}
                onReject={() => setRejecting(o)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-3 pt-3">
          {active.length === 0 ? (
            <EmptyState icon={Package} title="No active delivery" description="Accept an offer to start a delivery." />
          ) : (
            active.map((o) => <DeliveryCard key={o.id} order={o} />)
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3 pt-3">
          {history.length === 0 ? (
            <EmptyState icon={Package} title="No delivery history" description="Completed deliveries appear here." />
          ) : (
            history.slice(0, 20).map((o) => <DeliveryCard key={o.id} order={o} />)
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Why are you rejecting this delivery?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="grid gap-2">
            {REASONS.map((r) => (
              <Button
                key={r}
                variant={reason === r ? "default" : "outline"}
                className="h-12 justify-start"
                onClick={() => setReason(r)}
              >
                {r}
              </Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReject}>Reject delivery</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
