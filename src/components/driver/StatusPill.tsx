import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  offered: "bg-info/15 text-info",
  accepted: "bg-info/15 text-info",
  assigned: "bg-info/15 text-info",
  arrived_at_restaurant: "bg-warning/20 text-warning",
  picked_up: "bg-warning/20 text-warning",
  en_route: "bg-primary/15 text-primary",
  arrived_at_customer: "bg-primary/15 text-primary",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
  failed: "bg-destructive/15 text-destructive",
  rejected: "bg-destructive/15 text-destructive",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        TONE[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
