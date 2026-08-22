import { Link } from "@tanstack/react-router";
import { Target, ChevronRight } from "lucide-react";
import { useMyCareer } from "@/lib/career";

export default function CareerMeter({ userId }: { userId: string | undefined }) {
  const { track, percent, careerPoints, isLoading } = useMyCareer(userId);
  const pct = Math.round(percent * 10) / 10;

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#261f35]/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-[12px] border border-white/10 bg-[#2d2940] text-[#f0ecff]">
            <Target className="size-4" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#d9c9ff]">
            Career chance meter
          </span>
        </div>

        <Link to="/me" className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-[#d9c9ff] hover:opacity-90">
          Roadmap <ChevronRight className="size-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-5 h-12 rounded-xl bg-white/5 animate-pulse" />
      ) : !track ? (
        <div className="mt-5 text-sm text-muted-foreground">
          No career track selected yet. <Link to="/me" className="text-primary hover:underline">Pick one in your profile</Link> to start tracking readiness.
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="text-[26px] font-bold tracking-[-0.04em] text-[#f0ebff]">{track.title}</div>
            <div className="text-right">
              <div className="text-[30px] font-bold text-[#d9c5ff]">{pct}%</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#d9c9ff]">of 100.0%</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#d8b9ff] to-[#b58eff]"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="h-3 w-3 rounded-full bg-[#d8b9ff] shadow-[0_0_14px_rgba(216,185,255,0.9)]" />
          </div>

          <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[#d9c9ff]">
            {Math.round(careerPoints)} / 1000 pts
          </div>
        </>
      )}
    </div>
  );
}
