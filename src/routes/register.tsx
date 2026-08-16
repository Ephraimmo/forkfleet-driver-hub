import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthDriver } from "@/hooks/useAuthDriver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Driver registration — ForkFleet Driver" },
      {
        name: "description",
        content:
          "Create your ForkFleet driver account: add your contact details and vehicle, then start receiving delivery assignments.",
      },
      { property: "og:title", content: "Driver registration — ForkFleet Driver" },
      {
        property: "og:description",
        content: "Register as a ForkFleet delivery driver in a couple of minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

const VEHICLES = ["motorbike", "bicycle", "car", "scooter", "van", "on_foot"];

function RegisterPage() {
  const { register, ready, user } = useAuthDriver();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    vehicle_type: "motorbike",
    vehicle_plate: "",
    license_number: "",
    password: "",
    confirm: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/home", replace: true });
  }, [ready, user, navigate]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const { confirm: _confirm, ...input } = form;
      await register(input);
      toast.success("Account created — welcome to ForkFleet");
      navigate({ to: "/home", replace: true });
    } catch (err) {
      toast.error((err as Error).message.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-sm space-y-6 py-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Bike className="size-8" />
          </div>
          <h1 className="font-display text-3xl font-bold">Become a driver</h1>
          <p className="text-sm text-muted-foreground">
            Create your account — operations will assign your restaurants and branches.
          </p>
        </div>

        <form onSubmit={submit} className="surface-card space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              required
              autoComplete="name"
              className="h-12 text-base"
              value={form.full_name}
              onChange={(e) => set("full_name")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="h-12 text-base"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              required
              autoComplete="tel"
              className="h-12 text-base"
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              className="h-12 text-base"
              value={form.city}
              onChange={(e) => set("city")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_type">Vehicle</Label>
            <Select value={form.vehicle_type} onValueChange={set("vehicle_type")}>
              <SelectTrigger id="vehicle_type" className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_plate">Vehicle plate</Label>
            <Input
              id="vehicle_plate"
              className="h-12 text-base"
              value={form.vehicle_plate}
              onChange={(e) => set("vehicle_plate")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="license_number">Driver licence number</Label>
            <Input
              id="license_number"
              className="h-12 text-base"
              value={form.license_number}
              onChange={(e) => set("license_number")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              className="h-12 text-base"
              value={form.password}
              onChange={(e) => set("password")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              className="h-12 text-base"
              value={form.confirm}
              onChange={(e) => set("confirm")(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="h-14 w-full text-base font-bold" disabled={busy}>
            {busy && <Loader2 className="mr-2 size-5 animate-spin" />} Create driver account
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
