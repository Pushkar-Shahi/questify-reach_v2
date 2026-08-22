/**
 * PHASE 0: Unified Tasks Model & Server-Side Calculations
 * 
 * This file provides:
 * 1. Unified task type definitions
 * 2. Migration helpers to convert old tasks to new format
 * 3. Server-side streak and points calculation functions
 * 4. Idempotent daily snapshot logic
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TaskType = "custom" | "curated_mission" | "recurring" | "spaced_review";

export interface UnifiedTask {
  id: string;
  user_id: string;
  
  // Identification
  title: string;
  description: string | null;
  type: TaskType;
  category: string | null;
  
  // Scheduling
  target_date: string | null; // ISO date
  due_time: string | null; // HH:MM
  timezone: string;
  
  // Recurrence
  recurrence_pattern: "daily" | "weekly" | "biweekly" | "monthly" | null;
  recurrence_end_date: string | null; // ISO date
  
  // Spaced repetition
  original_task_id: string | null;
  review_interval_days: number | null;
  last_reviewed_at: string | null; // ISO timestamp
  next_review_date: string | null; // ISO date
  difficulty_estimate: number | null; // 1-5
  
  // Progress
  is_completed: boolean;
  completed_at: string | null; // ISO timestamp
  points_awarded: number;
  
  // Metadata
  is_archived: boolean;
  sort_order: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface DailySnapshot {
  id: string;
  user_id: string;
  snapshot_date: string; // ISO date
  tasks_completed: number;
  points_earned: number;
  streak_maintained: boolean;
  calculated_at: string; // ISO timestamp
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: "consistent" | "comeback_kid" | "deep_worker" | "streak_master" | "social_butterfly";
  title: string;
  description: string | null;
  earned_at: string; // ISO timestamp
  is_active: boolean;
  metadata: Record<string, any> | null;
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Migrate all daily_targets to new unified tasks table
 */
export async function migrateCustomTargets(userId: string) {
  try {
    // Fetch old daily_targets
    const { data: oldTargets, error: fetchError } = await supabase
      .from("daily_targets")
      .select("*")
      .eq("user_id", userId);

    if (fetchError) throw fetchError;

    if (!oldTargets || oldTargets.length === 0) {
      return { migrated: 0, error: null };
    }

    // Transform to new format
    const newTasks = oldTargets.map((t: any) => ({
      user_id: userId,
      title: t.title,
      type: "custom" as TaskType,
      category: "General",
      target_date: t.target_date,
      due_time: null,
      timezone: "UTC",
      recurrence_pattern: null,
      recurrence_end_date: null,
      original_task_id: null,
      review_interval_days: null,
      last_reviewed_at: null,
      next_review_date: null,
      difficulty_estimate: null,
      is_completed: t.is_done,
      completed_at: t.completed_at,
      points_awarded: 5, // Default
      is_archived: false,
      sort_order: 0,
      created_at: t.created_at,
      updated_at: t.created_at,
    }));

    // Insert new tasks
    const { error: insertError, data: inserted } = await supabase
      .from("tasks")
      .insert(newTasks)
      .select();

    if (insertError) throw insertError;

    return { migrated: inserted?.length || 0, error: null };
  } catch (error) {
    return { migrated: 0, error };
  }
}

/**
 * Migrate all track_tasks to new unified tasks table
 */
export async function migrateCuratedMissions(userId: string) {
  try {
    // Fetch track_tasks for user's selected track
    const { data: userCareerProgress } = await supabase
      .from("user_career_progress")
      .select("task_id")
      .eq("user_id", userId);

    if (!userCareerProgress || userCareerProgress.length === 0) {
      return { migrated: 0, error: null };
    }

    const taskIds = userCareerProgress.map((p: any) => p.task_id);

    const { data: trackTasks, error: fetchError } = await supabase
      .from("track_tasks")
      .select("*")
      .in("id", taskIds);

    if (fetchError) throw fetchError;

    if (!trackTasks || trackTasks.length === 0) {
      return { migrated: 0, error: null };
    }

    // Transform to new format
    const newTasks = trackTasks.map((t: any) => ({
      user_id: userId,
      title: t.title,
      type: "curated_mission" as TaskType,
      description: t.description,
      category: t.category_name,
      target_date: null,
      due_time: null,
      timezone: "UTC",
      recurrence_pattern: null,
      recurrence_end_date: null,
      original_task_id: null,
      review_interval_days: 30, // Default 30-day resurfacing
      last_reviewed_at: null,
      next_review_date: null,
      difficulty_estimate: null,
      is_completed: false,
      completed_at: null,
      points_awarded: 10, // Curated missions worth more
      is_archived: false,
      sort_order: t.sort_order,
      created_at: t.created_at,
      updated_at: t.created_at,
    }));

    // Insert new tasks
    const { error: insertError, data: inserted } = await supabase
      .from("tasks")
      .insert(newTasks)
      .select();

    if (insertError) throw insertError;

    return { migrated: inserted?.length || 0, error: null };
  } catch (error) {
    return { migrated: 0, error };
  }
}

