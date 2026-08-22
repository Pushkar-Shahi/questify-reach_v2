/**
 * PHASE 5 - Skill Trees (The Moat)
 *
 * This is Streak's core differentiator. Instead of users manually building
 * their learning path, we provide curated skill trees per career track.
 *
 * Features:
 * 1. Visual skill tree UI (node-based graph)
 * 2. Pre-built curated skills per career track
 * 3. Prerequisites and dependencies
 * 4. Progress tracking per skill
 * 5. Recommended learning paths
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface SkillNode {
  id: string;
  track_id: string;
  title: string;
  description: string;
  emoji: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  category: string; // e.g., "Core", "Advanced", "Elective"
  
  // Dependencies
  prerequisite_skill_ids: string[]; // IDs of skills that must be completed first
  unlocks_skill_ids: string[]; // Which skills this unlocks
  
  // Content
  estimated_days: number;
  resources: {
    title: string;
    url: string;
    type: "article" | "video" | "course" | "project" | "book";
  }[];
  
  // Metadata
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSkillProgress {
  id: string;
  user_id: string;
  skill_id: string;
  status: "locked" | "available" | "in_progress" | "completed";
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface SkillTrack {
  id: string;
  title: string; // e.g., "Backend Engineer", "Data Analyst"
  description: string;
  emoji: string;
  color: string;
  skills: SkillNode[];
  created_at: string;
}

export interface TreeLayout {
  skills: Array<{
    skill: SkillNode;
    x: number; // Position in visual tree
    y: number;
    userProgress: UserSkillProgress | null;
  }>;
  connections: Array<{
    from_skill_id: string;
    to_skill_id: string;
  }>;
}

// ============================================================================
// SAMPLE CURATED TRACKS
// ============================================================================

export const CURATED_SKILL_TRACKS = {
  "Backend Engineer": {
    emoji: "⚙️",
    color: "from-blue-500 to-blue-600",
    skills: [
      // Tier 1: Fundamentals
      {
        id: "be-1",
        title: "Data Structures Basics",
        emoji: "📦",
        difficulty: "beginner",
        category: "Core",
        estimated_days: 14,
        prerequisite_ids: [],
        resources: [
          { title: "Arrays & Linked Lists", url: "#", type: "article" },
          { title: "DS Course - Part 1", url: "#", type: "course" },
        ],
      },
      {
        id: "be-2",
        title: "Algorithms Fundamentals",
        emoji: "🔍",
        difficulty: "beginner",
        category: "Core",
        estimated_days: 21,
        prerequisite_ids: ["be-1"],
        resources: [
          { title: "Big O Notation", url: "#", type: "article" },
          { title: "Sorting Algorithms", url: "#", type: "video" },
        ],
      },
      // Tier 2: Intermediate
      {
        id: "be-3",
        title: "Database Design",
        emoji: "🗄️",
        difficulty: "intermediate",
        category: "Core",
        estimated_days: 28,
        prerequisite_ids: ["be-1"],
        resources: [
          { title: "Relational Databases", url: "#", type: "course" },
          { title: "SQL Mastery", url: "#", type: "book" },
        ],
      },
      {
        id: "be-4",
        title: "API Design & REST",
        emoji: "🔗",
        difficulty: "intermediate",
        category: "Core",
        estimated_days: 21,
        prerequisite_ids: ["be-2"],
        resources: [
          { title: "RESTful API Design", url: "#", type: "article" },
          { title: "Build an API", url: "#", type: "project" },
        ],
      },
      // Tier 3: Advanced
      {
        id: "be-5",
        title: "System Design",
        emoji: "🏗️",
        difficulty: "advanced",
        category: "Advanced",
        estimated_days: 35,
        prerequisite_ids: ["be-3", "be-4"],
        resources: [
          { title: "System Design Interview", url: "#", type: "course" },
          { title: "Design a Social Network", url: "#", type: "project" },
        ],
      },
    ],
  },

  "Data Analyst": {
    emoji: "📊",
    color: "from-green-500 to-emerald-600",
    skills: [
      {
        id: "da-1",
        title: "SQL Basics",
        emoji: "🔍",
        difficulty: "beginner",
        category: "Core",
        estimated_days: 14,
        prerequisite_ids: [],
        resources: [
          { title: "SQL for Beginners", url: "#", type: "course" },
          { title: "Query Practice", url: "#", type: "project" },
        ],
      },
      {
        id: "da-2",
        title: "Data Visualization",
        emoji: "📈",
        difficulty: "intermediate",
        category: "Core",
        estimated_days: 21,
        prerequisite_ids: ["da-1"],
        resources: [
          { title: "Tableau Fundamentals", url: "#", type: "course" },
          { title: "Create Dashboards", url: "#", type: "project" },
        ],
      },
      {
        id: "da-3",
        title: "Statistical Analysis",
        emoji: "📐",
        difficulty: "intermediate",
        category: "Core",
        estimated_days: 28,
        prerequisite_ids: ["da-1"],
        resources: [
          { title: "Statistics Basics", url: "#", type: "book" },
          { title: "Hypothesis Testing", url: "#", type: "course" },
        ],
      },
    ],
  },
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get a curated skill track with user progress
 */
