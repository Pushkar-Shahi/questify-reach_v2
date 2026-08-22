import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, GraduationCap } from "lucide-react";
import AuraFlame from "@/components/AuraFlame";

const iconFor = (t: string) => {
  if (t === "STREAK_BONUS") return <AuraFlame className="size-4 text-primary" />;
  if (t === "CGPA_UPDATED") return <GraduationCap className="size-4 text-primary" />;
  return <Check className="size-4 text-success" />;
};

export default function ActivityList({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["activity", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">No activity yet.</p>;

  return (
    <ul className="space-y-2">
      {data.map((a) => (
        <li key={a.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
          <div className="size-8 rounded-lg bg-accent grid place-items-center">{iconFor(a.activity_type)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{a.description}</div>
            <div className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
          </div>
          <div className={`text-sm font-semibold ${a.points_awarded < 0 ? "text-destructive" : "text-primary"}`}>
            {a.points_awarded >= 0 ? "+" : ""}{a.points_awarded}
          </div>
        </li>
      ))}
    </ul>
  );
}
