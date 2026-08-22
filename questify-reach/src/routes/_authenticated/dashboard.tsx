import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Trophy,
  ClipboardCheck,
  Flame,
  TrendingUp,
  History,
  Calendar as CalendarIcon,
  Trash2,
  Plus,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Clock,
  Sparkles,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useAuthUser, useMyProfile } from "@/hooks/useAuth";
import { useMyCareer } from "@/lib/career";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useDailyTargets } from "@/hooks/useDailyTargets";
import { buildGoogleCalendarUrl, getGoogleAuthState } from "@/lib/googleSync";
import { GoogleSyncDialog } from "@/components/GoogleSyncDialog";
import StreakCalendar from "@/components/StreakCalendar";

const ROADMAP_OPTIONS = [
  { title: "MLOps Engineer", description: "Ship reliable ML systems from notebook to production.", stages: ["Python + Linux", "ML Systems", "Cloud Deployments", "Production MLOps"], curriculum: ["Python, Linux and Git foundations", "Statistics and machine learning workflows", "Docker, Kubernetes and CI/CD", "Cloud infrastructure and observability", "Model serving, monitoring and retraining"] },
  { title: "Frontend Engineer", description: "Build expressive, accessible products for the web.", stages: ["HTML + CSS", "JavaScript", "React Systems", "Product Craft"], curriculum: ["Semantic HTML and responsive CSS", "JavaScript, browser APIs and accessibility", "React, TypeScript and state management", "Testing, performance and design systems", "Shipping polished production interfaces"] },
  { title: "Data Engineer", description: "Turn raw information into dependable data products.", stages: ["SQL Foundations", "Data Modeling", "Pipelines", "Data Platforms"], curriculum: ["SQL and relational database foundations", "Data modeling and warehouse design", "Batch and streaming pipelines", "Orchestration, testing and data quality", "Cloud data platforms and governance"] },
] as const;

const ROADMAP_STORAGE_KEY = "questify-selected-roadmap";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard" },
      { name: "description", content: "Track today's targets, streak and career progress." },
    ],
  }),
  component: Dashboard,
});

