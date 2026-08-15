import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthDriver } from "@/hooks/useAuthDriver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ForkFleet Driver" },
      { name: "description", content: "Send a password reset link to your ForkFleet driver email address." },
      { property: "og:title", content: "Reset password — ForkFleet Driver" },
      { property: "og:description", content: "Recover access to your ForkFleet driver account." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { resetPassword } = useAuthDriver();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success("Reset link sent");
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
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary">
            <KeyRound className="size-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">Reset your password</h1>
        </div>
        {sent ? (
          <div className="surface-card space-y-3 p-5 text-center">
            <p className="text-sm">
              If a driver account exists for <strong>{email}</strong>, a reset link is on its way.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="surface-card space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                className="h-12 text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="h-14 w-full text-base font-bold" disabled={busy}>
              {busy && <Loader2 className="mr-2 size-5 animate-spin" />} Send reset link
            </Button>
            <Link to="/login" className="block text-center text-sm font-semibold text-primary">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
