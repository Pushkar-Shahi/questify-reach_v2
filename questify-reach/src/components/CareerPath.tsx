import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, Check, Route as RouteIcon, Send } from "lucide-react";
import { useMyCareer, useTracks, CATEGORY_WEIGHTS } from "@/lib/career";

export default function CareerPath({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: tracks } = useTracks();
  const { trackId, track, stats, doneIds, percent, careerPoints } = useMyCareer(userId);
  const [open, setOpen] = useState<number | null>(1);
  const [requesting, setRequesting] = useState(false);
  const [roleName, setRoleName] = useState("");

  const myRequests = useQuery({
    queryKey: ["my-track-requests", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("track_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectTrack = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_selected_tracks")
        .upsert({ user_id: userId, track_id: id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Career track updated");
      qc.invalidateQueries({ queryKey: ["selected-track"] });
      qc.invalidateQueries({ queryKey: ["career-leaderboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ taskId, done }: { taskId: string; done: boolean }) => {
      const { error } = await supabase.from("user_career_progress").upsert(
        {
          user_id: userId,
          task_id: taskId,
          is_completed: done,
          completed_at: done ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,task_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["career-progress"] });
      qc.invalidateQueries({ queryKey: ["career-leaderboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestTrack = useMutation({
    mutationFn: async () => {
      const name = roleName.trim();
      if (!name) throw new Error("Enter a role name");
      const { error } = await supabase.from("track_requests").insert({ user_id: userId, requested_role_name: name });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request sent to the admin");
      setRoleName("");
      setRequesting(false);
      myRequests.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pct = Math.round(percent * 10) / 10;

  return (
    <section className="rounded-2xl bg-card border border-border p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <RouteIcon className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">My Career Path</h2>
        {track && <span className="ml-auto text-sm font-bold text-primary">{pct}% · {Math.round(careerPoints)}/1000 pts</span>}
      </div>

      <label className="block text-xs font-medium text-muted-foreground mb-1">Active track</label>
      <select
        value={trackId ?? ""}
        onChange={(e) => {
          if (e.target.value === "__request") setRequesting(true);
          else selectTrack.mutate(e.target.value);
        }}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="" disabled>Select a career track…</option>
        {tracks?.map((t) => (
          <option key={t.id} value={t.id}>{t.title}</option>
        ))}
        <option value="__request">+ Request New Track from Admin</option>
      </select>

      {requesting && (
        <form
          onSubmit={(e) => { e.preventDefault(); requestTrack.mutate(); }}
          className="flex gap-2 mb-4"
        >
          <input
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="e.g. Embedded Systems Engineer"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium flex items-center gap-1 hover:opacity-90">
            <Send className="size-4" /> Send
          </button>
          <button type="button" onClick={() => setRequesting(false)} className="text-sm text-muted-foreground px-2">Cancel</button>
        </form>
      )}

      {!!myRequests.data?.length && (
        <ul className="mb-4 space-y-1">
          {myRequests.data.map((r) => (
            <li key={r.id} className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="truncate">{r.requested_role_name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === "approved" ? "bg-success/15 text-success" : r.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-muted"}`}>
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      {track && (
        <div className="space-y-2">
          {stats.map((s) => {
            const isOpen = open === s.categoryId;
            const catPct = s.total ? Math.round((s.done / s.total) * 100) : 0;
            return (
              <div key={s.categoryId} className="rounded-xl border border-border overflow-hidden transition-colors hover:border-primary/40">
                <button
                  onClick={() => setOpen(isOpen ? null : s.categoryId)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.categoryName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Weight {CATEGORY_WEIGHTS[s.categoryId]}% · {s.done}/{s.total} done · {Math.round(s.earnedPoints)}/{s.maxPoints} pts
                    </div>
                  </div>
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${catPct}%` }} />
                  </div>
                  <ChevronDown className={`size-4 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <ul className="animate-accordion-open border-t border-border divide-y divide-border max-h-[26rem] overflow-y-auto overscroll-contain">
                    {s.tasks.map((t) => {
                      const done = doneIds.has(t.id);
                      return (
                        <li key={t.id} className="flex gap-3 p-3 transition-colors hover:bg-muted/50">
                          <button
                            onClick={() => toggleTask.mutate({ taskId: t.id, done: !done })}
                            className={`mt-0.5 size-5 shrink-0 rounded-md border grid place-items-center transition ${done ? "bg-success text-success-foreground border-success" : "border-input hover:border-primary"}`}
                            aria-label={done ? "Mark incomplete" : "Mark complete"}
                          >
                            {done && <Check className="size-3.5" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium break-words ${done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                            {t.description && <p className="text-xs text-muted-foreground mt-0.5 break-words">{t.description}</p>}
                          </div>
                          <span className="text-xs font-semibold text-primary shrink-0">
                            +{Math.round(s.pointsPerTask * 10) / 10}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

            );
          })}
        </div>
      )}
    </section>
  );
}
