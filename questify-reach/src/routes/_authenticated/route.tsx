import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDemoAuthEnabled, useAuthUser, useMyProfile, useIsAdmin } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Trophy, LayoutDashboard, ShieldCheck, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";
import NotificationBell from "@/components/NotificationBell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (isDemoAuthEnabled()) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = useAuthUser();
  const { data: profile, isLoading } = useMyProfile(user?.id);
  const { data: isAdmin } = useIsAdmin(user?.id);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    if (isLoading || !profile) return;
    const onPending = loc.pathname === "/pending";
    if (!profile.is_approved && !onPending) nav({ to: "/pending" });
    if (profile.is_approved && onPending) nav({ to: "/dashboard" });
  }, [profile, isLoading, loc.pathname, nav]);

  const { data: pendingCount } = useQuery({
    queryKey: ["pending-count"],
    enabled: !!isAdmin,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", false);
      return count ?? 0;
    },
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const signOut = async () => {
    if (isDemoAuthEnabled()) {
      window.localStorage.removeItem("streak-demo-auth");
      nav({ to: "/", replace: true });
      return;
    }

    await supabase.auth.signOut();
    nav({ to: "/", replace: true });
  };

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background">
      {/* Header with All Elements (Logo + Tabs + Notification/Actions) Centered as a Single Island */}
      <header className="z-30 shrink-0 border-b border-border bg-background/85 backdrop-blur-md pt-[env(safe-area-inset-top)] animate-header animate-reveal-down" style={{ "--stagger": 0 } as React.CSSProperties}>
        <div className="flex w-full items-center px-2 py-2 sm:px-3">
          
          {/* Centered Floating Island Unit */}
          <div className="depth-surface relative flex w-full items-center justify-between gap-2 rounded-2xl border-2 border-border/80 bg-secondary/40 p-1.5 shadow-md backdrop-blur-xl sm:gap-4">
            
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            {/* Streak Logo */}
            <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5 pl-2 sm:pl-3 group">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl text-base font-bold text-primary-foreground shadow-md transition-transform group-hover:scale-105" style={{ background: "var(--gradient-hero)" }}>S</div>
              <span className="hidden font-display pr-1 text-xl font-extrabold tracking-tight sm:inline">Streak</span>
            </Link>

            {profile?.is_approved && (
              <div className="h-6 w-px bg-border/80 hidden md:block shrink-0" />
            )}

            {/* Navigation Tabs */}
            {profile?.is_approved && (
              <nav aria-label="Main" className="hidden min-w-0 items-center gap-1.5 sm:gap-2 lg:flex shrink-0">
                <NavLink to="/dashboard" icon={<LayoutDashboard className="size-4" aria-hidden="true" />} label="Home" />
                <NavLink to="/leaderboard" icon={<Trophy className="size-4" aria-hidden="true" />} label="Leaderboard" />
                {isAdmin && (
                  <NavLink to="/admin" icon={<ShieldCheck className="size-4" aria-hidden="true" />} label="Admin" badge={pendingCount ?? 0} />
                )}
              </nav>
            )}
            </div>

            {/* Notification & User Actions */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2">
              <NotificationBell userId={user?.id} />
              <Link
                to="/me"
                aria-label="Open profile"
                title="Open profile"
                className={`rounded-full transition-opacity hover:opacity-80 ${loc.pathname.startsWith("/me") ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              >
                <UserAvatar src={profile?.avatar_url} name={profile?.display_name} className="size-9 text-xs shadow-sm" />
              </Link>

              <ThemeToggle />
              <button
                onClick={signOut}
                aria-label="Sign out"
                title="Sign out"
                className="grid size-9 sm:size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <LogOut className="size-4.5" aria-hidden="true" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Main Content with macOS fluid animated transition */}
      <main
        id="main"
        className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-2 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] pt-2 sm:px-3 lg:pb-3"
      >
        <div key={loc.pathname} className="animate-macos-tab flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {profile?.is_approved && (
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden animate-slide-up-in"
        >
          <div className={`mx-auto max-w-md px-3 py-1.5 grid gap-1 ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabLink to="/dashboard" icon={<LayoutDashboard className="size-5" aria-hidden="true" />} label="Home" />
            <TabLink to="/leaderboard" icon={<Trophy className="size-5" aria-hidden="true" />} label="Ranks" />
            {isAdmin && (
              <TabLink to="/admin" icon={<ShieldCheck className="size-5" aria-hidden="true" />} label="Admin" badge={pendingCount ?? 0} />
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

function NavLink({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: number }) {
  const loc = useLocation();
  const active = loc.pathname.startsWith(to);
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-2 text-base font-semibold transition-all ${
        active
          ? "bg-card text-foreground font-bold shadow-sm border border-border/80 macos-pill"
          : "text-muted-foreground hover:bg-card/40 hover:text-foreground hover:-translate-y-px"
      }`}
    >
      {icon}
      <span>{label}</span>
      {!!badge && badge > 0 && (
        <span className="ml-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{badge}</span>
      )}
    </Link>
  );
}

function TabLink({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: number }) {
  const loc = useLocation();
  const active = loc.pathname.startsWith(to);
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium animate-tab-indicator ${
        active ? "text-primary font-bold" : "text-muted-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
      {!!badge && badge > 0 && (
        <span className="absolute right-1/4 top-1.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{badge}</span>
      )}
    </Link>
  );
}
