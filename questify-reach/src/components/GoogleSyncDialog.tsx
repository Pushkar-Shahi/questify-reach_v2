import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  Download,
  RefreshCw,
  Sparkles,
  Layers,
  Settings2,
  X,
  Lock,
} from "lucide-react";
import {
  GoogleAuthState,
  GoogleSyncConfig,
  getGoogleAuthState,
  getGoogleSyncConfig,
  saveGoogleSyncConfig,
  clearGoogleAuthState,
  requestGoogleAccessToken,
  getGoogleCalendarWebUrl,
  getGoogleTasksWebUrl,
  downloadIcsFile,
  TargetTask,
} from "@/lib/googleSync";
import { toast } from "sonner";

interface GoogleSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targets: TargetTask[];
  onSyncAll?: () => Promise<boolean | void>;
}

export function GoogleSyncDialog({
  isOpen,
  onClose,
  targets,
  onSyncAll,
}: GoogleSyncDialogProps) {
  const [authState, setAuthState] = useState<GoogleAuthState>({ accessToken: null, expiresAt: null });
  const [config, setConfig] = useState<GoogleSyncConfig>(getGoogleSyncConfig());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [customClientId, setCustomClientId] = useState(config.clientId || "");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthState(getGoogleAuthState());
      const currentConfig = getGoogleSyncConfig();
      setConfig(currentConfig);
      setCustomClientId(currentConfig.clientId || "");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = !!authState.accessToken;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await requestGoogleAccessToken(customClientId);
      setAuthState(getGoogleAuthState());
      toast.success("Connected to Google Tasks & Calendar!", {
        description: res.email ? `Connected as ${res.email}` : "Ready to sync your daily targets",
      });
      if (onSyncAll) {
        onSyncAll();
      }
    } catch (err: any) {
      toast.error("Google connection failed", {
        description: err.message || "Please check your Google Client ID or try instant calendar links.",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    clearGoogleAuthState();
    setAuthState({ accessToken: null, expiresAt: null });
    toast.info("Disconnected from Google Account");
  };

  const handleSaveConfig = () => {
    saveGoogleSyncConfig({
      clientId: customClientId.trim(),
      autoSync: config.autoSync,
      syncTasks: config.syncTasks,
      syncCalendar: config.syncCalendar,
    });
    setConfig(getGoogleSyncConfig());
    toast.success("Settings saved");
  };

  const handleSyncNow = async () => {
    if (!onSyncAll) return;
    setIsSyncing(true);
    try {
      await onSyncAll();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportIcs = () => {
    if (targets.length === 0) {
      toast.info("No targets to export yet. Add a target first!");
      return;
    }
    downloadIcsFile(targets);
    toast.success("Downloaded calendar file (.ics)", {
      description: "Import this file into Google Calendar > Settings > Import & Export",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl text-card-foreground">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="size-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-1.5">
                Google Calendar & Tasks Sync
              </h3>
              <p className="text-xs text-muted-foreground">
                See your daily targets on Google Calendar and Google Tasks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 pt-4">
          
          {/* Connection Card */}
          <div className="rounded-xl border border-border/80 bg-secondary/40 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Google Icon */}
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <svg className="size-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    {isConnected ? "Google Account Connected" : "Connect Google Account"}
                    {isConnected && <CheckCircle2 className="size-4 text-emerald-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isConnected
                      ? authState.userEmail || "Auto-sync enabled for tasks & calendar"
                      : "Sync targets to Google Tasks & Google Calendar"}
                  </div>
                </div>
              </div>

              {isConnected ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Sparkles className="size-3.5" />
                  {isConnecting ? "Connecting..." : "Connect Google"}
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions & Instant Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Direct Google Calendar Link */}
            <a
              href={getGoogleCalendarWebUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3 hover:bg-secondary/60 transition-colors text-xs font-semibold text-foreground group"
            >
              <span className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                Open Google Calendar
              </span>
              <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>

            {/* Direct Google Tasks Link */}
            <a
              href={getGoogleTasksWebUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3 hover:bg-secondary/60 transition-colors text-xs font-semibold text-foreground group"
            >
              <span className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                Open Google Tasks
              </span>
              <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          </div>

          {/* Export to .ICS */}
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-secondary/30 p-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-semibold text-foreground">Import File (.ics)</div>
              <div className="text-[11px] text-muted-foreground">
                Download all targets as a calendar file to import anywhere
              </div>
            </div>
            <button
              onClick={handleExportIcs}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <Download className="size-3.5" />
              Download .ics
            </button>
          </div>

          {/* Settings toggle */}
          <div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2 className="size-3.5" />
              {showConfig ? "Hide Google OAuth settings" : "Configure Custom Google OAuth Client ID"}
            </button>

            {showConfig && (
              <div className="mt-2.5 space-y-2 rounded-xl border border-border bg-secondary/30 p-3 animate-reveal-down">
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Google Cloud OAuth 2.0 Client ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    className="flex-1 rounded-lg border border-input bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={handleSaveConfig}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                </div>
                <div className="text-[10.5px] text-muted-foreground leading-relaxed">
                  💡 Note: Every target also has an instant <b>1-Click "Add to Google Calendar"</b> button on the dashboard that works directly without entering credentials!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
