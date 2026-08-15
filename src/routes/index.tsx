import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bike } from "lucide-react";
import { useAuthDriver } from "@/hooks/useAuthDriver";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ForkFleet Driver — Deliver, track, earn" },
      {
        name: "description",
        content:
          "ForkFleet Driver app: accept assigned deliveries, navigate to the right restaurant branch, share live GPS and record proof of delivery.",
      },
      { property: "og:title", content: "ForkFleet Driver — Deliver, track, earn" },
      {
        property: "og:description",
        content: "Driver companion for the ForkFleet delivery ecosystem.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  const { ready, user, driver } = useAuthDriver();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate({ to: "/login", replace: true });
    else navigate({ to: "/home", replace: true });
  }, [ready, user, driver, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-elevate">
        <Bike className="size-10" />
      </div>
      <h1 className="font-display text-3xl font-bold tracking-wide">ForkFleet Driver</h1>
      <p className="text-sm text-muted-foreground">
        {ready ? "Redirecting…" : "Connecting to ForkFleet…"}
      </p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}
