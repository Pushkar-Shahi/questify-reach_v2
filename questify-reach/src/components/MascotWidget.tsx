import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { Volume2, VolumeX } from "lucide-react";
import ChibiMascot, { type MascotArtProps } from "@/components/mascot/ChibiMascot";
import { playSound, readMuted, writeMuted } from "@/lib/mascotAudio";
import { pickMessage, type MessagePool } from "@/lib/mascotMessages";
import {
  clampToBounds,
  hasSettled,
  isThrow,
  nearEdge,
  speedOf,
  step,
  velocityFromSamples,
  type Sample,
  type Vec,
} from "@/lib/mascotPhysics";

const SIZE = 352;
const MARGIN = 8;
const TAP_MOVE_PX = 8;
const TAP_MS = 350;
const COMBO_WINDOW_MS = 1000;
const POS_KEY = "mascot-position";

type Particle = { id: number; dx: number; dy: number; char: string };

const SPARKS = ["✦", "✧", "★", "・", "✨"];

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function readStoredPos(): Vec | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x === "number" && typeof p?.y === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export type MascotWidgetProps = {
  /** Swappable artwork. Receives MascotArtProps (lookX/lookY/blinking/waving). */
  character?: ReactElement<MascotArtProps>;
  initialPosition?: Vec;
};

