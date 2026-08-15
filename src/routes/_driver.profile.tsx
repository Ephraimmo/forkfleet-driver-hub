import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Moon, ShieldCheck, Store, Sun } from "lucide-react";
import { toast } from "sonner";
import { useAuthDriver } from "@/hooks/useAuthDriver";
import { updateDriverProfile } from "@/lib/repo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_driver/profile")({
  head: () => ({
    meta: [
      { title: "Driver profile — ForkFleet Driver" },
      { name: "description", content: "Manage your vehicle, contact details, verification status and authorized restaurant branches." },
      { property: "og:title", content: "Driver profile — ForkFleet Driver" },
      { property: "og:description", content: "Your ForkFleet driver identity, documents and branch authorizations." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { driver, user, assignments, activeAssignments, logout, resendVerification } = useAuthDriver();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [dark, setDark] = useState(true);
  const [form, setForm] = useState({ phone: "", vehicle_type: "", vehicle_plate: "", emergency_contact_phone: "" });

  useEffect(() => {
    const stored = window.localStorage.getItem("forkfleet.theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    if (!driver) return;
    setForm({
      phone: driver.phone ?? "",
      vehicle_type: driver.vehicle_type ?? "",
      vehicle_plate: driver.vehicle_plate ?? "",
      emergency_contact_phone: driver.emergency_contact_phone ?? "",
    });
  }, [driver]);

  if (!driver) return null;

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("forkfleet.theme", next ? "dark" : "light");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDriverProfile(driver.id, form);
      toast.success("Profile updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const inactive = assignments.filter((a) => !a.is_active);

  return (
    <div className="space-y-4">
      <header className="surface-card space-y-1 p-4">
        <h1 className="font-display text-2xl font-bold">{driver.full_name}</h1>
        <p className="text-sm text-muted-foreground">{driver.email}</p>
        <p className="text-xs text-muted-foreground">Driver ID {driver.id}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant={driver.is_verified ? "default" : "destructive"}>
            {driver.is_verified ? "Verified" : "Verification incomplete"}
          </Badge>
          <Badge variant={driver.is_active ? "default" : "destructive"}>
            {driver.is_active ? "Active" : "Suspended"}
          </Badge>
          {user && !user.emailVerified && (
            <Button size="sm" variant="outline" onClick={() => resendVerification().then(() => toast.success("Verification email sent"))}>
              Verify email
            </Button>
          )}
        </div>
      </header>

      <section className="surface-card space-y-2 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Store className="size-5" /> Authorized branches ({activeAssignments.length})
        </h2>
        {activeAssignments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No active branch assignments. Operations must authorize you before you receive deliveries.
          </p>
        )}
        {activeAssignments.map((a) => (
          <div key={a.id} className="stat-tile flex items-center justify-between">
            <span className="text-sm font-semibold">
              {a.restaurant_name ?? a.restaurant_id} · {a.branch_name ?? a.branch_id}
            </span>
            <ShieldCheck className="size-4 text-success" />
          </div>
        ))}
        {inactive.length > 0 && (
          <details className="pt-2">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Previous assignments ({inactive.length})
            </summary>
            <div className="space-y-1 pt-2">
              {inactive.map((a) => (
                <p key={a.id} className="text-xs text-muted-foreground">
                  {a.restaurant_name ?? a.restaurant_id} · {a.branch_name ?? a.branch_id} — inactive
                </p>
              ))}
            </div>
          </details>
        )}
      </section>

      <form onSubmit={save} className="surface-card space-y-3 p-4">
        <h2 className="font-display text-lg font-bold">Details</h2>
        {(
          [
            ["phone", "Phone"],
            ["vehicle_type", "Vehicle type"],
            ["vehicle_plate", "Vehicle registration"],
            ["emergency_contact_phone", "Emergency contact"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              className="h-12"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
        <Button type="submit" size="lg" className="h-14 w-full font-bold" disabled={saving}>
          Save changes
        </Button>
      </form>

      <div className="grid gap-2">
        <Button variant="outline" size="lg" className="h-14" onClick={toggleTheme}>
          {dark ? <Sun className="mr-2 size-5" /> : <Moon className="mr-2 size-5" />}
          {dark ? "Light mode" : "Dark mode"}
        </Button>
        <Button asChild variant="outline" size="lg" className="h-14">
          <Link to="/support">Help & support</Link>
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="h-14"
          onClick={async () => {
            await logout();
            navigate({ to: "/login", replace: true });
          }}
        >
          <LogOut className="mr-2 size-5" /> Sign out
        </Button>
      </div>
    </div>
  );
}
