import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DriverShell } from "@/components/driver/DriverShell";

export const Route = createFileRoute("/_driver")({
  component: DriverLayout,
});

function DriverLayout() {
  return (
    <DriverShell>
      <Outlet />
    </DriverShell>
  );
}