export default function MascotWidget({ character, initialPosition }: MascotWidgetProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const activeVideoRef = useRef<"a" | "b">("a");
  const posRef = useRef<Vec>({ x: 0, y: 0 });
  const velRef = useRef<Vec>({ x: 0, y: 0 });
  const samplesRef = useRef<Sample[]>([]);
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const grabRef = useRef<Vec>({ x: 0, y: 0 });
  const downAtRef = useRef(0);
  const movedRef = useRef(0);
  const tapTimesRef = useRef<number[]>([]);
  const msgTimerRef = useRef<number | null>(null);
  const comboTimerRef = useRef<number | null>(null);
  const waveTimerRef = useRef<number | null>(null);
  const blinkTimerRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<number | null>(null);
  const particleIdRef = useRef(0);
  const mutedRef = useRef(false);

  const [muted, setMuted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [reaction, setReaction] = useState<"none" | "tap" | "hype" | "sleep" | "wave">("none");
  const [waving, setWaving] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [look, setLook] = useState<Vec>({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  const bounds = useCallback(() => {
    if (typeof window === "undefined") return { maxX: 0, maxY: 0 };
    return {
      maxX: Math.max(0, window.innerWidth - SIZE - MARGIN),
      maxY: Math.max(0, window.innerHeight - SIZE - MARGIN),
    };
  }, []);

  const paint = useCallback(() => {
    const el = rootRef.current;
    if (el) el.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
  }, []);

  const savePos = useCallback(() => {
    try {
      window.localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
    } catch {
      /* ignore */
    }
  }, []);

  const say = useCallback((pool: MessagePool) => {
    setMessage((prev) => pickMessage(pool, prev ?? undefined));
    if (msgTimerRef.current) window.clearTimeout(msgTimerRef.current);
    msgTimerRef.current = window.setTimeout(() => setMessage(null), 2400);
  }, []);

  const burst = useCallback((count: number) => {
    const next: Particle[] = Array.from({ length: count }, () => ({
      id: particleIdRef.current++,
      dx: (Math.random() - 0.5) * 90,
      dy: -30 - Math.random() * 60,
      char: SPARKS[Math.floor(Math.random() * SPARKS.length)],
    }));
    setParticles((p) => [...p, ...next].slice(-24));
    window.setTimeout(() => {
      const ids = new Set(next.map((n) => n.id));
      setParticles((p) => p.filter((x) => !ids.has(x.id)));
    }, 900);
  }, []);

  const sound = useCallback((type: Parameters<typeof playSound>[0], comboCount?: number) => {
    if (mutedRef.current) return;
    playSound(type, { comboCount });
  }, []);

  /* ── A/B video crossfade: load & play new src on inactive slot ─────── */
  const isLooping = reaction === "none" || reaction === "sleep";

  // Initial mount: load idle into slot A
  useLayoutEffect(() => {
    const el = videoARef.current;
    if (!el) return;
    el.src = "/mascot-idle.webm";
    el.loop = true;
    el.load();
    el.play().catch(() => {});
    el.style.opacity = "1";
    activeVideoRef.current = "a";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Crossfade on reaction change (skip initial mount — handled above)
  const reactionRef = useRef(reaction);
  useEffect(() => {
    const isFirstRender = reactionRef.current === reaction && reaction === "none";
    if (isFirstRender) return; // initial idle already loaded
    reactionRef.current = reaction;

    const src = reaction === "sleep" ? "/mascot-sleep.webm"
      : reaction === "wave" ? "/mascot-wave.webm"
      : reaction === "none" ? "/mascot-idle.webm"
      : "/mascot-click.webm";
    const looping = reaction === "none" || reaction === "sleep";

    const curr = activeVideoRef.current;
    const nextSlot = curr === "a" ? "b" : "a";
    const currEl = curr === "a" ? videoARef.current : videoBRef.current;
    const nextEl = nextSlot === "a" ? videoARef.current : videoBRef.current;
    if (!currEl || !nextEl) return;

    nextEl.src = src;
    nextEl.loop = looping;
    nextEl.load();

    const doSwap = () => {
      nextEl.play().catch(() => {});
      nextEl.style.opacity = "1";
      currEl.style.opacity = "0";
      // Pause the old slot after fade
      setTimeout(() => { currEl.pause(); currEl.currentTime = 0; }, 260);
      activeVideoRef.current = nextSlot;
    };

    if (nextEl.readyState >= 3) {
      doSwap();
    } else {
      nextEl.addEventListener("canplay", doSwap, { once: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction]);

  /* ── init ─────────────────────────────────────────────────────────── */
  useLayoutEffect(() => {
    setReduced(prefersReducedMotion());
    const m = readMuted();
    mutedRef.current = m;
    setMuted(m);
    const b = bounds();
    const stored = readStoredPos();
    const start =
      stored ?? initialPosition ?? { x: b.maxX - 8, y: b.maxY - 96 };
    posRef.current = clampToBounds(start, b);
    paint();
  }, [bounds, initialPosition, paint]);

  useEffect(() => {
    const onResize = () => {
      posRef.current = clampToBounds(posRef.current, bounds());
      paint();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [bounds, paint]);

  /* ── momentum loop ────────────────────────────────────────────────── */
  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const settle = useCallback(
    (wasThrow: boolean) => {
      stopLoop();
      velRef.current = { x: 0, y: 0 };
      savePos();
      const b = bounds();
      if (nearEdge(posRef.current, b)) say("cozy");
      else if (wasThrow) say("excited");
      else say("calm");
      if (wasThrow) sound("land");
    },
    [bounds, savePos, say, sound, stopLoop],
  );

  const runMomentum = useCallback(() => {
    stopLoop();
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const b = bounds();
      const r = step(posRef.current, velRef.current, dt, b);
      posRef.current = r.pos;
      velRef.current = r.vel;
      paint();
      if (hasSettled(velRef.current)) {
        settle(true);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [bounds, paint, settle, stopLoop]);

  /* ── pointer handling ─────────────────────────────────────────────── */
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-mascot-control]")) return;
    stopLoop();
    velRef.current = { x: 0, y: 0 };
    draggingRef.current = true;
    setDragging(true);
    downAtRef.current = performance.now();
    movedRef.current = 0;
    grabRef.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
    samplesRef.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const next = clampToBounds(
      { x: e.clientX - grabRef.current.x, y: e.clientY - grabRef.current.y },
      bounds(),
    );
    movedRef.current += Math.hypot(next.x - posRef.current.x, next.y - posRef.current.y);
    posRef.current = next;
    paint();
    const s = samplesRef.current;
    s.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (s.length > 12) s.shift();
  };

  const tap = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current.filter((t) => now - t < COMBO_WINDOW_MS), now];
    const n = tapTimesRef.current.length;
    const isCombo = n >= 3;
    const capped = Math.min(n, 99);
    setCombo(isCombo ? capped : 0);
    setReaction(isCombo ? "hype" : "tap");
    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = window.setTimeout(() => setReaction("none"), isCombo ? 15000 : 2000);
    say(isCombo ? "combo" : "normal");
    burst(isCombo ? 10 : 6);
    sound(isCombo ? "combo" : "tap", capped);
    if (comboTimerRef.current) window.clearTimeout(comboTimerRef.current);
    comboTimerRef.current = window.setTimeout(() => {
      tapTimesRef.current = [];
      setCombo(0);
    }, COMBO_WINDOW_MS + 50);
  }, [burst, say, sound]);

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);

    const duration = performance.now() - downAtRef.current;
    if (movedRef.current < TAP_MOVE_PX && duration < TAP_MS) {
      savePos();
      tap();
      return;
    }

    const v = velocityFromSamples(samplesRef.current);
    velRef.current = v;
    if (isThrow(v)) {
      sound("throw");
      runMomentum();
    } else if (speedOf(v) > 0.02) {
      runMomentum();
    } else {
      settle(false);
    }
  };

  /* ── idle: blink + wave ───────────────────────────────────────────── */
  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    const scheduleBlink = () => {
      blinkTimerRef.current = window.setTimeout(
        () => {
          if (cancelled) return;
          if (!document.hidden) {
            setBlinking(true);
            window.setTimeout(() => setBlinking(false), 130);
          }
          scheduleBlink();
        },
        2600 + Math.random() * 4200,
      );
    };
    const scheduleWave = () => {
      waveTimerRef.current = window.setTimeout(
        () => {
          if (cancelled) return;
          if (!document.hidden && !draggingRef.current && rafRef.current === null) {
            setReaction((prev) => (prev === "none" ? "wave" : prev));
          }
          scheduleWave();
        },
        60000,
      );
    };
    scheduleBlink();
    scheduleWave();
    return () => {
      cancelled = true;
      if (blinkTimerRef.current) window.clearTimeout(blinkTimerRef.current);
      if (waveTimerRef.current) window.clearTimeout(waveTimerRef.current);
    };
  }, [reduced]);

  /* ── eye tracking (pointer devices only) ──────────────────────────── */
  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const cx = posRef.current.x + SIZE / 2;
        const cy = posRef.current.y + SIZE / 2.4;
        const dx = (e.clientX - cx) / 260;
        const dy = (e.clientY - cy) / 260;
        setLook({
          x: Math.max(-1, Math.min(1, dx)),
          y: Math.max(-1, Math.min(1, dy)),
        });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  /* ── pause physics when the tab is hidden ─────────────────────────── */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        stopLoop();
        velRef.current = { x: 0, y: 0 };
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stopLoop]);

  useEffect(
    () => () => {
      stopLoop();
      if (msgTimerRef.current) window.clearTimeout(msgTimerRef.current);
      if (comboTimerRef.current) window.clearTimeout(comboTimerRef.current);
      if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    },
    [stopLoop],
  );

  /* ── idle: sleep timer ─────────────────────────────────────────────── */
  useEffect(() => {
    let timeoutId: number;

    const resetIdle = () => {
      window.clearTimeout(timeoutId);
      setReaction((current) => {
        if (current === "sleep") return "none";
        return current;
      });
      timeoutId = window.setTimeout(() => {
        setReaction("sleep");
      }, 120000); // 2 minutes
    };

    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);
    window.addEventListener("touchstart", resetIdle);
    resetIdle();

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("touchstart", resetIdle);
    };
  }, []);

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    writeMuted(next);
    if (!next) playSound("tap");
  };

  const art = isValidElement(character) ? (
    cloneElement(character, { lookX: look.x, lookY: look.y, blinking, waving, className: "size-full" })
  ) : (
    <div className="relative size-full">
      {/* Slot A */}
      <video
        ref={videoARef}
        muted
        playsInline
        className="absolute inset-0 size-full object-contain object-bottom pointer-events-none"
        style={{ transition: "opacity 250ms ease", opacity: 0 }}
        onEnded={() => {
          if (activeVideoRef.current === "a" && !isLooping) setReaction("none");
        }}
      />
      {/* Slot B */}
      <video
        ref={videoBRef}
        muted
        playsInline
        className="absolute inset-0 size-full object-contain object-bottom pointer-events-none"
        style={{ transition: "opacity 250ms ease", opacity: 0 }}
        onEnded={() => {
          if (activeVideoRef.current === "b" && !isLooping) setReaction("none");
        }}
      />
    </div>
  );

  const bubbleLeft = posRef.current.x < 160;

  return (
    <div
      ref={rootRef}
      className="fixed left-0 top-0 z-40 select-none"
      style={{ width: SIZE, height: SIZE, touchAction: "none" }}
    >
      {/* speech bubble */}
      <div
        aria-live="polite"
        className={`pointer-events-none absolute -top-11 max-w-[46vw] whitespace-nowrap rounded-xl border border-border bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg transition-all duration-200 ${
          message ? "scale-100 opacity-100" : "scale-90 opacity-0"
        } ${bubbleLeft ? "left-0" : "right-0"}`}
      >
        {message}
      </div>

      {/* combo badge */}
      {combo >= 3 && (
        <span className="pointer-events-none absolute -right-1 -top-1 z-10 grid min-w-7 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-black text-primary-foreground shadow">
          x{combo}
        </span>
      )}

      {/* particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/3 text-sm text-primary"
          style={{
            animation: reduced ? undefined : "mascot-spark 900ms ease-out forwards",
            ["--spark-dx" as string]: `${p.dx}px`,
            ["--spark-dy" as string]: `${p.dy}px`,
          }}
        >
          {p.char}
        </span>
      ))}

      {/* mascot body */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drag or tap the mascot for encouragement"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            tap();
          }
        }}
        className={`size-full cursor-grab text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing ${
          reduced || dragging || reaction !== "none" ? "" : "animate-mascot-bob"
        }`}
      >
        {art}
      </div>

      {/* mute toggle */}
      <button
        type="button"
        data-mascot-control
        onClick={toggleMute}
        aria-pressed={!muted}
        aria-label={muted ? "Enable mascot sounds" : "Mute mascot sounds"}
        className="absolute -bottom-1 left-0 grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:text-foreground"
      >
        {muted ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
