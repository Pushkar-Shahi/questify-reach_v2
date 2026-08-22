import AuraFlame from "@/components/AuraFlame";

function levelFor(streak: number) {
  if (streak >= 100) return "MASTER";
  if (streak >= 50) return "ELITE";
  if (streak >= 21) return "PRO";
  if (streak >= 7) return "RISING";
  return "ROOKIE";
}

export default function StreakRing({
  streak,
  points,
}: {
  streak: number;
  points: number;
}) {
  const milestone = Math.max(30, Math.ceil((streak + 1) / 30) * 30);
  const pct = Math.min(1, streak / milestone);
  const r = 70; // Radius matching HTML (150px diameter / 2 = 75, minus some margin)
  const c = 2 * Math.PI * r;
  const gap = c * 0.22;
  const track = c - gap;

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_center,_rgba(168,124,255,0.06),_transparent_60%)]" />

      {/* Ring */}
      <div className="relative flex w-full items-center justify-center">
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 150 150" className="size-[150px] -rotate-[90deg]" role="img" aria-label={`${streak} day streak`}>
            {/* Background track */}
            <circle
              cx="75"
              cy="75"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${track} ${gap}`}
            />
            {/* Progress circle */}
            <circle
              cx="75"
              cy="75"
              r={r}
              fill="none"
              stroke="#b48cff"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${track * pct} ${c}`}
              style={{
                filter: "drop-shadow(0 0 12px rgba(180,140,255,0.8))",
                transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </svg>

          {/* Inner content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b93ad] mb-1">
              Daily Streak
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-base text-[#a685ff]">✦</span>
              <span className="text-[34px] font-black leading-none text-[#f5f3fa]">{streak}</span>
            </div>
            <div className="text-xs text-[#9b93ad] mt-0.5">day</div>
          </div>
        </div>
      </div>

      {/* Level and tier info */}
      <div className="relative mt-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b93ad]">
          Level: <span className="text-[#b48cff]">{levelFor(streak)}</span>
        </div>
        <div className="mt-1.5 text-[11px] text-[#9b93ad]">
          {Math.max(0, milestone - streak)} days to next tier
        </div>
      </div>
    </div>
  );
}
