import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CareerTopic = {
  id: string;
  user_id: string | null;
  is_global: boolean;
  title: string;
  description: string | null;
  category: string;
  weight: number;
  progress: number;
  target: number;
  deadline: string | null;
  notes: string | null;
  is_completed: boolean;
  is_archived: boolean;
  sort_order: number;
};

export type CareerTopicInput = {
  title: string;
  description?: string | null;
  category: string;
  weight: number;
  progress: number;
  target: number;
  deadline?: string | null;
  notes?: string | null;
  is_completed?: boolean;
};

export const TOPIC_CATEGORIES = [
  "Core Fundamentals",
  "Domain Skills",
  "Projects",
  "Certifications",
  "Experience",
  "Soft Skills",
  "General",
] as const;

export function validateTopic(
  input: CareerTopicInput,
  existing: CareerTopic[],
  editingId?: string,
): string | null {
  const title = input.title.trim();
  if (!title) return "Give the topic a title.";
  if (title.length > 120) return "Title must be 120 characters or fewer.";
  const dup = existing.some(
    (t) => t.id !== editingId && t.title.trim().toLowerCase() === title.toLowerCase(),
  );
  if (dup) return "You already have a topic with that name.";
  if (input.weight < 1 || input.weight > 10) return "Importance must be between 1 and 10.";
  if (input.progress < 0 || input.progress > 100) return "Progress must be between 0 and 100.";
  if (input.target < 1 || input.target > 100) return "Target must be between 1 and 100.";
  return null;
}

/* ── local fallback (used only when the network write fails) ───────────── */

const LS_KEY = "career-topics-fallback";

function readLocal(userId: string): CareerTopic[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(window.localStorage.getItem(LS_KEY) || "{}");
    return (all[userId] as CareerTopic[]) ?? [];
  } catch {
    return [];
  }
}

function writeLocal(userId: string, rows: CareerTopic[]) {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(window.localStorage.getItem(LS_KEY) || "{}");
    all[userId] = rows;
    window.localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked — ignore */
  }
}

/* ── queries ───────────────────────────────────────────────────────────── */

export function useCareerTopics(userId: string | undefined) {
  return useQuery({
    queryKey: ["career-topics", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CareerTopic[]> => {
      const { data, error } = await supabase
        .from("career_topics")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) {
        const local = readLocal(userId!);
        if (local.length) return local;
        throw error;
      }
      return (data ?? []) as CareerTopic[];
    },
  });
}

export function useTopicMutations(userId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["career-topics", userId] });

  const create = useMutation({
    mutationFn: async ({ input, sortOrder }: { input: CareerTopicInput; sortOrder: number }) => {
      const row = {
        user_id: userId!,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category,
        weight: input.weight,
        progress: input.progress,
        target: input.target,
        deadline: input.deadline || null,
        notes: input.notes?.trim() || null,
        is_completed: input.is_completed ?? false,
        sort_order: sortOrder,
      };
      const { error } = await supabase.from("career_topics").insert(row);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CareerTopic> }) => {
      const { error } = await supabase.from("career_topics").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("career_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async (ordered: CareerTopic[]) => {
      await Promise.all(
        ordered.map((t, i) =>
          supabase.from("career_topics").update({ sort_order: i }).eq("id", t.id),
        ),
      );
      if (userId) writeLocal(userId, ordered);
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, reorder };
}