export function Dashboard() {
  const { user } = useAuthUser();
  const { data: profile } = useMyProfile(user?.id);
  const career = useMyCareer(user?.id);
  const targetsReveal = useScrollReveal("up");
  const missedReveal = useScrollReveal("up");

  const {
    targets,
    todayTargets,
    todayDoneCount,
    addTarget,
    toggleTarget,
    deleteTarget,
    syncAllToGoogle,
  } = useDailyTargets(user?.id);

  // Target input state
  const [newTitle, setNewTitle] = useState("");
  const [isGoogleDialogOpen, setIsGoogleDialogOpen] = useState(false);
  const [isRoadmapPickerOpen, setIsRoadmapPickerOpen] = useState(false);
  const [selectedRoadmap, setSelectedRoadmap] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ROADMAP_STORAGE_KEY);
  });
  const [roadmapDetail, setRoadmapDetail] = useState<string | null>(null);
  const [closingRoadmapModal, setClosingRoadmapModal] = useState<"picker" | "detail" | null>(null);
  const [showMissedMissions, setShowMissedMissions] = useState(false);

  const authState = getGoogleAuthState();
  const isGoogleConnected = !!authState.accessToken;

  const closeRoadmapModal = (type: "picker" | "detail", after?: () => void) => {
    setClosingRoadmapModal(type);
    window.setTimeout(() => {
      if (type === "picker") setIsRoadmapPickerOpen(false);
      else setRoadmapDetail(null);
      setClosingRoadmapModal(null);
      after?.();
    }, 220);
  };

  const totalPoints = (profile?.total_points ?? 240) + todayDoneCount * 5;
  const streak = profile?.current_streak ?? 1;

  const handleAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    await addTarget({
      title: newTitle.trim(),
    });
    setNewTitle("");
  };

  // Initial demo missed items if none exist in storage
  const [demoMissed, setDemoMissed] = useState([
    { id: "demo-1", name: "Time complexity 2", date: "8/10/2026" },
    { id: "demo-2", name: "Array 1", date: "8/7/2026" },
    { id: "demo-3", name: "Array 2", date: "8/7/2026" },
  ]);

  const handleReviveMissed = (name: string, isTomorrow = false) => {
    const targetDate = new Date();
    if (isTomorrow) targetDate.setDate(targetDate.getDate() + 1);
    const dateStr = targetDate.toISOString().split("T")[0];

    addTarget({
      title: name,
      target_date: dateStr,
    });
    setDemoMissed((prev) => prev.filter((m) => m.name !== name));
  };

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 grid-rows-[minmax(0,1.05fr)_minmax(0,0.9fr)_minmax(0,1.05fr)] gap-2 sm:grid-cols-2 sm:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-3 lg:grid-rows-1 lg:gap-3">
      
      {/* Top Card */}
      <div className="depth-surface flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border-2 border-border/80 bg-card p-3 text-card-foreground shadow-lg animate-reveal-up sm:rounded-[22px] sm:p-4" style={{ "--stagger": 0 } as React.CSSProperties}>
        <div className="relative mb-2 hidden overflow-hidden rounded-xl border border-border/70 bg-primary/5 px-3 py-2 sm:block">
          <div className="absolute -right-8 -top-12 size-40 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative z-10">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold tracking-[0.15em] text-muted-foreground"><Sparkles className="size-3.5 text-primary" /> OVERVIEW</div>
            <div className="text-base font-extrabold leading-tight">Keep showing up, <span className="text-primary">build your future.</span></div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center sm:w-[108px]">
            <div className="relative size-[88px] sm:size-[100px]">
              <svg className="size-full -rotate-90" viewBox="0 0 150 150">
                <circle className="fill-none stroke-border stroke-[7]" cx="75" cy="75" r="70" />
                <circle className="fill-none stroke-primary stroke-[7] stroke-linecap-round animate-stroke" cx="75" cy="75" r="70" strokeDasharray="440" strokeDashoffset={440 - (440 * (streak / 30))} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] tracking-[1.5px] text-muted-foreground">DAILY STREAK</div>
                <div className="mt-1 flex items-center gap-1 text-2xl font-extrabold leading-none"><span className="text-primary">✦</span>{streak}</div>
                <div className="mt-1 text-xs text-muted-foreground">DAYS</div>
              </div>
            </div>
          </div>
          <div className="grid flex-1 gap-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-secondary/50 px-3 py-2">
              <Trophy className="size-6 shrink-0 text-primary" />
              <div><div className="text-[9px] uppercase text-muted-foreground">Total points</div><div className="text-lg font-bold">{totalPoints}</div><div className="text-[9px] text-primary">+5 today</div></div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-secondary/50 px-3 py-2">
              <ClipboardCheck className="size-6 shrink-0 text-primary" />
              <div><div className="text-[9px] uppercase text-muted-foreground">Missions completed</div><div className="text-lg font-bold">{todayDoneCount}</div><div className="text-[9px] text-primary">today</div></div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-secondary/50 px-3 py-2">
              <Flame className="size-6 shrink-0 text-primary" />
              <div><div className="text-[9px] uppercase text-muted-foreground">Current streak</div><div className="text-lg font-bold">{streak} <span className="text-[10px] font-normal text-muted-foreground">DAYS</span></div><div className="text-[9px] text-primary">Best: {Math.max(streak, 28)} days</div></div>
            </div>
          </div>
        </div>

        <div className="mt-2 shrink-0 rounded-2xl border border-border/70 bg-secondary/20 p-2.5 sm:mt-3 sm:p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground"><TrendingUp className="size-4 text-primary" /> WEEKLY PROGRESS</div>
            <div className="text-right"><div className="text-lg font-extrabold">{todayDoneCount}<span className="text-xs font-normal text-muted-foreground">/7</span></div><div className="text-[10px] text-muted-foreground">days</div></div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">You’re doing great! Keep the momentum.</div>
          <div className="mt-3 flex items-center justify-between">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, index) => {
              const active = index === 0 && todayDoneCount > 0;
              return <div key={day} className="flex flex-col items-center gap-1"><div className={`grid size-6 place-items-center rounded-full border text-[9px] ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>{active ? '✓' : ''}</div><span className={`text-[8px] ${active ? 'text-primary' : 'text-muted-foreground'}`}>{day}</span></div>;
            })}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (todayDoneCount / 7) * 100)}%` }} /></div>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col justify-center rounded-2xl border border-border/70 bg-secondary/15 px-3 py-4 sm:px-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground">
              <TrendingUp className="size-4 text-primary" /> CAREER CHANCE METER
            </div>
            <button type="button" onClick={() => selectedRoadmap ? setRoadmapDetail(selectedRoadmap) : setIsRoadmapPickerOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80">
              Roadmap <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl font-extrabold sm:text-[28px]">{career.track?.title ?? "MLOps Engineer"}</div>
              <div className="mt-2 text-xs text-muted-foreground">Keep building your career readiness.</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-primary">{Math.round((career.percent ?? 1.2) * 10) / 10}%</div>
              <div className="text-xs text-muted-foreground">Overall progress</div>
            </div>
          </div>
          <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-border"><div className="h-full min-w-[14px] rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(1.2, career.percent ?? 1.2))}%` }} /></div>
          <div className="mt-5 grid grid-cols-5 gap-1 text-center text-[10px] text-muted-foreground">
            {['Foundations', 'Skills', 'Projects', 'Experience', 'Mastery'].map((label, index) => (
              <div key={label}>
                <div className={`mx-auto mb-1.5 grid size-8 place-items-center rounded-full border ${index < 2 ? 'border-primary bg-primary/10 text-primary' : index === 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{index < 2 ? '✓' : index === 2 ? '▣' : '•'}</div>
                {label}
              </div>
            ))}
          </div>
        </div>

      </div>

      <StreakCalendar targets={targets} />

      {/* Today's targets and missed missions */}
      <div className="depth-surface flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-border/80 bg-card text-card-foreground shadow-sm sm:col-span-2 sm:rounded-[22px] lg:col-span-1">
        <div ref={targetsReveal} className="flex h-full min-h-0 w-full flex-col px-3 py-3 sm:px-4" style={{ "--stagger": 0 } as React.CSSProperties}>
        
        {/* Section Header with Google Sync Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-[18px] gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] sm:text-[17px] font-bold">Today's targets</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMissedMissions((visible) => !visible)}
            aria-expanded={showMissedMissions}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            Missed missions
            <ChevronDown className={`size-3.5 transition-transform ${showMissedMissions ? "rotate-180" : ""}`} />
          </button>

          {/* Google Calendar & Tasks Integration Button */}
          <button
            onClick={() => setIsGoogleDialogOpen(true)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              isGoogleConnected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover-btn"
            }`}
          >
            <div className="flex size-4 shrink-0 items-center justify-center">
              {/* Google G icon */}
              <svg className="size-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
            </div>
            <span>{isGoogleConnected ? "Google Synced" : "Connect Google Calendar/Tasks"}</span>
          </button>
        </div>

        {/* Target Input Form */}
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-2 mb-3">
          <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-input p-1.5 focus-within:border-primary/50">
            <input 
              className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-foreground text-xs placeholder:text-muted-foreground focus:outline-none" 
              type="text" 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Read 10 pages, workout, DSA problem..." 
            />

            <button 
              type="submit"
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-80 hover-btn"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </form>

        {/* Targets List */}
        {todayTargets.length > 0 && (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pt-1">
            {todayTargets.map((target, idx) => {
              const googleCalUrl = buildGoogleCalendarUrl(target);

              return (
                <div
                  key={target.id || idx}
                  className={`group flex flex-col justify-between gap-2 rounded-xl border p-2.5 transition-all sm:flex-row sm:items-center sm:px-3 sm:py-2.5 ${
                    target.is_done
                      ? "border-border/50 bg-secondary/30 text-muted-foreground"
                      : "border-border bg-secondary/60 text-foreground hover:border-primary/40"
                  }`}
                >
                  {/* Left: Checkbox + Title + Time */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTarget(target.id)}
                      className="shrink-0 text-primary transition-transform active:scale-90"
                      aria-label={target.is_done ? "Mark incomplete" : "Mark done"}
                    >
                      {target.is_done ? (
                        <CheckCircle2 className="size-5 text-emerald-500 fill-emerald-500/20" />
                      ) : (
                        <Circle className="size-5 stroke-[1.8] text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div
                        className={`text-sm font-semibold truncate ${
                          target.is_done ? "line-through opacity-75" : ""
                        }`}
                      >
                        {target.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        {target.due_time && (
                          <span className="flex items-center gap-1 text-primary">
                            <Clock className="size-3" />
                            {target.due_time}
                          </span>
                        )}
                        <span>+5 XP</span>
                        {target.is_done && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            • Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: 1-Click Google Calendar & Delete */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    
                    {/* 1-Click "Add to Google Calendar" link */}
                    <a
                      href={googleCalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm group/btn"
                      title="Open and save in Google Calendar"
                    >
                      <CalendarIcon className="size-3 text-primary group-hover/btn:scale-110 transition-transform" />
                      <span>Google Calendar</span>
                      <ExternalLink className="size-2.5 text-muted-foreground" />
                    </a>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => deleteTarget(target.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete target"
                      aria-label="Delete target"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

        {/* Missed missions */}
        {showMissedMissions && <div ref={missedReveal} className="min-h-0 flex-1 overflow-y-auto px-1 py-2" style={{ "--stagger": 1 } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-3 sm:mb-[18px]">
          <div className="flex items-center gap-2">
            <History className="w-[18px] h-[18px] text-primary" strokeWidth={2.5} />
            <span className="text-[17px] sm:text-[19px] font-bold">Missed missions</span>
          </div>
          <div className="text-[12px] sm:text-[13px] text-muted-foreground hidden sm:block">reuse with progress reset</div>
        </div>

        {demoMissed.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-4">
            No missed missions. You are completely caught up!
          </div>
        ) : (
          demoMissed.map((mission, i) => (
            <div key={mission.id || i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-secondary border border-border rounded-2xl px-4 sm:px-5 py-3 sm:py-4 mb-3 last:mb-0 gap-2.5 sm:gap-0 animate-reveal-up" style={{ "--stagger": i } as React.CSSProperties}>
              <div>
                <div className="text-[14px] sm:text-[15px] font-bold mb-0.5 sm:mb-1">{mission.name}</div>
                <div className="text-[12px] sm:text-[13px] text-muted-foreground">missed on {mission.date}</div>
              </div>
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <button 
                  onClick={() => handleReviveMissed(mission.name, false)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-[10px] px-3 sm:px-4 py-2 text-[13px] sm:text-[13.5px] font-semibold bg-primary text-primary-foreground hover:opacity-80 hover-btn transition-opacity"
                >
                  <History className="w-[15px] h-[15px]" />
                  Today
                </button>
                <button 
                  onClick={() => handleReviveMissed(mission.name, true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-[10px] px-3 sm:px-4 py-2 text-[13px] sm:text-[13.5px] font-semibold bg-secondary-foreground/5 text-foreground border border-border hover:bg-secondary-foreground/10 hover-btn transition-colors"
                >
                  <CalendarIcon className="w-[15px] h-[15px]" />
                  Tomorrow
                </button>
                <button 
                  onClick={() => setDemoMissed((prev) => prev.filter((m) => m.id !== mission.id))}
                  className="w-[34px] h-[34px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ml-auto sm:ml-1"
                  aria-label="Remove missed mission"
                >
                  <Trash2 className="w-[17px] h-[17px]" />
                </button>
              </div>
            </div>
          ))
        )}
        </div>}
      </div>

      {/* Google Calendar & Google Tasks Modal */}
      <GoogleSyncDialog
        isOpen={isGoogleDialogOpen}
        onClose={() => setIsGoogleDialogOpen(false)}
        targets={targets}
        onSyncAll={syncAllToGoogle}
      />

      {user && isRoadmapPickerOpen && (
        <div className={`roadmap-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm ${closingRoadmapModal === "picker" ? "roadmap-modal-closing" : ""}`}>
          <div className="roadmap-modal-panel w-full max-w-4xl rounded-2xl border-2 border-border/80 bg-card p-5 text-card-foreground shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Career roadmap</div>
                <h2 className="mt-1 text-2xl font-extrabold">Choose your next route</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick a direction to preview its four-stage progression.</p>
              </div>
              <button type="button" onClick={() => closeRoadmapModal("picker")} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Close</button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {ROADMAP_OPTIONS.map((roadmap) => (
                <button
                  key={roadmap.title}
                  type="button"
                  onClick={() => {
                    closeRoadmapModal("picker", () => setRoadmapDetail(roadmap.title));
                  }}
                  className="group rounded-2xl border-2 border-border bg-secondary/30 p-4 text-left transition hover:-translate-y-1 hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold">{roadmap.title}</h3>
                    <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{roadmap.description}</p>
                  <div className="mt-5 space-y-2">
                    {roadmap.stages.map((stage, index) => (
                      <div key={stage} className="flex items-center gap-2 text-xs">
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${index < 2 ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{index + 1}</span>
                        <span className="text-muted-foreground">{stage}</span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {roadmapDetail && (() => {
        const roadmap = ROADMAP_OPTIONS.find((option) => option.title === roadmapDetail);
        if (!roadmap) return null;
        return (
          <div className={`roadmap-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm ${closingRoadmapModal === "detail" ? "roadmap-modal-closing" : ""}`}>
            <div className="roadmap-modal-panel w-full max-w-2xl rounded-2xl border-2 border-border/80 bg-card p-5 text-card-foreground shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Roadmap curriculum</div>
                  <h2 className="mt-1 text-2xl font-extrabold">{roadmap.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{roadmap.description}</p>
                </div>
                <button type="button" onClick={() => closeRoadmapModal("detail")} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Close</button>
              </div>
              <div className="mt-6 space-y-3">
                {roadmap.curriculum.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-primary bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => closeRoadmapModal("detail", () => setIsRoadmapPickerOpen(true))} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Change roadmap</button>
                {selectedRoadmap === roadmap.title ? (
                  <span className="text-sm font-semibold text-primary">Selected roadmap</span>
                ) : (
                  <button type="button" onClick={() => { window.localStorage.setItem(ROADMAP_STORAGE_KEY, roadmap.title); setSelectedRoadmap(roadmap.title); closeRoadmapModal("detail"); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">Confirm this roadmap</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
