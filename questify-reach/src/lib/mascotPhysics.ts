/** Pure, testable physics helpers for the mascot widget. */

export type Vec = { x: number; y: number };
export type Bounds = { maxX: number; maxY: number };

export const MAX_SPEED = 3.2; // px per ms
export const FRICTION_PER_MS = 0.0022; // exponential decay coefficient
export const RESTITUTION = 0.55;
export const MIN_SPEED = 0.02; // px per ms — below this we settle
export const THROW_SPEED = 0.35; // px per ms — above this counts as a throw
export const EDGE_THRESHOLD = 48; // px from a viewport edge = "cozy"

export function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export function clampToBounds(pos: Vec, bounds: Bounds): Vec {
  return {
    x: clamp(pos.x, 0, Math.max(0, bounds.maxX)),
    y: clamp(pos.y, 0, Math.max(0, bounds.maxY)),
  };
}

export function speedOf(v: Vec) {
  return Math.hypot(v.x, v.y);
}

export function capVelocity(v: Vec, max = MAX_SPEED): Vec {
  const s = speedOf(v);
  if (s <= max || s === 0) return v;
  return { x: (v.x / s) * max, y: (v.y / s) * max };
}

/** Frame-rate independent exponential friction. */
export function applyFriction(v: Vec, dtMs: number, k = FRICTION_PER_MS): Vec {
  const f = Math.exp(-k * dtMs);
  return { x: v.x * f, y: v.y * f };
}

/** Advance one frame with soft edge bounces. Returns the new position/velocity. */
export function step(
  pos: Vec,
  vel: Vec,
  dtMs: number,
  bounds: Bounds,
): { pos: Vec; vel: Vec; bounced: boolean } {
  let x = pos.x + vel.x * dtMs;
  let y = pos.y + vel.y * dtMs;
  let vx = vel.x;
  let vy = vel.y;
  let bounced = false;

  if (x < 0) {
    x = 0;
    vx = Math.abs(vx) * RESTITUTION;
    bounced = true;
  } else if (x > bounds.maxX) {
    x = bounds.maxX;
    vx = -Math.abs(vx) * RESTITUTION;
    bounced = true;
  }
  if (y < 0) {
    y = 0;
    vy = Math.abs(vy) * RESTITUTION;
    bounced = true;
  } else if (y > bounds.maxY) {
    y = bounds.maxY;
    vy = -Math.abs(vy) * RESTITUTION;
    bounced = true;
  }

  const next = applyFriction({ x: vx, y: vy }, dtMs);
  return { pos: { x, y }, vel: next, bounced };
}

export function hasSettled(v: Vec) {
  return speedOf(v) < MIN_SPEED;
}

export function isThrow(v: Vec) {
  return speedOf(v) >= THROW_SPEED;
}

export function nearEdge(pos: Vec, bounds: Bounds, threshold = EDGE_THRESHOLD) {
  return (
    pos.x <= threshold ||
    pos.y <= threshold ||
    pos.x >= bounds.maxX - threshold ||
    pos.y >= bounds.maxY - threshold
  );
}

export type Sample = { x: number; y: number; t: number };

/** Release velocity from the most recent pointer samples (px/ms). */
export function velocityFromSamples(samples: Sample[], windowMs = 90): Vec {
  if (samples.length < 2) return { x: 0, y: 0 };
  const last = samples[samples.length - 1];
  let first = samples[0];
  for (let i = samples.length - 1; i >= 0; i--) {
    first = samples[i];
    if (last.t - samples[i].t >= windowMs) break;
  }
  const dt = last.t - first.t;
  if (dt <= 0) return { x: 0, y: 0 };
  return capVelocity({ x: (last.x - first.x) / dt, y: (last.y - first.y) / dt });
}
