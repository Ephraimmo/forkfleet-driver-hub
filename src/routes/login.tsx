import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthDriver } from "@/hooks/useAuthDriver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Driver sign in — ForkFleet Driver" },
      { name: "description", content: "Sign in to your ForkFleet driver account to receive delivery assignments." },
      { property: "og:title", content: "Driver sign in — ForkFleet Driver" },
      { property: "og:description", content: "Secure sign in for ForkFleet delivery drivers." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, ready, user } = useAuthDriver();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/home", replace: true });
  }, [ready, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password, remember);
      toast.success("Signed in");
      navigate({ to: "/home", replace: true });
    } catch (err) {
      toast.error((err as Error).message.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Bike className="size-8" />
          </div>
          <h1 className="font-display text-3xl font-bold">ForkFleet Driver</h1>
          <p className="text-sm text-muted-foreground">Sign in with your driver account</p>
        </div>

        <form onSubmit={submit} className="surface-card space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="h-12 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-12 text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            Keep me signed in on this device
          </label>
          <Button type="submit" size="lg" className="h-14 w-full text-base font-bold" disabled={busy}>
            {busy && <Loader2 className="mr-2 size-5 animate-spin" />} Sign in
          </Button>
          <Link to="/forgot-password" className="block text-center text-sm font-semibold text-primary">
            Forgot password?
          </Link>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          New driver?{" "}
          <Link to="/register" className="font-semibold text-primary">
            Create an account
          </Link>
        </p>

      </div>
    </div>
  );
}
