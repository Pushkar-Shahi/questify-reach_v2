/**
 * Career Readiness scoring.
 *
 * Transparent weighted average:
 *
 *   completion_i  = clamp(progress_i / target_i, 0, 1) * 100
 *   share_i       = w_i / Σw        (weights normalised, so they always sum to 1)
 *   score         = clamp( Σ (share_i × completion_i), 0, 100 )
 *
 * To stop a single topic swinging the whole score, each normalised share is
 * capped at MAX_SHARE and the leftover mass is redistributed over the rest.
 * The built-in roadmap track (if the user picked one) participates as a single
 * pseudo-topic with weight BUILTIN_WEIGHT.
 */

export const MAX_SHARE = 0.4;
export const BUILTIN_WEIGHT = 5;

export type ScoreInput = {
  id: string;
  title: string;
  category: string;
  /** 1–10 importance */
  weight: number;
  /** 0–100 current proficiency */
  progress: number;
  /** 1–100 target proficiency */
  target: number;
  isCompleted?: boolean;
  isBuiltIn?: boolean;
  deadline?: string | null;
};

export type ScoreContribution = ScoreInput & {
  /** 0–100 completion against the topic's own target */
  completion: number;
  /** normalised 0–1 weight share */
  share: number;
  /** points this topic currently contributes to the 0–100 score */
  contribution: number;
  /** points still available from this topic */
  headroom: number;
};

export type ScoreBreakdown = {
  score: number;
  contributions: ScoreContribution[];
  /** high-importance topics with low completion */
  gaps: ScoreContribution[];
  /** biggest score gain per unit of work, best first */
  nextActions: ScoreContribution[];
};

export function topicCompletion(progress: number, target: number, isCompleted?: boolean) {
  if (isCompleted) return 100;
  const t = Math.max(1, Math.min(100, target || 100));
  const p = Math.max(0, Math.min(100, progress || 0));
  return Math.max(0, Math.min(100, (p / t) * 100));
}

/** Normalise weights to shares that sum to 1, capping any single share at MAX_SHARE. */
export function normaliseShares(weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const safe = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 1));
  const total = safe.reduce((a, b) => a + b, 0);
  let shares = safe.map((w) => w / total);

  // With few topics an even split can legitimately exceed MAX_SHARE; only cap
  // when capping is actually achievable.
  if (n * MAX_SHARE <= 1) return shares.map(() => 1 / n);

  for (let pass = 0; pass < 8; pass++) {
    const over = shares.filter((s) => s > MAX_SHARE + 1e-9);
    if (over.length === 0) break;
    const excess = over.reduce((a, s) => a + (s - MAX_SHARE), 0);
    const underTotal = shares.filter((s) => s <= MAX_SHARE).reduce((a, b) => a + b, 0);
    shares = shares.map((s) =>
      s > MAX_SHARE ? MAX_SHARE : underTotal > 0 ? s + (excess * s) / underTotal : s,
    );
  }
  const sum = shares.reduce((a, b) => a + b, 0) || 1;
  return shares.map((s) => s / sum);
}

export function computeCareerScore(topics: ScoreInput[]): ScoreBreakdown {
  const active = topics.filter((t) => t.title.trim().length > 0);
  if (active.length === 0) {
    return { score: 0, contributions: [], gaps: [], nextActions: [] };
  }

  const shares = normaliseShares(active.map((t) => t.weight));
  const contributions: ScoreContribution[] = active.map((t, i) => {
    const completion = topicCompletion(t.progress, t.target, t.isCompleted);
    const share = shares[i];
    const contribution = share * completion;
    return { ...t, completion, share, contribution, headroom: share * (100 - completion) };
  });

  const raw = contributions.reduce((a, c) => a + c.contribution, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw * 10) / 10));

  const gaps = contributions
    .filter((c) => c.weight >= 6 && c.completion < 50)
    .sort((a, b) => b.headroom - a.headroom);

  const nextActions = [...contributions]
    .filter((c) => c.completion < 100)
    .sort((a, b) => b.headroom - a.headroom)
    .slice(0, 3);

  return { score, contributions, gaps, nextActions };
}
