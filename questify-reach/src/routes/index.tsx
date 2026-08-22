import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Flame, Target, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Build habits with friends" },
      { name: "description", content: "Sign in to set daily targets, log CGPA, and compete on a live leaderboard." },
      { property: "og:title", content: "Build habits with friends" },
      { property: "og:description", content: "Sign in to set daily targets, log CGPA, and compete on a live leaderboard." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const cardsReveal = useScrollReveal("up");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/dashboard" });
    });
  }, [nav]);

  const enterDemoMode = () => {
    window.localStorage.setItem("streak-demo-auth", "1");
    toast.success("Welcome to Demo Mode!", {
      description: "Signed in as demo account with full dashboard access.",
    });
    nav({ to: "/dashboard" });
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        console.warn("Supabase Google Auth Error:", error);
        toast.error("Google OAuth not configured in Supabase", {
          description: "Missing OAuth Secret in Supabase dashboard. You can use Instant Demo Access below to sign in immediately!",
          duration: 7000,
        });
        setLoading(false);
      }
    } catch (err) {
      toast.error("Failed to start sign-in. Use Demo Access to test immediately.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background" style={{ backgroundImage: "var(--gradient-glow)" }}>
      <header className="mx-auto flex w-full max-w-5xl shrink-0 items-center justify-between px-6 py-4 animate-reveal-down" style={{ "--stagger": 0 } as React.CSSProperties}>
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl grid place-items-center text-primary-foreground font-bold" style={{ background: "var(--gradient-hero)" }}>S</div>
          <span className="font-display font-bold text-lg">Streak</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-center overflow-hidden px-6 py-4 text-center">
        <div className="w-full max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground animate-reveal-up" style={{ "--stagger": 1 } as React.CSSProperties}>
            <Flame className="size-3.5" /> Invite-only accountability community
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight animate-reveal-up md:text-5xl lg:text-6xl" style={{ "--stagger": 2 } as React.CSSProperties}>
            Show up daily.<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
              Earn your streak.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground animate-reveal-up md:text-lg" style={{ "--stagger": 3 } as React.CSSProperties}>
            Set daily targets, log your CGPA, and race friends up a real-time leaderboard. Honesty-based points, streak bonuses, zero fluff.
          </p>

          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 animate-reveal-up sm:flex-row sm:items-center" style={{ "--stagger": 4 } as React.CSSProperties}>
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-card px-5 py-3 font-medium shadow-lg border border-border hover:shadow-xl hover-btn transition disabled:opacity-60"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <GoogleIcon />
              {loading ? "Redirecting…" : "Continue with Google"}
            </button>

            <button
              onClick={enterDemoMode}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground shadow-md hover:opacity-90 hover-btn transition"
            >
              <Sparkles className="size-4" />
              Instant Demo Access
              <ArrowRight className="size-4" />
            </button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground animate-reveal-up" style={{ "--stagger": 5 } as React.CSSProperties}>
            New accounts need admin approval before accessing the platform • Instant Demo allows quick access.
          </p>
        </div>

        <div className="mt-8 grid w-full max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Target, title: "Daily Targets", desc: "+5 pts per goal you honestly mark done." },
            { icon: Flame, title: "Streak Bonuses", desc: "Consecutive days multiply your rewards." },
            { icon: TrendingUp, title: "CGPA Engine", desc: "8 semesters × 10 = permanent bragging rights." },
            { icon: Trophy, title: "Live Leaderboard", desc: "Watch the ranking shift in real time." },
          ].map((f, i) => (
            <div
              key={f.title}
              ref={cardsReveal}
              className="rounded-2xl bg-card p-4 border border-border hover-lift text-left"
              style={{ boxShadow: "var(--shadow-card)", "--stagger": i } as React.CSSProperties}
            >
              <div className="size-10 rounded-lg bg-accent grid place-items-center text-accent-foreground">
                <f.icon className="size-5" />
              </div>
              <div className="mt-3 font-semibold">{f.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.5C42.1 35.9 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
