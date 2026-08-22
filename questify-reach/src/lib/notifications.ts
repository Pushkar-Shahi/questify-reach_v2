import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  action_label: string | null;
  action_url: string | null;
  priority: NotificationPriority;
  type: string;
  audience: "all" | "user";
  expires_at: string | null;
  recipient_count: number;
  created_at: string;
};

export type DeliveryRow = {
  id: string;
  notification_id: string;
  read_at: string | null;
  created_at: string;
  notifications: NotificationRow | null;
};

export type SendNotificationInput = {
  title: string;
  body: string;
  audience: "all" | "user";
  targetUserId?: string | null;
  priority: NotificationPriority;
  type: string;
  actionLabel?: string | null;
  actionUrl?: string | null;
  expiresAt?: string | null;
};

export function validateNotification(input: SendNotificationInput): string | null {
  if (!input.title.trim()) return "Title is required.";
  if (input.title.trim().length > 140) return "Title must be 140 characters or fewer.";
  if (!input.body.trim()) return "Message body is required.";
  if (input.body.trim().length > 2000) return "Body must be 2000 characters or fewer.";
  if (input.audience === "user" && !input.targetUserId) return "Pick a recipient.";
  const url = input.actionUrl?.trim();
  if (url && !/^(https?:\/\/|\/)/.test(url))
    return "Action link must be an https URL or an in-app path starting with /.";
  return null;
}

export function useMyNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    refetchInterval: 30000,
    queryFn: async (): Promise<DeliveryRow[]> => {
      const { data, error } = await supabase
        .from("notification_deliveries")
        .select("id, notification_id, read_at, created_at, notifications(*)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const now = Date.now();
      return ((data ?? []) as unknown as DeliveryRow[]).filter(
        (d) => !d.notifications?.expires_at || new Date(d.notifications.expires_at).getTime() > now,
      );
    },
  });
}

export function unreadCount(rows: DeliveryRow[] | undefined) {
  return (rows ?? []).filter((r) => !r.read_at).length;
}

export function useNotificationActions(userId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications", userId] });

  const markRead = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { error } = await supabase
        .from("notification_deliveries")
        .update({ read_at: new Date().toISOString() })
        .eq("id", deliveryId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mark_all_notifications_read");
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { markRead, markAllRead };
}

export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendNotificationInput) => {
      const err = validateNotification(input);
      if (err) throw new Error(err);
      const { data, error } = await supabase.rpc("admin_send_notification", {
        _title: input.title.trim(),
        _body: input.body.trim(),
        _audience: input.audience,
        _target_user: input.audience === "user" ? input.targetUserId! : undefined,
        _priority: input.priority,
        _type: input.type,
        _action_label: input.actionLabel?.trim() || undefined,
        _action_url: input.actionUrl?.trim() || undefined,
        _expires_at: input.expiresAt || undefined,

      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sent-notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSentNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["sent-notifications"],
    enabled,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
