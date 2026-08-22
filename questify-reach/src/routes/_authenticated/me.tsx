import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useMyProfile } from "@/hooks/useAuth";
import { toast } from "sonner";
import ActivityList from "@/components/ActivityList";
import UserAvatar from "@/components/UserAvatar";
import { Camera, Loader2, Lock, Trophy } from "lucide-react";
import { THEME_OPTIONS, useTheme } from "@/components/ThemeToggle";
import AuraFlame from "@/components/AuraFlame";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "My profile" },
      { name: "description", content: "Your points, streak, activity history and 4-year career roadmap." },
      { property: "og:title", content: "My profile" },
      { property: "og:description", content: "Your points, streak, activity history and 4-year career roadmap." },
    ],
  }),
  component: Me,
});

function Me() {
  const { user } = useAuthUser();
  const { data: profile } = useMyProfile(user?.id);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setName(profile.display_name || "");
  }, [profile]);

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/")) throw new Error("Please pick an image file");
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user!.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile picture updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden font-sans">
      <div className="grid h-full min-h-0 w-full gap-3 overflow-hidden md:grid-cols-2 md:gap-4">
        {/* YOUR PROFILE CARD */}
        <section className="flex min-h-0 flex-col overflow-y-auto rounded-[22px] border-2 border-border/80 bg-card p-5 text-card-foreground shadow-lg animate-reveal-up sm:p-7" style={{ "--stagger": 0 } as React.CSSProperties}>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">
            Account
          </div>
          <div className="text-[17px] font-bold mb-4.5">
            Your Profile
          </div>

          <div className="flex items-center gap-3.5 mb-5">
            <div className="relative">
              <UserAvatar
                src={profile?.avatar_url}
                name={name || profile?.display_name}
                className="size-[52px] rounded-[14px] text-lg font-bold"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadAvatar.isPending}
                aria-label="Change profile picture"
                className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow hover:scale-105 active:scale-95 disabled:opacity-60 transition-transform"
              >
                {uploadAvatar.isPending ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
              </button>
            </div>
            <div>
              <div className="text-[16px] font-bold">
                {name || profile?.display_name || "User"}
              </div>
              <div className="text-[13px] text-muted-foreground mt-0.5">
                {profile?.email || user?.email}
              </div>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) uploadAvatar.mutate(file);
            }}
          />

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-[16px] border border-border bg-secondary p-4 text-secondary-foreground animate-reveal-up" style={{ "--stagger": 1 } as React.CSSProperties}>
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5">
                <Trophy className="size-3 text-primary" /> Points
              </div>
              <div className="text-3xl font-extrabold mt-2 leading-none">
                {profile?.total_points ?? 0}
              </div>
            </div>
            <div className="rounded-[16px] border border-border bg-secondary p-4 text-secondary-foreground animate-reveal-up" style={{ "--stagger": 2 } as React.CSSProperties}>
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5">
                <AuraFlame className="size-3 text-primary" /> Streak
              </div>
              <div className="text-3xl font-extrabold mt-2 leading-none">
                {profile?.current_streak ?? 0}d
              </div>
            </div>
          </div>

          <label htmlFor="displayName" className="block text-[12px] font-semibold text-muted-foreground mb-2">
            Display name
          </label>
          <div className="flex min-w-0 gap-2 mb-2">
            <input
              id="displayName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 w-full rounded-[10px] border border-input bg-secondary px-3.5 py-3 text-[14px] text-secondary-foreground outline-none transition-colors focus:border-primary"
            />
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending || name === profile?.display_name}
              className="rounded-[10px] bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground transition-colors hover:opacity-80 hover-btn disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {save.isPending ? "Saving..." : "Save"}
            </button>
          </div>

          <div className="h-px bg-border my-[22px]" />

          <div className="text-[13px] font-bold flex items-center gap-2 mb-3.5">
            ⚙ Appearance
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {THEME_OPTIONS.map((o) => {
              const selected = theme === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setTheme(o.key)}
                  className={`rounded-[10px] border py-3 px-2 text-center text-[13px] font-medium transition-all ${
                    selected
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}
                >
                  <span className="mb-1 block text-base">{o.icon}</span>
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="text-[12px] text-muted-foreground mt-3 leading-relaxed">
            {theme === "amoled"
              ? "Pure pitch black and crisp white contrast optimized for OLED displays."
              : theme === "dark"
                ? "A sleek, balanced dark mode with subtle warm contrast."
                : "A clean, bright light interface."}
          </div>

          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mt-4.5 pt-3">
            <Lock className="size-3.5" />
            <span>Private — visible only to you</span>
          </div>

        </section>

        {/* YOUR OVERVIEW CARD */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border-2 border-border/80 bg-card p-5 text-card-foreground shadow-lg animate-reveal-up sm:p-7" style={{ "--stagger": 1 } as React.CSSProperties}>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">
              Dashboard
            </div>
            <div className="text-[17px] font-bold">
              Your Overview
            </div>
            <div className="text-[13px] text-muted-foreground mt-1 mb-5">
              A quick snapshot of where you stand right now.
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-[16px] border border-border bg-secondary p-4 text-secondary-foreground animate-reveal-up" style={{ "--stagger": 2 } as React.CSSProperties}>
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  Rank
                </div>
                <div className="text-3xl font-extrabold mt-2 leading-none">
                  #{profile?.total_points ? Math.max(1, 30 - Math.min(29, Math.floor(profile.total_points / 20))) : "--"}
                </div>
                <div className="text-[12px] text-muted-foreground mt-1">
                  Active rank
                </div>
              </div>

              <div className="rounded-[16px] border border-border bg-secondary p-4 text-secondary-foreground animate-reveal-up" style={{ "--stagger": 3 } as React.CSSProperties}>
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  Total XP
                </div>
                <div className="text-3xl font-extrabold mt-2 leading-none">
                  {profile?.total_points ?? 0}
                </div>
                <div className="text-[12px] text-muted-foreground mt-1">
                  all-time earned
                </div>
              </div>

              <div className="rounded-[16px] border border-border bg-secondary p-4 text-secondary-foreground animate-reveal-up" style={{ "--stagger": 4 } as React.CSSProperties}>
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  Streak
                </div>
                <div className="text-3xl font-extrabold mt-2 leading-none">
                  {profile?.current_streak ?? 0}d
                </div>
                <div className="text-[12px] text-muted-foreground mt-1">
                  current streak
                </div>
              </div>

              <div className="rounded-[16px] border border-border bg-secondary p-4 text-secondary-foreground animate-reveal-up" style={{ "--stagger": 5 } as React.CSSProperties}>
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  Status
                </div>
                <div className="text-[22px] font-extrabold text-primary mt-1 leading-none">
                  {profile?.is_approved ? "Active" : "Pending"}
                </div>
                <div className="text-[12px] text-muted-foreground mt-1">
                  membership
                </div>
              </div>
            </div>

            <div className="text-[13px] font-bold mb-3">
              Recent activity <span className="text-muted-foreground font-normal">· Last 30 days</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-[12px] border border-border bg-secondary p-3">
              <ActivityList userId={user.id} />
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
