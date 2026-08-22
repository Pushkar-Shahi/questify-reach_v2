import { forwardRef } from "react";
import type { MascotArtProps } from "@/components/mascot/ChibiMascot";

const HinataMascot = forwardRef<SVGSVGElement, MascotArtProps>(function HinataMascot(
  { lookX = 0, lookY = 0, blinking = false, waving = false, className },
  ref,
) {
  const px = Math.max(-1, Math.min(1, lookX)) * 2.2;
  const py = Math.max(-1, Math.min(1, lookY)) * 1.6;

  return (
    <svg ref={ref} viewBox="0 0 100 165" className={className} role="img"
      aria-label="Hinata Hyuga mascot" focusable="false" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="hh-aura" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#c4aaee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#9070c8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hh-skin" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffe4c8" />
          <stop offset="100%" stopColor="#f5c4a0" />
        </radialGradient>
        <linearGradient id="hh-hair" x1="0.1" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#1e1e3f" />
          <stop offset="50%" stopColor="#11112c" />
          <stop offset="100%" stopColor="#0c0c20" />
        </linearGradient>
        <radialGradient id="hh-iris" cx="38%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#e0ccff" />
          <stop offset="30%" stopColor="#a882e8" />
          <stop offset="65%" stopColor="#7050c8" />
          <stop offset="100%" stopColor="#4830a0" />
        </radialGradient>
        <linearGradient id="hh-jacket" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#a090d8" />
          <stop offset="100%" stopColor="#7a68b8" />
        </linearGradient>
        <linearGradient id="hh-hoodie" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#f5f3ee" />
          <stop offset="100%" stopColor="#e2dfd7" />
        </linearGradient>
        <linearGradient id="hh-pants" x1="0.1" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#363868" />
          <stop offset="100%" stopColor="#20224a" />
        </linearGradient>
        <radialGradient id="hh-skinhd" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffe8d0" />
          <stop offset="100%" stopColor="#f8caa8" />
        </radialGradient>
        <filter id="hh-drop" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#3a2870" floodOpacity="0.18" />
        </filter>
        <filter id="hh-eyeglow">
          <feGaussianBlur stdDeviation="0.7" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Ambient aura */}
      <ellipse cx="50" cy="95" rx="46" ry="68" fill="url(#hh-aura)" />

      {/* ===== LONG BACK HAIR (drawn first, behind everything) ===== */}
      {/* Left flowing panel */}
      <path d="M28,32 C22,48 16,78 14,112 C12,132 15,148 20,154
               C22,148 23,134 24,118 C26,98 27,72 30,48 C30,40 30,34 28,32Z"
        fill="url(#hh-hair)" />
      {/* Right flowing panel */}
      <path d="M72,32 C78,48 84,78 86,112 C88,132 85,148 80,154
               C78,148 77,134 76,118 C74,98 73,72 70,48 C70,40 70,34 72,32Z"
        fill="url(#hh-hair)" />
      {/* Inner volume — left */}
      <path d="M30,42 C26,58 24,82 26,112 C27,128 30,142 33,148
               C34,140 34,126 33,110 C32,90 32,64 34,48Z"
        fill="url(#hh-hair)" opacity="0.75" />
      {/* Inner volume — right */}
      <path d="M70,42 C74,58 76,82 74,112 C73,128 70,142 67,148
               C66,140 66,126 67,110 C68,90 68,64 66,48Z"
        fill="url(#hh-hair)" opacity="0.75" />

      {/* ===== LEGS ===== */}
      <rect x="35" y="110" width="13" height="42" rx="5.5" fill="url(#hh-pants)" />
      <rect x="52" y="110" width="13" height="42" rx="5.5" fill="url(#hh-pants)" />
      {/* Leg highlight */}
      <rect x="36" y="110" width="4" height="42" rx="2" fill="#5055a0" opacity="0.2" />
      <rect x="53" y="110" width="4" height="42" rx="2" fill="#5055a0" opacity="0.2" />

      {/* ===== NINJA THIGH POUCH (left leg) ===== */}
      <rect x="30" y="117" width="10" height="13" rx="1.5" fill="#181828" />
      <rect x="30" y="119.5" width="10" height="1.8" fill="#e8e8ee" />
      <rect x="30" y="123" width="10" height="1.8" fill="#e8e8ee" />
      <rect x="30" y="126.5" width="10" height="1.8" fill="#e8e8ee" />
      {/* Pouch leg straps */}
      <path d="M30,116 Q27,118 30,120" stroke="#181828" strokeWidth="1.8" fill="none" />
      <path d="M40,116 Q43,118 40,120" stroke="#181828" strokeWidth="1.8" fill="none" />

      {/* ===== SHINOBI SANDALS ===== */}
      {/* Left sandal */}
      <rect x="31" y="150" width="17" height="7" rx="2.5" fill="#181828" />
      <ellipse cx="39.5" cy="157" rx="10" ry="5" fill="#181828" />
      {/* Toe separator */}
      <line x1="37.5" y1="150" x2="37.5" y2="156" stroke="#282840" strokeWidth="1" />
      {/* Ankle strap */}
      <path d="M32,151 Q39.5,147 47,151" stroke="#0e0e1e" strokeWidth="2.5" fill="none" />
      {/* Right sandal */}
      <rect x="52" y="150" width="17" height="7" rx="2.5" fill="#181828" />
      <ellipse cx="60.5" cy="157" rx="10" ry="5" fill="#181828" />
      <line x1="58.5" y1="150" x2="58.5" y2="156" stroke="#282840" strokeWidth="1" />
      <path d="M53,151 Q60.5,147 68,151" stroke="#0e0e1e" strokeWidth="2.5" fill="none" />

      {/* ===== LEFT ARM ===== */}
      <g style={{ transformOrigin: "26px 70px", transform: "rotate(10deg)" }}>
        <rect x="18" y="68" width="12" height="28" rx="6" fill="url(#hh-hoodie)" />
        {/* Purple cuff */}
        <rect x="18" y="91" width="12" height="7" rx="3.5" fill="#b0a0d8" />
        {/* Hand */}
        <ellipse cx="24" cy="102" rx="6.5" ry="5.5" fill="url(#hh-skinhd)" />
        {/* Fingers */}
        <path d="M20,100 Q19,96 21,95" stroke="#f0c0a0" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M23.5,99 Q22.5,95 24,94" stroke="#f0c0a0" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M27,100 Q28,96 26.5,95" stroke="#f0c0a0" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </g>

      {/* ===== RIGHT ARM (waving) ===== */}
      <g style={{
        transformOrigin: "74px 70px",
        transform: waving ? "rotate(-60deg) translateX(4px) translateY(-6px)" : "rotate(-10deg)",
        transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1)"
      }}>
        <rect x="70" y="68" width="12" height="28" rx="6" fill="url(#hh-hoodie)" />
        <rect x="70" y="91" width="12" height="7" rx="3.5" fill="#b0a0d8" />
        <ellipse cx="76" cy="102" rx="6.5" ry="5.5" fill="url(#hh-skinhd)" />
        {waving && (
          <>
            <path d="M72,99 Q71,95 73,94" stroke="#f0c0a0" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M76,98 Q75.5,94 77,93" stroke="#f0c0a0" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M80,99 Q81,95 79,94" stroke="#f0c0a0" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* ===== BODY — WHITE HOODIE + PURPLE JACKET ===== */}
      {/* Hood behind neck (lavender) */}
      <path d="M35,65 Q28,60 26,68 Q30,58 50,58 Q70,58 74,68 Q72,60 65,65 Q58,61 50,61 Q42,61 35,65Z"
        fill="#c0b0e0" />
      {/* White hoodie outer silhouette */}
      <path d="M22,70 C20,78 18,95 20,112 L80,112 C82,95 80,78 78,70 C70,66 30,66 22,70Z"
        fill="url(#hh-hoodie)" filter="url(#hh-drop)" />
      {/* Purple jacket center panel */}
      <path d="M34,70 C32,78 31,95 32,112 L68,112 C69,95 68,78 66,70 C60,66 40,66 34,70Z"
        fill="url(#hh-jacket)" />
      {/* Jacket side seam lines */}
      <line x1="34" y1="70" x2="32" y2="112" stroke="#d0c0f0" strokeWidth="0.5" opacity="0.5" />
      <line x1="66" y1="70" x2="68" y2="112" stroke="#d0c0f0" strokeWidth="0.5" opacity="0.5" />
      {/* Diamond mesh on upper chest */}
      <g stroke="#c0b0e8" strokeWidth="0.7" fill="none" opacity="0.65">
        <line x1="44" y1="72" x2="50" y2="82" /><line x1="50" y1="72" x2="44" y2="82" />
        <line x1="50" y1="72" x2="56" y2="82" /><line x1="56" y1="72" x2="50" y2="82" />
        <line x1="44" y1="72" x2="56" y2="72" />
        <line x1="44" y1="82" x2="56" y2="82" />
      </g>
      {/* Zipper line */}
      <line x1="50" y1="68" x2="50" y2="112" stroke="#b8a8e0" strokeWidth="0.9" strokeDasharray="2.5,2" />
      <rect x="48" y="70" width="4" height="3" rx="1.2" fill="#d0c8e8" />
      {/* Drawstrings */}
      <path d="M48,67 Q46,82 44,112" stroke="#f0eeea" strokeWidth="1" fill="none" opacity="0.85" />
      <path d="M52,67 Q54,82 56,112" stroke="#f0eeea" strokeWidth="1" fill="none" opacity="0.85" />
      <circle cx="44" cy="112" r="1.5" fill="#d5d2ca" />
      <circle cx="56" cy="112" r="1.5" fill="#d5d2ca" />

      {/* ===== FOREHEAD PROTECTOR AT COLLAR ===== */}
      <path d="M37,67 Q50,64 63,67" stroke="#2a3a5a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="43" y="63.5" width="14" height="7" rx="1.8" fill="#c0ccd8" />
      {/* Konoha leaf symbol */}
      <g transform="translate(50,67)" fill="none" stroke="#3a4a5a" strokeWidth="0.7">
        <path d="M0,-2.5 Q2.2,-0.5 1.8,1.8 Q0,3-1.8,1.8 Q-2.2,-0.5 0,-2.5Z" fill="#4a5a6a" />
        <line x1="0" y1="2.8" x2="0" y2="3.8" strokeWidth="1" stroke="#4a5a6a" />
      </g>
      <circle cx="45" cy="67" r="1" fill="#909aaa" />
      <circle cx="55" cy="67" r="1" fill="#909aaa" />

      {/* ===== HEAD ===== */}
      <circle cx="50" cy="38" r="24" fill="url(#hh-skinhd)" filter="url(#hh-drop)" />
      {/* Subtle chin shading */}
      <ellipse cx="50" cy="57" rx="13" ry="5" fill="#f0b898" opacity="0.2" />

      {/* ===== HAIR — TOP CROWN + STRAIGHT BANGS ===== */}
      {/* Full crown dome — top of head hair */}
      <path d="M27,33 C24,18 34,12 50,12 C66,12 76,18 73,33 Z" fill="url(#hh-hair)" />
      {/* Hair at sides of face — small panels covering cheek-area sides */}
      <path d="M26,36 Q24,46 25,60 Q27,54 28,46 Q29,40 28,35Z" fill="url(#hh-hair)" />
      <path d="M74,36 Q76,46 75,60 Q73,54 72,46 Q71,40 72,35Z" fill="url(#hh-hair)" />
      {/* Hair shine highlight */}
      <path d="M35,15 Q44,12 55,13" stroke="#4040a0" strokeWidth="2" fill="none"
        strokeLinecap="round" opacity="0.4" />
      <path d="M38,17 Q46,14 52,15" stroke="#6060b8" strokeWidth="1.2" fill="none"
        strokeLinecap="round" opacity="0.35" />

      {/* ===== EYES ===== */}
      {blinking ? (
        <>
          <path d="M34,42 Q41,49 48,42" stroke="#2a1060" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M52,42 Q59,49 66,42" stroke="#2a1060" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* ── LEFT EYE ── */}
          {/* Sclera */}
          <ellipse cx="41" cy="42" rx="7.5" ry="8" fill="#fefcff" />
          {/* Iris (big, purple) */}
          <ellipse cx={41 + px} cy={42 + py} rx="6" ry="6.5" fill="url(#hh-iris)" filter="url(#hh-eyeglow)" />
          {/* Pupil */}
          <ellipse cx={41 + px} cy={43 + py} rx="2.2" ry="2.5" fill="#1a0840" />
          {/* Primary highlight — large */}
          <circle cx={38.8 + px} cy={39.5 + py} r="1.8" fill="#ffffff" opacity="0.96" />
          {/* Secondary small highlight */}
          <circle cx={43.5 + px} cy={43.5 + py} r="0.9" fill="#ffffff" opacity="0.75" />
          {/* Eye outline */}
          <ellipse cx="41" cy="42" rx="7.5" ry="8" fill="none" stroke="#1a0840" strokeWidth="1.1" />
          {/* TOP LASH BAR — thick anime cap */}
          <path d="M33.8,36.5 Q33.5,37.5 34.5,38.5 L47.5,38.5 Q48.5,37.5 48.2,36.5 Q44.5,35 41,35 Q37.5,35 33.8,36.5Z"
            fill="#1a0840" />
          {/* Upper lash tips */}
          <line x1="35" y1="37" x2="32.5" y2="34.5" stroke="#1a0840" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="37.5" y1="36" x2="36.2" y2="33.5" stroke="#1a0840" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="41" y1="35.2" x2="41" y2="32.8" stroke="#1a0840" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="44.5" y1="36" x2="45.8" y2="33.5" stroke="#1a0840" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="47" y1="37" x2="49.5" y2="34.5" stroke="#1a0840" strokeWidth="1.4" strokeLinecap="round" />
          {/* Bottom lash line */}
          <path d="M33.8,47.5 Q41,50.5 48.2,47.5" stroke="#1a0840" strokeWidth="0.9" fill="none" strokeLinecap="round" />

          {/* ── RIGHT EYE ── */}
          <ellipse cx="59" cy="42" rx="7.5" ry="8" fill="#fefcff" />
          <ellipse cx={59 + px} cy={42 + py} rx="6" ry="6.5" fill="url(#hh-iris)" filter="url(#hh-eyeglow)" />
          <ellipse cx={59 + px} cy={43 + py} rx="2.2" ry="2.5" fill="#1a0840" />
          <circle cx={56.8 + px} cy={39.5 + py} r="1.8" fill="#ffffff" opacity="0.96" />
          <circle cx={61.5 + px} cy={43.5 + py} r="0.9" fill="#ffffff" opacity="0.75" />
          <ellipse cx="59" cy="42" rx="7.5" ry="8" fill="none" stroke="#1a0840" strokeWidth="1.1" />
          <path d="M51.8,36.5 Q51.5,37.5 52.5,38.5 L65.5,38.5 Q66.5,37.5 66.2,36.5 Q62.5,35 59,35 Q55.5,35 51.8,36.5Z"
            fill="#1a0840" />
          <line x1="53" y1="37" x2="50.5" y2="34.5" stroke="#1a0840" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="55.5" y1="36" x2="54.2" y2="33.5" stroke="#1a0840" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="59" y1="35.2" x2="59" y2="32.8" stroke="#1a0840" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="62.5" y1="36" x2="63.8" y2="33.5" stroke="#1a0840" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="65" y1="37" x2="67.5" y2="34.5" stroke="#1a0840" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M51.8,47.5 Q59,50.5 66.2,47.5" stroke="#1a0840" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* NOSE — tiny */}
      <ellipse cx="50" cy="50" rx="1.2" ry="0.8" fill="#e0a080" opacity="0.65" />

      {/* MOUTH — slightly open / neutral-surprised */}
      <path d="M46,54.5 Q50,57 54,54.5" stroke="#c07060" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="55.8" rx="3" ry="2.2" fill="#c07060" opacity="0.25" />

      {/* BLUSH */}
      <ellipse cx="32" cy="48" rx="6" ry="3" fill="#ffb0b0" opacity="0.58" />
      <ellipse cx="68" cy="48" rx="6" ry="3" fill="#ffb0b0" opacity="0.58" />
    </svg>
  );
});

export default HinataMascot;
