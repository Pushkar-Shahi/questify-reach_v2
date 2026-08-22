import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Sparkles, X } from "lucide-react";
import {
  useCareerTopics,
  useTopicMutations,
  validateTopic,
  TOPIC_CATEGORIES,
  type CareerTopic,
  type CareerTopicInput,
} from "@/lib/careerTopics";
import { computeCareerScore, type ScoreInput } from "@/lib/careerScore";

const EMPTY: CareerTopicInput = {
  title: "",
  description: "",
  category: "General",
  weight: 5,
  progress: 0,
  target: 100,
  deadline: null,
  notes: "",
};

export default function CareerTopics({ userId }: { userId: string | undefined }) {
  const { data: topics, isLoading } = useCareerTopics(userId);
  const { create, update, remove, reorder } = useTopicMutations(userId);
  const [editing, setEditing] = useState<CareerTopic | null>(null);
  const [draft, setDraft] = useState<CareerTopicInput | null>(null);

  const visible = useMemo(
    () => (topics ?? []).filter((t) => !t.is_archived).sort((a, b) => a.sort_order - b.sort_order),
    [topics],
  );

  const breakdown = useMemo(
    () =>
      computeCareerScore(
        visible.map<ScoreInput>((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          weight: Number(t.weight),
          progress: Number(t.progress),
          target: Number(t.target),
          isCompleted: t.is_completed,
          deadline: t.deadline,
        })),
      ),
    [visible],
  );

  const openNew = () => {
    setEditing(null);
    setDraft({ ...EMPTY });
  };

  const openEdit = (t: CareerTopic) => {
    setEditing(t);
    setDraft({
      title: t.title,
      description: t.description ?? "",
      category: t.category,
      weight: Number(t.weight),
      progress: Number(t.progress),
      target: Number(t.target),
      deadline: t.deadline,
      notes: t.notes ?? "",
      is_completed: t.is_completed,
    });
  };

  const save = () => {
    if (!draft) return;
    const err = validateTopic(draft, topics ?? [], editing?.id);
    if (err) return toast.error(err);
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          patch: {
            title: draft.title.trim(),
            description: draft.description?.trim() || null,
            category: draft.category,
            weight: draft.weight,
            progress: draft.progress,
            target: draft.target,
            deadline: draft.deadline || null,
            notes: draft.notes?.trim() || null,
            is_completed: draft.is_completed ?? false,
          },
        },
        {
          onSuccess: () => { toast.success("Topic updated"); setDraft(null); setEditing(null); },
          onError: (e: Error) => toast.error(e.message),
        },
      );
    } else {
      create.mutate(
        { input: draft, sortOrder: visible.length },
        {
          onSuccess: () => { toast.success("Topic added"); setDraft(null); },
          onError: (e: Error) => toast.error(e.message),
        },
      );
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...visible];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    reorder.mutate(next);
  };

  const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Your career topics</h2>
        <button
          onClick={openNew}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="size-4" /> Add topic
        </button>
      </div>

      <div className="mb-4 rounded-xl bg-muted/50 p-3">
        <div className="flex items-end justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Weighted readiness</span>
          <span className="text-2xl font-bold text-primary">{breakdown.score}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${breakdown.score}%`, background: "var(--gradient-hero)" }} />
        </div>
        {breakdown.nextActions.length > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Best next moves: {breakdown.nextActions.map((a) => a.title).join(" · ")}
          </p>
        )}
      </div>

      {draft && (
        <div className="mb-4 grid gap-3 rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{editing ? "Edit topic" : "New topic"}</span>
            <button onClick={() => { setDraft(null); setEditing(null); }} aria-label="Close" className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Topic title" className={field} />
          <input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Short description (optional)" className={field} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Category
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={`${field} mt-1`}>
                {TOPIC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Deadline
              <input type="date" value={draft.deadline ?? ""} onChange={(e) => setDraft({ ...draft, deadline: e.target.value || null })} className={`${field} mt-1`} />
            </label>
          </div>
          <label className="text-xs text-muted-foreground">
            Importance: <span className="font-medium text-foreground">{draft.weight}</span>/10
            <input type="range" min={1} max={10} value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })} className="mt-1 w-full accent-[hsl(var(--primary))]" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Progress: <span className="font-medium text-foreground">{draft.progress}</span>
              <input type="range" min={0} max={100} value={draft.progress} onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })} className="mt-1 w-full accent-[hsl(var(--primary))]" />
            </label>
            <label className="text-xs text-muted-foreground">
              Target: <span className="font-medium text-foreground">{draft.target}</span>
              <input type="range" min={1} max={100} value={draft.target} onChange={(e) => setDraft({ ...draft, target: Number(e.target.value) })} className="mt-1 w-full accent-[hsl(var(--primary))]" />
            </label>
          </div>
          <button
            onClick={save}
            disabled={create.isPending || update.isPending}
            className="justify-self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {editing ? "Save changes" : "Add topic"}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No topics yet — add the skills, projects and certifications that matter for your goal.</p>
      ) : (
        <ul className="grid gap-2">
          {breakdown.contributions.map((c, i) => {
            const topic = visible.find((t) => t.id === c.id)!;
            return (
              <li key={c.id} className="rounded-xl border border-border p-3 transition hover:-translate-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{c.category}</span>
                  <span className="shrink-0 text-xs font-semibold text-primary">{Math.round(c.contribution * 10) / 10} pts</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${c.completion}%` }} />
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>Importance {c.weight}/10 · {Math.round(c.completion)}% done · share {Math.round(c.share * 100)}%</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => move(i, -1)} aria-label="Move up" className="grid size-7 place-items-center rounded-md hover:bg-muted"><ArrowUp className="size-3.5" /></button>
                    <button onClick={() => move(i, 1)} aria-label="Move down" className="grid size-7 place-items-center rounded-md hover:bg-muted"><ArrowDown className="size-3.5" /></button>
                    <button onClick={() => openEdit(topic)} aria-label="Edit topic" className="grid size-7 place-items-center rounded-md hover:bg-muted"><Pencil className="size-3.5" /></button>
                    <button
                      onClick={() => update.mutate({ id: c.id, patch: { is_archived: true } })}
                      aria-label="Archive topic"
                      className="rounded-md px-2 py-1 hover:bg-muted"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => remove.mutate(c.id, { onError: (e: Error) => toast.error(e.message) })}
                      aria-label="Delete topic"
                      className="grid size-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
