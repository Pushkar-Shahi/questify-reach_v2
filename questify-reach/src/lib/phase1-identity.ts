/**
 * PHASE 1 - Identity Layer & Behavior-Based Badges
 *
 * Features:
 * 1. Behavior-based titles ("Consistent", "Comeback Kid", "Deep Worker")
 * 2. Career identity selection at signup
 * 3. Visual badges and titles system
 * 4. Identity-aligned UI references throughout the app
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type CareerIdentity =
  | "Backend Engineer"
  | "Frontend Engineer"
  | "Full-Stack Engineer"
  | "MLOps Engineer"
  | "Data Analyst"
  | "DevOps Engineer"
  | "Mobile Engineer"
  | "Product Manager"
  | "Other";

export const CAREER_IDENTITIES: Record<CareerIdentity, { emoji: string; color: string }> = {
  "Backend Engineer": { emoji: "⚙️", color: "from-blue-500 to-blue-600" },
  "Frontend Engineer": { emoji: "🎨", color: "from-purple-500 to-pink-600" },
  "Full-Stack Engineer": { emoji: "🔗", color: "from-indigo-500 to-purple-600" },
  "MLOps Engineer": { emoji: "🤖", color: "from-amber-500 to-orange-600" },
  "Data Analyst": { emoji: "📊", color: "from-green-500 to-emerald-600" },
  "DevOps Engineer": { emoji: "🚀", color: "from-red-500 to-pink-600" },
  "Mobile Engineer": { emoji: "📱", color: "from-cyan-500 to-blue-600" },
  "Product Manager": { emoji: "🎯", color: "from-yellow-500 to-orange-600" },
  Other: { emoji: "🌟", color: "from-gray-500 to-gray-600" },
};

export type BadgeType = "consistent" | "comeback_kid" | "deep_worker" | "streak_master" | "social_butterfly";

export const BADGE_DEFINITIONS: Record<
  BadgeType,
  { title: string; emoji: string; description: string }
> = {
  consistent: {
    title: "Consistent",
    emoji: "🎯",
    description: "Maintained a 7-day streak or longer",
  },
  comeback_kid: {
    title: "Comeback Kid",
    emoji: "💪",
    description: "Revived your streak after missing days",
  },
  deep_worker: {
    title: "Deep Worker",
    emoji: "🔥",
    description: "Completed 5+ tasks in a single day",
  },
  streak_master: {
    title: "Streak Master",
    emoji: "⚡",
    description: "Maintained a 30-day streak",
  },
  social_butterfly: {
    title: "Social Butterfly",
    emoji: "🦋",
    description: "Joined a pod or invited a friend",
  },
};

export interface UserIdentity {
  career_identity: CareerIdentity | null;
  preferred_identity_emoji: string | null;
  badges: Array<{
    type: BadgeType;
    earnedAt: string;
    metadata?: Record<string, any>;
  }>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get user's career identity and badges
 */
export function useUserIdentity(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-identity", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("career_identity, preferred_identity_emoji")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      const { data: badges, error: badgesError } = await supabase
        .from("user_badges")
        .select("badge_type, earned_at, metadata, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("earned_at", { ascending: false });

      if (badgesError) throw badgesError;

      return {
        career_identity: profile?.career_identity as CareerIdentity | null,
        preferred_identity_emoji: profile?.preferred_identity_emoji,
        badges: badges?.map((b) => ({
          type: b.badge_type as BadgeType,
          earnedAt: b.earned_at,
          metadata: b.metadata,
        })) || [],
      };
    },
    enabled: !!userId,
  });
}

/**
 * Update user's career identity
 */
export function useUpdateIdentity(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (identity: CareerIdentity) => {
      if (!userId) throw new Error("User ID required");

      const emoji = CAREER_IDENTITIES[identity]?.emoji || "🌟";

      const { error } = await supabase
        .from("profiles")
        .update({
          career_identity: identity,
          preferred_identity_emoji: emoji,
        })
        .eq("id", userId);

      if (error) throw error;

      return { identity, emoji };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-identity", userId] });
    },
  });
}

// ============================================================================
// BADGE EARNING LOGIC
// ============================================================================

