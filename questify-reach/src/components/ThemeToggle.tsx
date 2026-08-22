import { useEffect, useRef, useState } from "react";
import { Moon, Sun, Check } from "lucide-react";

export type Theme = "light" | "dark" | "amoled";

const STORAGE_KEY = "theme";
let themeTransitionTimer: number | undefined;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  root.classList.toggle("dark", theme === "dark" || theme === "amoled");
  root.classList.remove("lavender");
  root.classList.toggle("amoled", theme === "amoled");
  if (themeTransitionTimer !== undefined) window.clearTimeout(themeTransitionTimer);
  window.requestAnimationFrame(() => {
    themeTransitionTimer = window.setTimeout(() => {
      root.classList.remove("theme-transition");
      themeTransitionTimer = undefined;
    }, 260);
  });
}

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "lavender") return "dark";
  if (stored === "light" || stored === "dark" || stored === "amoled") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Broadcast so every mounted consumer stays in sync. */
const listeners = new Set<(t: Theme) => void>();

export function setThemeGlobal(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  listeners.forEach((l) => l(theme));
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    applyTheme(initial);
    listeners.add(setTheme);
    return () => {
      listeners.delete(setTheme);
    };
  }, []);

  return { theme, setTheme: setThemeGlobal };
}

export const THEME_OPTIONS: { key: Theme; label: string; icon: React.ReactNode }[] = [
  { key: "light", label: "Light", icon: <Sun className="size-4" /> },
  { key: "dark", label: "Dark", icon: <Moon className="size-4" /> },
  { key: "amoled", label: "AMOLED", icon: <Moon className="size-4" fill="currentColor" /> },
];

const OPTIONS = THEME_OPTIONS;

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = OPTIONS.find((o) => o.key === theme) ?? OPTIONS[0];

  const positionMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = 176;
    setMenuPosition({
      top: rect.bottom + 8,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    });
  };

  useEffect(() => {
    if (!open) return;
    positionMenu();
    const close = () => setOpen(false);
    const reposition = () => positionMenu();
    window.addEventListener("click", close);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Theme settings"
        title="Theme settings"
        className="grid size-9 sm:size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {current.icon}
      </button>
      {open && (
        <div
          role="menu"
          className="animate-accordion-open fixed z-50 w-44 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-2xl"
          style={{ ...menuPosition, boxShadow: "var(--shadow-card)" }}
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Appearance
          </div>
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              role="menuitemradio"
              aria-checked={theme === o.key}
              onClick={() => {
                setTheme(o.key);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                theme === o.key
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.icon}
              <span className="flex-1 text-left">{o.label}</span>
              {theme === o.key && <Check className="size-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
