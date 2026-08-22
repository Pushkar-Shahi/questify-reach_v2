/**
 * Mascot sound effects — synthesised with the Web Audio API, no audio files.
 * One lazily-created shared AudioContext, low master gain, short envelopes.
 */

export type MascotSound = "tap" | "combo" | "throw" | "land";

const MASTER_GAIN = 0.15;
const MIN_GAP_MS = 45;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lastPlayed = 0;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function envelope(ac: AudioContext, peak: number, durationS: number) {
  const g = ac.createGain();
  const now = ac.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationS);
  return g;
}

function noiseBuffer(ac: AudioContext, durationS: number) {
  const len = Math.max(1, Math.floor(ac.sampleRate * durationS));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  return buf;
}

export function playSound(type: MascotSound, options?: { comboCount?: number }) {
  const ac = getContext();
  if (!ac || !master) return;

  const now = performance.now();
  if (now - lastPlayed < MIN_GAP_MS) return; // rate-limit to avoid clipping
  lastPlayed = now;

  const t0 = ac.currentTime;

  if (type === "tap" || type === "combo") {
    const combo = Math.min(options?.comboCount ?? 0, 12);
    const base = type === "combo" ? 620 + combo * 55 : 500;
    const top = Math.min(type === "combo" ? base + 520 : 900, 2200);
    const dur = 0.08;
    const osc = ac.createOscillator();
    osc.type = type === "combo" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(base, t0);
    osc.frequency.exponentialRampToValueAtTime(top, t0 + dur);
    const g = envelope(ac, type === "combo" ? 0.9 : 0.7, dur + 0.02);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.04);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
    return;
  }

  if (type === "throw") {
    const dur = 0.13;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac, dur);
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1600, t0);
    filter.frequency.exponentialRampToValueAtTime(420, t0 + dur);
    filter.Q.value = 0.9;
    const g = envelope(ac, 0.5, dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
    return;
  }

  // land — small low plop
  const dur = 0.1;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, t0);
  osc.frequency.exponentialRampToValueAtTime(90, t0 + dur);
  const g = envelope(ac, 0.8, dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

/** Close the shared context (used on teardown in tests / HMR). */
export function disposeAudio() {
  if (ctx) {
    void ctx.close().catch(() => undefined);
    ctx = null;
    master = null;
  }
}

/* ── mute preference ───────────────────────────────────────────────────── */

const MUTE_KEY = "mascot-muted";

export function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* storage blocked — preference is session-only */
  }
}