/**
 * Compute badges for a user based on their current stats
 * Should be called nightly or after major actions
 */
export async function updateUserBadges(userId: string) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_streak, total_points")
      .eq("id", userId)
      .single();

    if (!profile) return { awarded: 0 };

    let awarded = 0;

    // 1. Check for "Consistent" badge (7+ day streak)
    if (profile.current_streak >= 7) {
      const exists = await checkBadgeExists(userId, "consistent");
      if (!exists) {
        await createBadge(userId, "consistent", { currentStreak: profile.current_streak });
        awarded++;
      }
    }

    // 2. Check for "Streak Master" badge (30+ day streak)
    if (profile.current_streak >= 30) {
      const exists = await checkBadgeExists(userId, "streak_master");
      if (!exists) {
        await createBadge(userId, "streak_master", { currentStreak: profile.current_streak });
        awarded++;
      }
    }

    // 3. Check for "Comeback Kid" badge (recovered after break)
    // This requires pattern detection - simplified implementation
    const hasComebackPattern = await detectComebackPattern(userId);
    if (hasComebackPattern) {
      const exists = await checkBadgeExists(userId, "comeback_kid");
      if (!exists) {
        await createBadge(userId, "comeback_kid");
        awarded++;
      }
    }

    // 4. Check for "Deep Worker" badge (5+ tasks today)
    const tasksToday = await countTasksCompletedToday(userId);
    if (tasksToday >= 5) {
      // Create a new badge each time (allow multiple)
      await createBadge(userId, "deep_worker", { tasksCompletedToday: tasksToday });
      awarded++;
    }

    return { awarded, streak: profile.current_streak };
  } catch (error) {
    console.error("Error updating badges:", error);
    return { awarded: 0, error };
  }
}

async function checkBadgeExists(userId: string, badgeType: BadgeType): Promise<boolean> {
  const { data } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_type", badgeType)
    .single();

  return !!data;
}

async function createBadge(
  userId: string,
  badgeType: BadgeType,
  metadata?: Record<string, any>
) {
  const def = BADGE_DEFINITIONS[badgeType];

  const { error } = await supabase.from("user_badges").insert({
    user_id: userId,
    badge_type: badgeType,
    title: def.title,
    description: def.description,
    metadata: metadata || {},
  });

  if (error) console.error("Error creating badge:", error);
}

async function detectComebackPattern(userId: string): Promise<boolean> {
  const { data: snapshots } = await supabase
    .from("daily_snapshots")
    .select("streak_maintained")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(15);

  if (!snapshots || snapshots.length < 4) return false;

  // Look for pattern: [false, false, true] = break then recovery
  const recentPattern = snapshots.map((s: any) => s.streak_maintained);

  for (let i = 0; i < recentPattern.length - 2; i++) {
    if (recentPattern[i] === true && recentPattern[i + 1] === false && recentPattern[i + 2] === false && recentPattern[i + 3] === true) {
      return true;
    }
  }

  return false;
}

async function countTasksCompletedToday(userId: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("is_completed", true)
    .gte("completed_at", `${today}T00:00:00`)
    .lt("completed_at", `${today}T23:59:59`);

  if (error) {
    console.error("Error counting tasks:", error);
    return 0;
  }

  return data?.length || 0;
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get user's identity display name and emoji
 */
export function getIdentityDisplay(identity: CareerIdentity | null) {
  if (!identity) return null;

  const config = CAREER_IDENTITIES[identity];
  return {
    name: identity,
    emoji: config.emoji,
    color: config.color,
  };
}

/**
 * Get badge display info
 */
export function getBadgeDisplay(badgeType: BadgeType) {
  return BADGE_DEFINITIONS[badgeType];
}

/**
 * Format user display with identity and badges
 */
export function formatUserDisplay(userIdentity: UserIdentity | null) {
  if (!userIdentity) return { name: "User", emoji: "🌟", badges: [] };

  const identity = getIdentityDisplay(userIdentity.career_identity);
  const badges = userIdentity.badges.map((b) => getBadgeDisplay(b.type));

  return {
    name: userIdentity.career_identity || "User",
    emoji: userIdentity.preferred_identity_emoji || "🌟",
    identity,
    badges,
  };
}
