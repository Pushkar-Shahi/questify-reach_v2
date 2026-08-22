import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import AuraFlame from "@/components/AuraFlame";
import { useAuthUser } from "@/hooks/useAuth";
import { ultimateScore } from "@/lib/career";
import UserAvatar from "@/components/UserAvatar";


export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [
    { title: "Leaderboard" },
    { name: "description", content: "Live rankings by daily grind, career track completion and the ultimate blended score." },
    { property: "og:title", content: "Leaderboard" },
    { property: "og:description", content: "Live rankings by daily grind, career track completion and the ultimate blended score." },
  ] }),
  component: Leaderboard,
});

type Mode = "daily" | "career" | "ultimate";

const MODES: { key: Mode; label: string }[] = [
  { key: "daily", label: "Daily Grind" },
  { key: "career", label: "Career Track" },
  { key: "ultimate", label: "Ultimate" },
];

const PLACEHOLDER_PLAYERS = [
  { id: "placeholder-divya", display_name: "Divya Singh", avatar_url: null, total_points: 247, current_streak: 2, is_approved: true },
  { id: "placeholder-blank", display_name: "Blank", avatar_url: null, total_points: 180, current_streak: 3, is_approved: true },
  { id: "placeholder-alex", display_name: "Alex Morgan", avatar_url: null, total_points: 156, current_streak: 5, is_approved: true },
  { id: "placeholder-sam", display_name: "Sam Carter", avatar_url: null, total_points: 132, current_streak: 4, is_approved: true },
] as const;

function Leaderboard() {
  const { user } = useAuthUser();
  const [mode, setMode] = useState<Mode>("daily");

  const { data: profiles } = useQuery({
    queryKey: ["leaderboard"],
    staleTime: 1000 * 15,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_points, current_streak, is_approved")
        .eq("is_approved", true)
        .order("total_points", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: career } = useQuery({
    queryKey: ["career-leaderboard"],
    staleTime: 1000 * 20,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("career_leaderboard");
      if (error) throw error;
      return data;
    },
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const careerBy = new Map((career ?? []).map((c) => [c.user_id, c]));

  const rows = [...(profiles ?? []), ...PLACEHOLDER_PLAYERS]
    .map((p) => {
      const c = careerBy.get(p.id);
      const percent = Number(c?.percent ?? 0);
      return {
        ...p,
        percent,
        trackTitle: c?.track_title ?? null,
        ultimate: ultimateScore(p.total_points, percent),
      };
    })
    .sort((a, b) =>
      mode === "daily"
        ? b.total_points - a.total_points
        : mode === "career"
          ? b.percent - a.percent
          : b.ultimate - a.ultimate,
    );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-1">
      <div className="mb-2 flex shrink-0 flex-col items-start gap-3 animate-reveal-up" style={{ "--stagger": 0 } as React.CSSProperties}>
        <div className="flex items-center gap-3">
          <Trophy className="size-7 text-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight">Leaderboard</h1>
        </div>

        <div className="inline-flex w-full min-w-0 rounded-full p-1.5 macos-segmented-track shadow-sm sm:w-auto">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex-1 sm:flex-none rounded-full px-6 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                mode === m.key
                  ? "bg-card text-foreground shadow-md border border-border/80 macos-pill font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/30"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-5 mt-1 max-w-2xl shrink-0 text-left text-sm leading-relaxed text-muted-foreground animate-reveal-fade" style={{ "--stagger": 2 } as React.CSSProperties}>
        {mode === "daily" && "Ranked by daily habit points, streak bonuses and CGPA points."}
        {mode === "career" && "Ranked strictly by Career Chance Meter completion (0–100%)."}
        {mode === "ultimate" && "Blended score: (0.5 × daily points) + (0.5 × career points ÷ 10)."}
      </p>

      {rows.length >= 3 && (
        <div className="mb-3 grid shrink-0 grid-cols-3 items-end gap-2 sm:gap-4">
          {[1, 0, 2].map((idx, order) => {
            const r = rows[idx];
            const place = idx + 1;
            const value =
              mode === "daily"
                ? `${r.total_points} XP`
                : mode === "career"
                  ? `${Math.round(r.percent * 10) / 10}%`
                  : `${Math.round(r.ultimate * 10) / 10}`;
            return (
              <Link
                key={r.id}
                to="/profile/$userId"
                params={{ userId: r.id }}
                className={`depth-surface animate-reveal-up flex min-h-[120px] flex-col items-center justify-center rounded-2xl border-2 border-border/80 bg-card px-2 py-3 text-center hover-lift sm:min-h-[150px] sm:px-3 sm:py-4 ${
                  place === 1 ? "order-none -mt-4" : ""
                }`}
                style={{
                  ...(place === 1 ? { boxShadow: "var(--shadow-glow)" } : { boxShadow: "var(--shadow-card)" }),
                  "--stagger": order,
                } as React.CSSProperties}
              >
                <div className={place === 1 ? "glow-ring rounded-full" : ""}>
                  <UserAvatar
                    src={r.avatar_url}
                    name={r.display_name}
                    className={place === 1 ? "size-14 text-lg sm:size-20 sm:text-xl" : "size-12 text-base sm:size-16 sm:text-lg"}
                  />
                </div>
                <span className="mt-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}
                </span>
                <span className="mt-2 w-full truncate text-base font-semibold">{r.display_name || "Anonymous"}</span>
                <span className="text-sm text-primary">{value}</span>
              </Link>
            );
          })}
        </div>
      )}



      <div className="depth-surface min-h-0 flex-1 overflow-y-auto rounded-2xl border-2 border-border/80 bg-card animate-reveal-up" style={{ boxShadow: "var(--shadow-card)", "--stagger": 3 } as React.CSSProperties}>
        {rows.map((r, i) => {
          const me = r.id === user?.id;
          return (
            <Link
              key={r.id}
              to="/profile/$userId"
              params={{ userId: r.id }}
              className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted transition sm:gap-4 sm:px-6 sm:py-3.5 ${me ? "bg-accent/40" : ""}`}
              style={{ "--stagger": Math.min(i, 8) } as React.CSSProperties}
            >
              <div className={`w-8 text-center font-bold ${i === 0 ? "text-primary text-lg" : i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                {i + 1}
              </div>
              <UserAvatar src={r.avatar_url} name={r.display_name} className="size-11 text-sm" />

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {r.display_name || "Anonymous"}
                  {me && <span className="ml-2 text-xs text-primary">you</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {mode === "career" || mode === "ultimate" ? (
                    <span className="truncate">{r.trackTitle ?? "No track selected"}</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AuraFlame className="size-3" /> {r.current_streak} day streak
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">
                  {mode === "daily" && r.total_points}
                  {mode === "career" && `${Math.round(r.percent * 10) / 10}%`}
                  {mode === "ultimate" && Math.round(r.ultimate * 10) / 10}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {mode === "daily" ? "pts" : mode === "career" ? "complete" : "score"}
                </div>
              </div>
            </Link>
          );
        })}
        {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No approved players yet.</div>}
      </div>
    </div>
  );
}
