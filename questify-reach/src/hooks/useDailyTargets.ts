import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TargetTask,
  getGoogleAuthState,
  getGoogleSyncConfig,
  pushTargetToGoogleTasks,
  pushTargetToGoogleCalendar,
} from "@/lib/googleSync";

const LOCAL_STORAGE_KEY = "streak_daily_targets_data";

export function useDailyTargets(userId?: string) {
  const [targets, setTargets] = useState<TargetTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load from local storage initially, then attempt Supabase fetch
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        setTargets(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Could not read targets from localStorage:", e);
    }

    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchTargets = async () => {
      try {
        const { data, error } = await supabase
          .from("daily_targets")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: TargetTask[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            target_date: d.target_date,
            is_done: d.is_done,
            completed_at: d.completed_at,
          }));
          setTargets(mapped);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn("Supabase targets fetch error, using local data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTargets();
  }, [userId]);

  // Persist helper
  const saveTargets = useCallback((newTargets: TargetTask[]) => {
    setTargets(newTargets);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newTargets));
  }, []);

  // Sync a target to Google if user is connected
  const syncToGoogleIfConnected = async (target: TargetTask) => {
    const auth = getGoogleAuthState();
    const config = getGoogleSyncConfig();
    if (!auth.accessToken || !config.autoSync) return;

    try {
      if (config.syncTasks) {
        const { googleTaskId } = await pushTargetToGoogleTasks(auth.accessToken, target);
        target.google_task_id = googleTaskId;
      }
      if (config.syncCalendar) {
        const { googleEventId } = await pushTargetToGoogleCalendar(auth.accessToken, target);
        target.google_event_id = googleEventId;
      }
    } catch (err: any) {
      console.warn("Auto sync to Google failed:", err.message);
    }
  };

  // Add target
  const addTarget = async (params: {
    title: string;
    target_date?: string;
    due_time?: string | null;
    notes?: string;
    category?: string;
  }) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newTarget: TargetTask = {
      id: "tgt-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      title: params.title.trim(),
      target_date: params.target_date || todayStr,
      due_time: params.due_time || null,
      notes: params.notes,
      category: params.category || "Target",
      is_done: false,
      completed_at: null,
    };

    const nextTargets = [newTarget, ...targets];
    saveTargets(nextTargets);
    toast.success("Target added (+5 XP when completed)");

    // Try Supabase insert
    if (userId) {
      supabase
        .from("daily_targets")
        .insert({
          id: newTarget.id,
          user_id: userId,
          title: newTarget.title,
          target_date: newTarget.target_date,
          is_done: false,
        })
        .then(({ error }) => {
          if (error) console.warn("Supabase insert error:", error.message);
        });
    }

    // Auto-sync to Google if connected
    syncToGoogleIfConnected(newTarget);
    return newTarget;
  };

  // Toggle complete target
  const toggleTarget = async (id: string) => {
    const target = targets.find((t) => t.id === id);
    if (!target) return;

    const nextIsDone = !target.is_done;
    const completedAt = nextIsDone ? new Date().toISOString() : null;

    const updatedTargets = targets.map((t) =>
      t.id === id ? { ...t, is_done: nextIsDone, completed_at: completedAt } : t
    );
    saveTargets(updatedTargets);

    const updatedTarget = updatedTargets.find((t) => t.id === id)!;

    if (nextIsDone) {
      toast.success("🎉 Target completed! +5 XP earned", {
        description: "Streak updated. Keep going!",
      });

      // Update points in Supabase profile if possible
      if (userId) {
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("total_points")
            .eq("id", userId)
            .single();
          if (prof) {
            await supabase
              .from("profiles")
              .update({ total_points: (prof.total_points || 0) + 5 })
              .eq("id", userId);
          }
        } catch (e) {
          console.warn("Points update error:", e);
        }
      }
    }

    // Sync to Supabase
    if (userId) {
      supabase
        .from("daily_targets")
        .update({
          is_done: nextIsDone,
          completed_at: completedAt,
        })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.warn("Supabase update error:", error.message);
        });
    }

    // Sync to Google
    syncToGoogleIfConnected(updatedTarget);
  };

  // Delete target
  const deleteTarget = async (id: string) => {
    const nextTargets = targets.filter((t) => t.id !== id);
    saveTargets(nextTargets);
    toast.info("Target removed");

    if (userId) {
      supabase.from("daily_targets").delete().eq("id", id).catch(console.warn);
    }
  };

  // Reschedule target
  const rescheduleTarget = (id: string, newDate: string) => {
    const updated = targets.map((t) =>
      t.id === id ? { ...t, target_date: newDate, is_done: false, completed_at: null } : t
    );
    saveTargets(updated);
    toast.success(`Rescheduled to ${newDate}`);

    if (userId) {
      supabase
        .from("daily_targets")
        .update({ target_date: newDate, is_done: false, completed_at: null })
        .eq("id", id)
        .catch(console.warn);
    }
  };

  // Sync all targets to Google Tasks and Google Calendar
  const syncAllToGoogle = async () => {
    const auth = getGoogleAuthState();
    if (!auth.accessToken) {
      toast.error("Please connect your Google Account first");
      return false;
    }

    setIsSyncing(true);
    let successCount = 0;
    try {
      for (const t of targets) {
        try {
          await pushTargetToGoogleTasks(auth.accessToken, t);
          await pushTargetToGoogleCalendar(auth.accessToken, t);
          successCount++;
        } catch (err) {
          console.warn("Single target sync error:", err);
        }
      }
      toast.success(`✨ Synced ${successCount} tasks to Google Tasks & Calendar!`);
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to sync with Google");
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTargets = targets.filter((t) => t.target_date === todayStr);
  const missedTargets = targets.filter((t) => t.target_date < todayStr && !t.is_done);
  const todayDoneCount = todayTargets.filter((t) => t.is_done).length;
  const todayTotalCount = todayTargets.length;
  const missionsLeftCount = todayTotalCount - todayDoneCount;

  return {
    targets,
    todayTargets,
    missedTargets,
    todayDoneCount,
    todayTotalCount,
    missionsLeftCount,
    isLoading,
    isSyncing,
    addTarget,
    toggleTarget,
    deleteTarget,
    rescheduleTarget,
    syncAllToGoogle,
  };
}
