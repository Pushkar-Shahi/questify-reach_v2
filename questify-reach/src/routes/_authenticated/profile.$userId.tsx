import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import AuraFlame from "@/components/AuraFlame";
import ActivityList from "@/components/ActivityList";
import UserAvatar from "@/components/UserAvatar";

const PLACEHOLDER_PROFILES = {
  "placeholder-divya": { id: "placeholder-divya", display_name: "Divya Singh", avatar_url: null, total_points: 247, current_streak: 2 },
  "placeholder-blank": { id: "placeholder-blank", display_name: "Blank", avatar_url: null, total_points: 180, current_streak: 3 },
  "placeholder-alex": { id: "placeholder-alex", display_name: "Alex Morgan", avatar_url: null, total_points: 156, current_streak: 5 },
  "placeholder-sam": { id: "placeholder-sam", display_name: "Sam Carter", avatar_url: null, total_points: 132, current_streak: 4 },
} as const;

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  head: () => ({ meta: [{ title: "Profile" }] }),
  component: PublicProfile,
});

function PublicProfile() {
  const { userId } = Route.useParams();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data ?? PLACEHOLDER_PROFILES[userId as keyof typeof PLACEHOLDER_PROFILES] ?? {
        id: userId,
        display_name: "Anonymous Player",
        avatar_url: null,
        total_points: 0,
        current_streak: 0,
      };
    },
  });
  const { data: cgpa } = useQuery({
    queryKey: ["public-cgpa", userId],
    queryFn: async () => {
      const { data } = await supabase.from("semester_cgpa").select("*").eq("user_id", userId).order("semester_number");
      return data ?? [];
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  const resolvedProfile = profile ?? PLACEHOLDER_PROFILES[userId as keyof typeof PLACEHOLDER_PROFILES] ?? {
    id: userId,
    display_name: "Anonymous Player",
    avatar_url: null,
    total_points: 0,
    current_streak: 0,
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <section className="mb-3 shrink-0 rounded-[22px] border border-primary/20 p-5 text-primary-foreground shadow-xl sm:p-7" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}>
        <div className="flex items-center gap-5">
          <UserAvatar src={resolvedProfile.avatar_url} name={resolvedProfile.display_name} className="size-24 border-2 border-white/50 bg-white/20 text-3xl shadow-lg" />

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{resolvedProfile.display_name || "Anonymous"}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-5 text-sm opacity-95">
              <span className="flex items-center gap-1.5"><Trophy className="size-4" /> {resolvedProfile.total_points} pts</span>
              <span className="flex items-center gap-1.5"><AuraFlame className="size-4" /> {resolvedProfile.current_streak} day streak</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-2">
        <section className="min-h-0 overflow-y-auto rounded-2xl border-2 border-border/80 bg-card p-4 text-card-foreground shadow-lg sm:p-6">
          <h2 className="text-xl font-bold mb-5">CGPA</h2>
          {cgpa?.length === 0 && <p className="text-sm text-muted-foreground">No semesters logged yet.</p>}
          <ul className="space-y-1.5">
            {cgpa?.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Semester {c.semester_number}</span>
                <span className="font-medium">{c.cgpa_value} <span className="text-xs text-muted-foreground">({c.points_earned}pt)</span></span>
              </li>
            ))}
          </ul>
        </section>
        <section className="min-h-0 overflow-y-auto rounded-2xl border-2 border-border/80 bg-card p-4 text-card-foreground shadow-lg sm:p-6">
          <h2 className="text-xl font-bold mb-5">Recent activity</h2>
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
            <ActivityList userId={userId} />
          </div>
        </section>
      </div>
    </div>
  );
}
