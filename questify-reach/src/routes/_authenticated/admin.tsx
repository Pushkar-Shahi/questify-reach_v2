import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useIsAdmin } from "@/hooks/useAuth";
import { Check, X, Search, Users, Activity, ShieldCheck, Unlock } from "lucide-react";
import { toast } from "sonner";
import UserAvatar from "@/components/UserAvatar";
import AdminNotifications from "@/components/AdminNotifications";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Admin" },
    { name: "description", content: "Approve members, manage semester access and review career track requests." },
    { property: "og:title", content: "Admin" },
    { property: "og:description", content: "Approve members, manage semester access and review career track requests." },
  ] }),
  component: Admin,
});

function Admin() {
  const { user } = useAuthUser();
  const { data: isAdmin, isSuccess } = useIsAdmin(user?.id);
  const nav = useNavigate();
  // Only bounce once the check has actually resolved to "not an admin".
  // Redirecting while the query is still idle/pending made the first click bounce back.
  useEffect(() => {
    if (isSuccess && isAdmin === false) nav({ to: "/dashboard" });
  }, [isAdmin, isSuccess, nav]);


  const [tab, setTab] = useState<"pending" | "approved" | "requests" | "notify" | "stats">("pending");
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const { data: all } = useQuery({
    queryKey: ["admin-profiles"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!isAdmin && tab === "stats",
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [approved, activeStreaks, tasksToday] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("current_streak", 1).eq("last_active_date", today),
        supabase.from("activity_history").select("id", { count: "exact", head: true }).eq("activity_type", "TARGET_COMPLETED"),
      ]);
      return {
        approved: approved.count ?? 0,
        activeStreaks: activeStreaks.count ?? 0,
        tasksTotal: tasksToday.count ?? 0,
      };
    },
  });

  const setApproval = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.rpc("admin_set_approval", { _user_id: id, _approved: approved });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["pending-count"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_profile", { _user_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["pending-count"] });
    },
  });

  const setSemesters = useMutation({
    mutationFn: async ({ id, count }: { id: string; count: number }) => {
      const { error } = await supabase.rpc("admin_set_semesters_unlocked", { _user_id: id, _count: count });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Semester access updated");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: requests } = useQuery({
    queryKey: ["admin-track-requests"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("track_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const setRequestStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("track_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["admin-track-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const pending = all?.filter((p) => !p.is_approved) ?? [];
  const approved = (all?.filter((p) => p.is_approved) ?? []).filter(
    (p) => !q || p.email.toLowerCase().includes(q.toLowerCase()) || (p.display_name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  if (!isAdmin)
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {isSuccess ? "Redirecting…" : "Checking admin access…"}
      </div>
    );


  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 items-center justify-center gap-3">
        <ShieldCheck className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin panel</h1>
      </div>

      <div className="mb-3 flex shrink-0 gap-1 overflow-x-auto border-b border-border">
        {(["pending", "approved", "requests", "notify", "stats"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t === "pending" && `Pending (${pending.length})`}
            {t === "approved" && "Approved users"}
            {t === "requests" && `Track requests (${(requests ?? []).filter((r) => r.status === "pending").length})`}
            {t === "notify" && "Notifications"}
            {t === "stats" && "Overview"}
          </button>
        ))}
      </div>

      {tab === "notify" && <div className="min-h-0 flex-1 overflow-y-auto"><AdminNotifications people={(all ?? []) as never} /></div>}

      {tab === "requests" && (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-card border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          {(requests ?? []).length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No career track requests yet.</div>
          )}
          {(requests ?? []).map((r) => {
            const p = all?.find((u) => u.id === r.user_id);
            return (
              <div key={r.id} className="flex items-center gap-3 p-4 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.requested_role_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p?.display_name || p?.email || "Unknown user"} · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.status === "approved" ? "bg-success/15 text-success" : r.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}
                >
                  {r.status}
                </span>
                {r.status === "pending" && (
                  <>
                    <button
                      onClick={() => setRequestStatus.mutate({ id: r.id, status: "approved" })}
                      className="flex items-center gap-1 rounded-md bg-success text-success-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
                    >
                      <Check className="size-4" /> Approve
                    </button>
                    <button
                      onClick={() => setRequestStatus.mutate({ id: r.id, status: "rejected" })}
                      className="flex items-center gap-1 rounded-md bg-destructive/10 text-destructive px-3 py-1.5 text-sm font-medium hover:bg-destructive/20"
                    >
                      <X className="size-4" /> Reject
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}


      {tab === "pending" && (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-card border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          {pending.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No pending approvals. All caught up!</div>}
          {pending.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4 border-b border-border last:border-0">
              <UserAvatar src={p.avatar_url} name={p.display_name || p.email} className="size-10 text-sm" />

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.display_name || "—"}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email} · joined {new Date(p.created_at).toLocaleDateString()}</div>
              </div>
              <button
                onClick={() => setApproval.mutate({ id: p.id, approved: true })}
                className="flex items-center gap-1 rounded-md bg-success text-success-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
              >
                <Check className="size-4" /> Approve
              </button>
              <button
                onClick={() => { if (confirm("Reject and delete this user?")) deleteProfile.mutate(p.id); }}
                className="flex items-center gap-1 rounded-md bg-destructive/10 text-destructive px-3 py-1.5 text-sm font-medium hover:bg-destructive/20"
              >
                <X className="size-4" /> Reject
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "approved" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-card border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            {approved.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-4 border-b border-border last:border-0">
                <UserAvatar src={p.avatar_url} name={p.display_name || p.email} className="size-10 text-sm" />

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.display_name || "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                </div>
                <div className="text-sm text-muted-foreground mr-3">{p.total_points} pts</div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
                  <Unlock className="size-3.5" />
                  Sems
                  <select
                    value={p.semesters_unlocked ?? 1}
                    onChange={(e) => setSemesters.mutate({ id: p.id, count: Number(e.target.value) })}
                    className="rounded-md border border-input bg-background px-1.5 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => setApproval.mutate({ id: p.id, approved: false })}
                  className="text-xs rounded-md bg-secondary text-secondary-foreground px-2.5 py-1.5 font-medium hover:opacity-90"
                >
                  Revoke
                </button>
              </div>
            ))}
            {approved.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No matches.</div>}
          </div>
        </div>
      )}

      {tab === "stats" && stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatBox icon={<Users className="size-5" />} label="Approved users" value={stats.approved} />
          <StatBox icon={<Activity className="size-5" />} label="Active streaks today" value={stats.activeStreaks} />
          <StatBox icon={<Check className="size-5" />} label="Total tasks completed" value={stats.tasksTotal} />
        </div>
      )}
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="size-10 rounded-lg bg-accent grid place-items-center text-accent-foreground">{icon}</div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
