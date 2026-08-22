import { useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import {
  useSendNotification,
  useSentNotifications,
  validateNotification,
  timeAgo,
  type NotificationPriority,
} from "@/lib/notifications";

type Person = { id: string; email: string; display_name: string | null };

const PRIORITIES: NotificationPriority[] = ["low", "normal", "high", "urgent"];
const TYPES = ["announcement", "reminder", "achievement", "system"];

export default function AdminNotifications({ people }: { people: Person[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "user">("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [priority, setPriority] = useState<NotificationPriority>("normal");
  const [type, setType] = useState("announcement");
  const [actionLabel, setActionLabel] = useState("");
  const [actionUrl, setActionUrl] = useState("");

  const send = useSendNotification();
  const { data: sent } = useSentNotifications(true);

  const submit = () => {
    const input = {
      title,
      body,
      audience,
      targetUserId: targetUserId || null,
      priority,
      type,
      actionLabel: actionLabel || null,
      actionUrl: actionUrl || null,
    };
    const err = validateNotification(input);
    if (err) return toast.error(err);
    send.mutate(input, {
      onSuccess: () => {
        toast.success(audience === "all" ? "Broadcast sent to everyone" : "Notification sent");
        setTitle("");
        setBody("");
        setActionLabel("");
        setActionUrl("");
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Send a notification</h3>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["all", "user"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              aria-pressed={audience === a}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${audience === a ? "border-primary bg-accent text-accent-foreground" : "border-border bg-muted/40 text-muted-foreground"}`}
            >
              {a === "all" ? "Everyone" : "One user"}
            </button>
          ))}
        </div>

        {audience === "user" && (
          <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className={`${field} mb-3`}>
            <option value="">Pick a recipient…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.display_name || p.email}</option>
            ))}
          </select>
        )}

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={`${field} mb-3`} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" rows={4} className={`${field} mb-3 resize-y`} />

        <div className="mb-3 grid grid-cols-2 gap-2">
          <select value={priority} onChange={(e) => setPriority(e.target.value as NotificationPriority)} className={field}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <input value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} placeholder="Button label (optional)" className={field} />
          <input value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} placeholder="/dashboard or https://…" className={field} />
        </div>

        <button
          onClick={submit}
          disabled={send.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recently sent</h3>
        {(sent ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
        ) : (
          <ul className="max-h-[26rem] space-y-2 overflow-y-auto">
            {(sent ?? []).map((n) => (
              <li key={n.id} className="rounded-xl bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm font-medium">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {n.audience === "all" ? "Everyone" : "Single user"} · {n.recipient_count} recipient{n.recipient_count === 1 ? "" : "s"} · {n.priority}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