export function useSkillTrack(userId: string, trackTitle: string) {
  return useQuery({
    queryKey: ["skill-track", userId, trackTitle],
    queryFn: async () => {
      // In real implementation, fetch from database
      // For now, return curated track merged with user progress

      const curatedTrack = (CURATED_SKILL_TRACKS as any)[trackTitle];
      if (!curatedTrack) return null;

      // Fetch user's progress on these skills
      const skillIds = curatedTrack.skills.map((s: any) => s.id);
      const { data: progress } = await supabase
        .from("user_skill_progress")
        .select("*")
        .eq("user_id", userId)
        .in("skill_id", skillIds);

      const progressMap = new Map(progress?.map((p: any) => [p.skill_id, p]));

      // Build tree layout
      const layout = buildTreeLayout(curatedTrack.skills, progressMap);

      return {
        title: trackTitle,
        ...curatedTrack,
        layout,
      };
    },
    enabled: !!userId,
  });
}

/**
 * Get all available skill tracks
 */
export function useAvailableSkillTracks(userId: string) {
  return useQuery({
    queryKey: ["available-skill-tracks", userId],
    queryFn: async () => {
      // Return curated tracks
      return Object.entries(CURATED_SKILL_TRACKS).map(([title, track]) => ({
        title,
        ...track,
      }));
    },
    enabled: !!userId,
  });
}

/**
 * Start learning a skill
 */
export function useStartSkill(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skillId: string) => {
      const { error } = await supabase.from("user_skill_progress").upsert({
        user_id: userId,
        skill_id: skillId,
        status: "in_progress",
        progress_percent: 0,
        started_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-track"] });
    },
  });
}

/**
 * Complete a skill (marks as done, triggers spaced-review resurrection)
 */
