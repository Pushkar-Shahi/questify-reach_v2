import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const DEMO_AUTH_KEY = "streak-demo-auth";

export function isDemoAuthEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEMO_AUTH_KEY) === "1";
}

export const demoUser = {
  id: "demo-user",
  email: "pusher.shahi@gmail.com",
  user_metadata: { full_name: "Puskar Shahi" },
} as unknown as User;

export const demoProfile: Profile = {
  id: "demo-user",
  email: "pusher.shahi@gmail.com",
  display_name: "Puskar Shahi",
  avatar_url: null,
  is_approved: true,
  semesters_unlocked: 8,
  total_points: 241,
  current_streak: 1,
  last_active_date: new Date().toISOString().slice(0, 10),
};

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    if (isDemoAuthEnabled()) {
      setUser(demoUser);
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") qc.clear();
      else qc.invalidateQueries();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  return { user, loading };
}

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_approved: boolean;
  semesters_unlocked: number;
  total_points: number;
  current_streak: number;
  last_active_date: string | null;
};

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    queryFn: async () => {
      if (isDemoAuthEnabled()) return demoProfile;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useIsAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      if (isDemoAuthEnabled()) return true;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}
