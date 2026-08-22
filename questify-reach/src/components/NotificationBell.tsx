import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  useMyNotifications,
  useNotificationActions,
  unreadCount,
  timeAgo,
  type DeliveryRow,
} from "@/lib/notifications";

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-accent text-accent-foreground",
  high: "bg-primary/15 text-primary",
  urgent: "bg-destructive/15 text-destructive",
};

export default function NotificationBell({
  userId,
  className = "",
}: {
  userId: string | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const { data: rows } = useMyNotifications(userId);
  const { markRead, markAllRead } = useNotificationActions(userId);
  const unread = unreadCount(rows);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative grid size-9 sm:size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4.5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-accordion-open"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-secondary/30">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {(rows ?? []).length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              (rows ?? []).map((d: DeliveryRow) => {
                const n = d.notifications;
                if (!n) return null;
                return (
                  <div
                    key={d.id}
                    className={`border-b border-border px-4 py-3 last:border-0 transition-colors ${
                      d.read_at ? "" : "bg-accent/30"
                    }`}
                  >
                    <div className="mb-1 flex items-start gap-2">
                      <span className="flex-1 text-sm font-medium leading-snug">{n.title}</span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          PRIORITY_STYLE[n.priority] ?? PRIORITY_STYLE.normal
                        }`}
                      >
                        {n.priority}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">{n.body}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground">{timeAgo(d.created_at)}</span>
                      {n.action_url &&
                        (n.action_url.startsWith("/") ? (
                          <Link
                            to={n.action_url}
                            onClick={() => setOpen(false)}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            {n.action_label || "Open"}
                          </Link>
                        ) : (
                          <a
                            href={n.action_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            {n.action_label || "Open"}
                          </a>
                        ))}
                      {!d.read_at && (
                        <button
                          onClick={() => markRead.mutate(d.id)}
                          className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
