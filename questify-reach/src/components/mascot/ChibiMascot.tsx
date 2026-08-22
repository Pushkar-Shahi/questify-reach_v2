import { forwardRef } from "react";

export type MascotArtProps = {
  /** -1…1 horizontal pupil offset */
  lookX?: number;
  /** -1…1 vertical pupil offset */
  lookY?: number;
  blinking?: boolean;
  waving?: boolean;
  className?: string;
};

/**
 * Original chibi mascot — a cheerful lavender-haired student athlete.
 * Drawn inline so it ships with the bundle and needs no external asset.
 * Swap it out via <MascotWidget character={<YourArt />} /> — any component
 * accepting MascotArtProps works.
 */
const ChibiMascot = forwardRef<SVGSVGElement, MascotArtProps>(function ChibiMascot(
  { lookX = 0, lookY = 0, blinking = false, waving = false, className },
  ref,
) {
  const px = Math.max(-1, Math.min(1, lookX)) * 1.6;
  const py = Math.max(-1, Math.min(1, lookY)) * 1.2;

  return (
    <svg
      ref={ref}
      viewBox="0 0 100 116"
      className={className}
      role="img"
      aria-label="Goal Spark mascot"
      focusable="false"
    >
      <defs>
        <radialGradient id="mascot-aura" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mascot-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b4b8a" />
          <stop offset="100%" stopColor="#2f2748" />
        </linearGradient>
        <linearGradient id="mascot-suit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4f1ff" />
          <stop offset="100%" stopColor="#d9d2f2" />
        </linearGradient>
      </defs>

      <ellipse cx="50" cy="56" rx="48" ry="52" fill="url(#mascot-aura)" />

      {/* legs */}
      <rect x="38" y="92" width="9" height="16" rx="4.5" fill="#3b3355" />
      <rect x="53" y="92" width="9" height="16" rx="4.5" fill="#3b3355" />
      <ellipse cx="42.5" cy="110" rx="7" ry="4" fill="#efeaff" />
      <ellipse cx="57.5" cy="110" rx="7" ry="4" fill="#efeaff" />

      {/* body */}
      <path
        d="M32 68c0-9 8-14 18-14s18 5 18 14v18c0 6-8 9-18 9s-18-3-18-9z"
        fill="url(#mascot-suit)"
        stroke="#c8bff0"
        strokeWidth="1.2"
      />
      <path d="M41 60h18l-3 12h-12z" fill="currentColor" opacity="0.55" />

      {/* arms */}
      <g
        style={{
          transformOrigin: "70px 72px",
          transform: waving ? "rotate(-38deg)" : "rotate(-6deg)",
          transition: "transform 220ms ease",
        }}
      >
        <rect x="66" y="66" width="8.5" height="20" rx="4.25" fill="url(#mascot-suit)" />
        <circle cx="70" cy="88" r="5.4" fill="#ffe3cf" />
      </g>
      <g style={{ transformOrigin: "30px 72px", transform: "rotate(8deg)" }}>
        <rect x="25.5" y="66" width="8.5" height="20" rx="4.25" fill="url(#mascot-suit)" />
        <circle cx="30" cy="88" r="5.4" fill="#ffe3cf" />
      </g>

      {/* head */}
      <circle cx="50" cy="38" r="26" fill="#ffe3cf" />
      {/* hair back + fringe */}
      <path
        d="M24 40c-2-18 10-30 26-30s28 12 26 30c-2-6-6-9-9-9-4 0-6 3-9 3s-5-4-9-4-6 4-10 4-4-3-8-3c-4 0-6 4-7 9z"
        fill="url(#mascot-hair)"
      />
      <path d="M22 36c-3 14-2 26 2 34 0-12 1-22 4-30z" fill="url(#mascot-hair)" />
      <path d="M78 36c3 14 2 26-2 34 0-12-1-22-4-30z" fill="url(#mascot-hair)" />

      {/* eyes */}
      {blinking ? (
        <>
          <path d="M36 41q4.5 4 9 0" stroke="#3b3355" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M55 41q4.5 4 9 0" stroke="#3b3355" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="40.5" cy="41" rx="5.2" ry="6" fill="#fdfcff" />
          <ellipse cx="59.5" cy="41" rx="5.2" ry="6" fill="#fdfcff" />
          <ellipse cx={40.5 + px} cy={41 + py} rx="2.9" ry="3.4" fill="#4a3f7a" />
          <ellipse cx={59.5 + px} cy={41 + py} rx="2.9" ry="3.4" fill="#4a3f7a" />
          <circle cx={39.4 + px} cy={39.6 + py} r="1" fill="#fff" />
          <circle cx={58.4 + px} cy={39.6 + py} r="1" fill="#fff" />
        </>
      )}

      {/* blush + smile */}
      <ellipse cx="31" cy="48" rx="4" ry="2.4" fill="#ffb3b3" opacity="0.7" />
      <ellipse cx="69" cy="48" rx="4" ry="2.4" fill="#ffb3b3" opacity="0.7" />
      <path d="M45 50q5 4.5 10 0" stroke="#a4577a" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* headband */}
      <rect x="24" y="26" width="52" height="5" rx="2.5" fill="currentColor" />
    </svg>
  );
});

export default ChibiMascot;
