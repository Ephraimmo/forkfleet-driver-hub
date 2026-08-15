import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { useAuthDriver } from "@/hooks/useAuthDriver";
import { subscribeSupportTickets, createSupportTicket, addSupportMessage } from "@/lib/repo";
import { EmptyState } from "@/components/driver/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SupportTicket } from "@/types/forkfleet";

const CATEGORIES = ["Delivery issue", "Restaurant issue", "Customer issue", "Payment issue", "Technical issue", "Emergency"];

export const Route = createFileRoute("/_driver/support")({
  head: () => ({
    meta: [
      { title: "Driver support — ForkFleet Driver" },
      { name: "description", content: "Open a support ticket, chat with the ForkFleet support team and get help on active deliveries." },
      { property: "og:title", content: "Driver support — ForkFleet Driver" },
      { property: "og:description", content: "Help for delivery, restaurant, customer and payment issues." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { driver } = useAuthDriver();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!driver?.id) return;
    const unsub = subscribeSupportTickets(driver.id, setTickets);
    return () => unsub();
  }, [driver?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;
    try {
      await createSupportTicket(driver.id, { subject, category, message });
      setSubject("");
      setMessage("");
      toast.success("Support ticket created");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Support</h1>

      <form onSubmit={submit} className="surface-card space-y-3 p-4">
        <h2 className="font-display text-lg font-bold">New ticket</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Button key={c} type="button" variant={c === category ? "default" : "outline"} onClick={() => setCategory(c)}>
              {c}
            </Button>
          ))}
        </div>
        <Input className="h-12" placeholder="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea placeholder="Describe the issue" required value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button type="submit" size="lg" className="h-14 w-full font-bold">
          Submit ticket
        </Button>
      </form>

      {tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No tickets" description="Your support conversations will appear here." />
      ) : (
        tickets.map((t) => (
          <div key={t.id} className="surface-card space-y-2 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{t.subject}</p>
              <span className="text-xs uppercase text-muted-foreground">{t.status}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t.category}</p>
            <div className="space-y-1">
              {Object.values(t.messages ?? {}).map((m) => (
                <p key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.sender === "driver" ? "bg-primary/15" : "bg-muted"}`}>
                  {m.body}
                </p>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const body = (reply[t.id] ?? "").trim();
                if (!body) return;
                await addSupportMessage(t.id, body);
                setReply((r) => ({ ...r, [t.id]: "" }));
              }}
            >
              <Input
                className="h-11"
                value={reply[t.id] ?? ""}
                onChange={(e) => setReply((r) => ({ ...r, [t.id]: e.target.value }))}
                placeholder="Reply"
              />
              <Button type="submit">Send</Button>
            </form>
          </div>
        ))
      )}
    </div>
  );
}
