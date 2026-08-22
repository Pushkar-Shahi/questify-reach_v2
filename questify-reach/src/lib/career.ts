import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CATEGORY_WEIGHTS: Record<number, number> = { 1: 20, 2: 30, 3: 25, 4: 10, 5: 15 };
export const CAREER_POINT_POOL = 1000;

export type TrackTask = {
  id: string;
  track_id: string;
  category_id: number;
  category_name: string;
  title: string;
  description: string | null;
  sort_order: number;
};

export function useTracks() {
  return useQuery({
    queryKey: ["career-tracks"],
    staleTime: 1000 * 60 * 30, // 30 minutes cache for static track lists
    queryFn: async () => {
      const { data, error } = await supabase.from("career_tracks").select("*").order("title");
      if (error) throw error;
      return data;
    },
  });
}

export function useSelectedTrack(userId: string | undefined) {
  return useQuery({
    queryKey: ["selected-track", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_selected_tracks")
        .select("track_id, career_tracks(id, title, description)")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTrackTasks(trackId: string | undefined) {
  return useQuery({
    queryKey: ["track-tasks", trackId],
    enabled: !!trackId,
    staleTime: 1000 * 60 * 30, // 30 minutes cache for track curriculum
    queryFn: async () => {
      const { data, error } = await supabase
        .from("track_tasks")
        .select("*")
        .eq("track_id", trackId!)
        .order("category_id")
        .order("sort_order");
      if (error) throw error;
      return data as TrackTask[];
    },
  });
}

export function useCareerProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ["career-progress", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_career_progress")
        .select("task_id, is_completed")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
  });
}

export type CategoryStat = {
  categoryId: number;
  categoryName: string;
  tasks: TrackTask[];
  total: number;
  done: number;
  maxPoints: number;
  pointsPerTask: number;
  earnedPoints: number;
};

/** Category Max Points = weight% of the fixed 1,000 point pool. */
export function categoryMaxPoints(categoryId: number) {
  return (CATEGORY_WEIGHTS[categoryId] / 100) * CAREER_POINT_POOL;
}

export function buildCategoryStats(tasks: TrackTask[] | undefined, doneIds: Set<string>): CategoryStat[] {
  return [1, 2, 3, 4, 5].map((cid) => {
    const catTasks = (tasks ?? []).filter((t) => t.category_id === cid);
    const total = catTasks.length;
    const done = catTasks.filter((t) => doneIds.has(t.id)).length;
    const maxPoints = categoryMaxPoints(cid);
    const pointsPerTask = total > 0 ? maxPoints / total : 0;
    return {
      categoryId: cid,
      categoryName: catTasks[0]?.category_name ?? CATEGORY_NAMES[cid],
      tasks: catTasks,
      total,
      done,
      maxPoints,
      pointsPerTask,
      earnedPoints: pointsPerTask * done,
    };
  });
}

export const CATEGORY_NAMES: Record<number, string> = {
  1: "Core Fundamentals",
  2: "Domain Skills",
  3: "Production Projects",
  4: "Certifications & Benchmarks",
  5: "Real Experience",
};

/** C_% = Σ (W_c × K_c / N_c) */
export function careerPercent(stats: CategoryStat[]) {
  return stats.reduce((sum, s) => (s.total > 0 ? sum + CATEGORY_WEIGHTS[s.categoryId] * (s.done / s.total) : sum), 0);
}

export function useMyCareer(userId: string | undefined) {
  const selected = useSelectedTrack(userId);
  const trackId = selected.data?.track_id;
  const tasks = useTrackTasks(trackId);
  const progress = useCareerProgress(userId);

  const doneIds = new Set((progress.data ?? []).filter((p) => p.is_completed).map((p) => p.task_id));
  const stats = buildCategoryStats(tasks.data, doneIds);
  const percent = careerPercent(stats);

  return {
    trackId,
    track: selected.data?.career_tracks as { id: string; title: string; description: string | null } | undefined,
    tasks: tasks.data,
    doneIds,
    stats,
    percent,
    careerPoints: (percent / 100) * CAREER_POINT_POOL,
    isLoading: selected.isLoading || tasks.isLoading || progress.isLoading,
  };
}

/** Ultimate Rank Score = 0.5 × daily grind points + 0.5 × (career points / 10) */
export function ultimateScore(dailyPoints: number, careerPercentValue: number) {
  return 0.5 * dailyPoints + 0.5 * careerPercentValue;
}