// ============================================================================
// SERVER-SIDE CALCULATIONS (Idempotent, Timezone-Aware)
// ============================================================================

/**
 * Calculate current streak for a user (using daily snapshots for idempotency)
 * Should be called nightly via scheduled function
 */
export async function updateUserStreak(userId: string, timezone: string = "UTC") {
  try {
    // Get today's date in user's timezone
    const todayUTC = new Date();
    const todayLocal = new Date(
      todayUTC.toLocaleString("en-US", { timeZone: timezone })
    );
    const todayISO = todayLocal.toISOString().split("T")[0];

    // Check if snapshot exists for today
    const { data: existingSnapshot } = await supabase
      .from("daily_snapshots")
      .select("*")
      .eq("user_id", userId)
      .eq("snapshot_date", todayISO)
      .single();

    // Count tasks completed today
    const { data: todayTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, points_awarded")
      .eq("user_id", userId)
      .eq("is_completed", true)
      .gte("completed_at", `${todayISO}T00:00:00`)
      .lt("completed_at", `${todayISO}T23:59:59`);

    if (tasksError) throw tasksError;

    const tasksCompleted = todayTasks?.length || 0;
    const pointsEarned = todayTasks?.reduce((sum, t: any) => sum + t.points_awarded, 0) || 0;

    if (existingSnapshot) {
      // Update existing snapshot (idempotent)
      await supabase
        .from("daily_snapshots")
        .update({
          tasks_completed: tasksCompleted,
          points_earned: pointsEarned,
          streak_maintained: tasksCompleted > 0,
          calculated_at: new Date().toISOString(),
        })
        .eq("id", existingSnapshot.id);
    } else {
      // Create new snapshot
      await supabase
        .from("daily_snapshots")
        .insert({
          user_id: userId,
          snapshot_date: todayISO,
          tasks_completed: tasksCompleted,
          points_earned: pointsEarned,
          streak_maintained: tasksCompleted > 0,
        });
    }

    // Now calculate streak based on snapshots
    const streakDays = await calculateStreakFromSnapshots(userId);

    // Update user's profile with new streak
    await supabase
      .from("profiles")
      .update({ current_streak: streakDays, updated_at: new Date().toISOString() })
      .eq("id", userId);

    return { streak: streakDays, pointsEarned, error: null };
  } catch (error) {
    console.error("Error updating user streak:", error);
    return { streak: 0, pointsEarned: 0, error };
  }
}

/**
 * Calculate current streak from daily snapshots (backward)
 */
async function calculateStreakFromSnapshots(userId: string): Promise<number> {
  const { data: snapshots, error } = await supabase
    .from("daily_snapshots")
    .select("snapshot_date, streak_maintained")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(100); // Last 100 days max

  if (error || !snapshots) return 0;

  let streak = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const snapshot of snapshots) {
    const snapshotDate = new Date(snapshot.snapshot_date);
    const dayDiff = Math.floor(
      (today.getTime() - snapshotDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If gap > 1 day, streak is broken
    if (dayDiff > streak + 1) break;

    if (snapshot.streak_maintained) {
      streak++;
    } else if (dayDiff === streak) {
      // Today, can skip
      continue;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate total points for user (server-side, idempotent)
 */
export async function calculateUserTotalPoints(userId: string): Promise<number> {
  try {
    // Sum points from all completed tasks
    const { data, error } = await supabase
      .from("tasks")
      .select("points_awarded")
      .eq("user_id", userId)
      .eq("is_completed", true);

    if (error) throw error;

    const total = data?.reduce((sum, t) => sum + t.points_awarded, 0) || 0;

    // Update profile
    await supabase
      .from("profiles")
      .update({ total_points: total, updated_at: new Date().toISOString() })
      .eq("id", userId);

    return total;
  } catch (error) {
    console.error("Error calculating total points:", error);
    return 0;
  }
}

// ============================================================================
// BADGE CALCULATION (Behavior-Based Titles for Phase 1)
// ============================================================================

/**
 * Award badge if criteria met (check before calling)
 */
export async function awardBadge(
  userId: string,
  badgeType: UserBadge["badge_type"],
  title: string,
  description: string,
  metadata?: Record<string, any>
) {
  try {
    // Check if badge already exists
    const { data: existing } = await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_type", badgeType)
      .single();

    if (existing) {
      // Update metadata if exists
      return await supabase
        .from("user_badges")
        .update({ metadata, is_active: true })
        .eq("id", existing.id)
        .select()
        .single();
    }

    // Create new badge
    return await supabase
      .from("user_badges")
      .insert({
        user_id: userId,
        badge_type: badgeType,
        title,
        description,
        metadata,
      })
      .select()
      .single();
  } catch (error) {
    console.error("Error awarding badge:", error);
    return null;
  }
}

/**
 * Check and award "Consistent" badge (7+ day streak)
 */
export async function checkConsistentBadge(userId: string, currentStreak: number) {
  if (currentStreak >= 7) {
    await awardBadge(userId, "consistent", "🎯 Consistent", "Maintained a 7-day streak", {
      currentStreak,
    });
  }
}

/**
 * Check and award "Comeback Kid" badge (revived after 3+ missed days)
 */
export async function checkComebackKidBadge(userId: string) {
  // TODO: Implement comeback detection logic
  // Look for pattern: streak break + immediate recovery
  const { data: snapshots } = await supabase
    .from("daily_snapshots")
    .select("streak_maintained")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(10);

  if (!snapshots) return;

  // Look for pattern: [false, false, false, true] = streak broken then immediately recovered
  const recentPattern = snapshots.map((s: any) => s.streak_maintained);

  // Simplified: check if had break then recovery
  if (
    recentPattern.includes(false) &&
    recentPattern.indexOf(true) > recentPattern.lastIndexOf(false)
  ) {
    await awardBadge(userId, "comeback_kid", "💪 Comeback Kid", "Revived your streak after a break", {
      recoveryDate: new Date().toISOString(),
    });
  }
}

/**
 * Check and award "Deep Worker" badge (long focus sessions)
 */
export async function checkDeepWorkerBadge(userId: string, tasksCompletedToday: number) {
  if (tasksCompletedToday >= 5) {
    await awardBadge(userId, "deep_worker", "🔥 Deep Worker", "Completed 5+ tasks in one day", {
      tasksCompleted: tasksCompletedToday,
    });
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get all tasks for a user with optional filtering
 */
export async function getUserTasks(
  userId: string,
  filters?: {
    type?: TaskType;
    isCompleted?: boolean;
    archivedOnly?: boolean;
    afterDate?: string; // ISO date
  }
) {
  let query = supabase.from("tasks").select("*").eq("user_id", userId);

  if (filters) {
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.isCompleted !== undefined) query = query.eq("is_completed", filters.isCompleted);
    if (filters.archivedOnly) query = query.eq("is_archived", true);
    if (filters.afterDate) query = query.gte("target_date", filters.afterDate);
  }

  return await query.order("created_at", { ascending: false });
}

/**
 * Get spaced-review tasks due for resurrection
 */
export async function getTasksDueForReview(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  return await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "spaced_review")
    .eq("is_completed", true)
    .lte("next_review_date", today)
    .order("next_review_date", { ascending: true });
}

/**
 * Resurrect a spaced-review task for next iteration
 */
export async function resurrectSpacedReviewTask(taskId: string, userId: string) {
  try {
    const { data: originalTask } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single();

    if (!originalTask) throw new Error("Task not found");

    // Create new spaced-review task
    const newInterval = (originalTask.review_interval_days || 7) * 1.5; // Increase interval
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + Math.floor(newInterval));

    return await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: originalTask.title + " (Review)",
        description: originalTask.description,
        type: "spaced_review",
        category: originalTask.category,
        target_date: new Date().toISOString().split("T")[0],
        original_task_id: originalTask.original_task_id || originalTask.id,
        review_interval_days: Math.floor(newInterval),
        next_review_date: nextReviewDate.toISOString().split("T")[0],
        points_awarded: originalTask.points_awarded,
        timezone: originalTask.timezone,
      })
      .select()
      .single();
  } catch (error) {
    console.error("Error resurfacing spaced-review task:", error);
    return null;
  }
}
