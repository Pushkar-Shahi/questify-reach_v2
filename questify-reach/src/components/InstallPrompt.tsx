import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed";

/** Non-intrusive install banner. Chrome/Edge/Android use the native prompt;
 *  iOS Safari has no event, so we show the Add-to-Home-Screen hint instead. */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Android/.test(ua);
    if (isIos && isSafari) setIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
    setIosHint(false);
  };

  if (!deferred && !iosHint) return null;

  return (
    <div
      role="region"
      aria-label="Install this app"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-3 sm:bottom-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
          <Download className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Install Streak</p>
          <p className="text-xs text-muted-foreground">
            {deferred ? "Get the full-screen app with offline access." : "Tap Share, then “Add to Home Screen”."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {deferred && (
            <button
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                dismiss();
              }}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Install
            </button>
          )}
          <button onClick={dismiss} aria-label="Dismiss install prompt" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