export function useCompleteSkill(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skillId: string) => {
      const completedAt = new Date().toISOString();

      // Update skill progress
      const { error: progressError } = await supabase
        .from("user_skill_progress")
        .update({
          status: "completed",
          progress_percent: 100,
          completed_at: completedAt,
        })
        .eq("user_id", userId)
        .eq("skill_id", skillId);

      if (progressError) throw progressError;

      // Find all tasks tagged with this skill and create spaced-review tasks
      const { data: completedTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("user_id", userId)
        .eq("category", skillId)
        .eq("is_completed", true);

      if (completedTasks && completedTasks.length > 0) {
        // Create spaced-review tasks for this skill
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + 7); // Review in 1 week

        await supabase.from("tasks").insert(
          completedTasks.map((t) => ({
            user_id: userId,
            title: `Review: Skill refresher`,
            type: "spaced_review",
            category: skillId,
            is_completed: false,
            next_review_date: nextReviewDate.toISOString().split("T")[0],
            review_interval_days: 7,
            points_awarded: 5,
          }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-track"] });
    },
  });
}

/**
 * Get recommended next skill based on progress
 */
export async function getRecommendedNextSkill(
  userId: string,
  trackTitle: string
): Promise<SkillNode | null> {
  const track = (CURATED_SKILL_TRACKS as any)[trackTitle];
  if (!track) return null;

  const { data: progress } = await supabase
    .from("user_skill_progress")
    .select("*")
    .eq("user_id", userId);

  const progressMap = new Map(progress?.map((p: any) => [p.skill_id, p]));

  // Find skills that are "available" (all prerequisites complete)
  for (const skill of track.skills) {
    const userProgress = progressMap.get(skill.id);

    if (!userProgress) {
      // Not started - check prerequisites
      const prereqsMet = skill.prerequisite_ids?.every((id: string) => {
        const prereqProgress = progressMap.get(id);
        return prereqProgress?.status === "completed";
      });

      if (prereqsMet || !skill.prerequisite_ids?.length) {
        return skill;
      }
    }
  }

  return null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build tree layout for visualization
 */
function buildTreeLayout(skills: any[], progressMap: Map<string, any>) {
  // Simple layout: group by tier (based on prerequisites)
  const tiers: any[][] = [];

  // Topological sort to determine tiers
  const visited = new Set<string>();
  const tierMap = new Map<string, number>();

  function getTier(skillId: string): number {
    if (tierMap.has(skillId)) return tierMap.get(skillId)!;

    const skill = skills.find((s) => s.id === skillId);
    if (!skill || !skill.prerequisite_ids?.length) {
      tierMap.set(skillId, 0);
      return 0;
    }

    const maxPrereqTier = Math.max(
      0,
      ...skill.prerequisite_ids.map((id: string) => getTier(id))
    );
    const tier = maxPrereqTier + 1;
    tierMap.set(skillId, tier);
    return tier;
  }

  skills.forEach((s) => getTier(s.id));

  // Position skills by tier
  return {
    skills: skills.map((skill, idx) => ({
      skill,
      x: (tierMap.get(skill.id) || 0) * 200,
      y: idx * 100,
      userProgress: progressMap.get(skill.id) || null,
    })),
    connections: skills.flatMap((skill) =>
      (skill.prerequisite_ids || []).map((prereqId: string) => ({
        from_skill_id: prereqId,
        to_skill_id: skill.id,
      }))
    ),
  };
}

/**
 * Calculate skill completion percentage for a track
 */
export function calculateTrackProgress(progress: Map<string, any>, skills: any[]): number {
  if (!skills.length) return 0;

  const completed = skills.filter((s) => {
    const p = progress.get(s.id);
    return p?.status === "completed";
  }).length;

  return Math.round((completed / skills.length) * 100);
}

/**
 * Get skill unlock status and next prerequisites
 */
export function getSkillUnlockInfo(
  skillId: string,
  skills: SkillNode[],
  progressMap: Map<string, any>
): {
  isUnlocked: boolean;
  nextPrerequisites: SkillNode[];
  completedPrerequisites: SkillNode[];
} {
  const skill = skills.find((s) => s.id === skillId);
  if (!skill) return { isUnlocked: false, nextPrerequisites: [], completedPrerequisites: [] };

  const prerequisiteSkills = skills.filter((s) => skill.prerequisite_skill_ids.includes(s.id));

  const completedPrerequisites = prerequisiteSkills.filter((s) => {
    const p = progressMap.get(s.id);
    return p?.status === "completed";
  });

  const nextPrerequisites = prerequisiteSkills.filter((s) => {
    const p = progressMap.get(s.id);
    return p?.status !== "completed";
  });

  return {
    isUnlocked: nextPrerequisites.length === 0,
    nextPrerequisites,
    completedPrerequisites,
  };
}
