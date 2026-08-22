import { useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Circle } from "lucide-react";

type CalendarTarget = {
  target_date: string;
  is_done: boolean;
};

type StreakCalendarProps = {
  targets: CalendarTarget[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function HeaderArt() {
  return (
    <svg viewBox="0 0 540 190" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="calendar-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
          <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="calendar-moon-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <circle cx="430" cy="95" r="70" fill="url(#calendar-moon-glow)" />
      <circle cx="430" cy="95" r="34" fill="url(#calendar-moon-body)" />
      <path d="M180 190 L230 120 L270 155 L320 90 L365 150 L410 110 L460 160 L540 130 L540 190 Z" fill="var(--calendar-mountain-back)" opacity="0.85" />
      <path d="M120 190 L170 130 L210 165 L260 105 L300 160 L350 120 L400 170 L470 140 L540 190 Z" fill="var(--calendar-mountain-front)" />
    </svg>
  );
}

function CalendarMascot() {
  return (
    <svg viewBox="0 0 90 90" className="size-[76px]" fill="none" aria-hidden="true">
      <rect x="14" y="18" width="62" height="58" rx="6" fill="var(--primary)" opacity="0.25" />
      <rect x="14" y="18" width="62" height="58" rx="6" stroke="var(--primary)" strokeWidth="2.5" />
      <line x1="14" y1="34" x2="76" y2="34" stroke="var(--primary)" strokeWidth="2.5" />
      <line x1="28" y1="10" x2="28" y2="24" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="62" y1="10" x2="62" y2="24" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
      {[0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((column) => <rect key={`${row}-${column}`} x={22 + column * 13} y={42 + row * 9} width="8" height="6" rx="1.5" fill="var(--primary)" opacity={row === 0 && column < 2 ? 0.9 : 0.35} />))}
    </svg>
  );
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function StreakCalendar({ targets }: StreakCalendarProps) {
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const todayKey = toDateKey(new Date());
  const monthIndex = calendarCursor.getMonth();
  const year = calendarCursor.getFullYear();
  const monthName = calendarCursor.toLocaleString("en-US", { month: "long", year: "numeric" });
  const monthOffset = new Date(year, monthIndex, 1).getDay();
  const completedDates = new Set(targets.filter((target) => target.is_done).map((target) => target.target_date));
  const targetsByDate = new Map<string, number>();
  targets.forEach((target) => {
    targetsByDate.set(target.target_date, (targetsByDate.get(target.target_date) ?? 0) + 1);
  });
  const cells = Array.from({ length: 42 }, (_, index) => new Date(year, monthIndex, index - monthOffset + 1));

  const shiftMonth = (amount: number) => {
    setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <section className="streak-calendar depth-surface flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-border/80 bg-card p-3 text-card-foreground shadow-sm animate-reveal-up sm:rounded-[22px] sm:p-4" style={{ "--stagger": 2 } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-orange-600 text-primary-foreground shadow-sm">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-wide text-foreground">STREAK CALENDAR</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Stay consistent. Build your best.</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="grid size-7 place-items-center rounded-full bg-secondary text-primary transition-colors hover:bg-primary/15"><ChevronLeft className="size-4" /></button>
          <span className="min-w-[112px] text-center text-base font-semibold">{monthName}</span>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="grid size-7 place-items-center rounded-full bg-secondary text-primary transition-colors hover:bg-primary/15"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      <div className="calendar-hero relative mt-2 hidden min-h-[64px] overflow-hidden rounded-xl border border-border/60 px-3 py-2 lg:block">
        <HeaderArt />
        <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2 opacity-95"><CalendarMascot /></div>
      </div>

      <div className="mt-2 grid shrink-0 grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-muted-foreground sm:gap-1">
        {WEEKDAYS.map((day) => <span key={day} className="py-0.5">{day}</span>)}
      </div>

      <div className="mt-0.5 grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-0.5 text-[11px] sm:gap-1">
        {cells.map((date) => {
          const dateKey = toDateKey(date);
          const isCurrentMonth = date.getMonth() === monthIndex;
          const isToday = dateKey === todayKey;
          const isDone = completedDates.has(dateKey);
          const isMissed = isCurrentMonth && dateKey < todayKey && !isDone;
          const targetCount = targetsByDate.get(dateKey) ?? 0;
          return (
            <div key={dateKey} className={`relative flex min-h-0 flex-col items-center justify-center gap-0.5 rounded-md border p-0.5 text-[11px] transition-colors sm:rounded-lg ${isToday ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-transparent text-foreground"} ${!isCurrentMonth ? "text-muted-foreground/35" : ""}`}>
              <span className={`font-semibold ${isToday ? "text-primary" : ""}`}>{date.getDate()}</span>
              {isDone && <Check className="size-3 rounded-full bg-primary p-0.5 text-primary-foreground" strokeWidth={3} />}
              {isMissed && <Circle className="size-2.5 text-muted-foreground/70" />}
              {targetCount > 0 && !isDone && <span className="hidden rounded bg-primary/15 px-1 text-[8px] font-semibold text-primary lg:inline">{targetCount}</span>}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex shrink-0 items-center gap-3 border-t border-border/70 pt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1 text-primary"><Check className="size-3 rounded-full bg-primary p-0.5 text-primary-foreground" /> Completed</span>
        <span className="flex items-center gap-1 text-primary"><span className="size-3 rounded-full border-2 border-primary" /> Today</span>
        <span className="flex items-center gap-1"><Circle className="size-3" /> Missed</span>
      </div>
    </section>
  );
}