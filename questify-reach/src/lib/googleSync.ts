/**
 * Google Calendar & Google Tasks Integration Service
 * Handles Google OAuth2 authentication (Google Identity Services),
 * Google Tasks API, Google Calendar API, instant 1-click calendar links, and iCal exports.
 */

export interface GoogleSyncConfig {
  clientId: string;
  autoSync: boolean;
  syncTasks: boolean;
  syncCalendar: boolean;
  calendarReminderMinutes: number;
}

export interface GoogleAuthState {
  accessToken: string | null;
  expiresAt: number | null; // timestamp in ms
  userEmail?: string | null;
  userName?: string | null;
}

export interface TargetTask {
  id: string;
  title: string;
  target_date: string; // YYYY-MM-DD
  due_time?: string | null; // HH:mm
  is_done: boolean;
  completed_at?: string | null;
  category?: string;
  notes?: string;
  google_task_id?: string | null;
  google_event_id?: string | null;
}

const DEFAULT_CLIENT_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
  "";

const STORAGE_KEYS = {
  CONFIG: "streak_google_sync_config",
  AUTH: "streak_google_auth_state",
  TASKLIST_ID: "streak_google_tasklist_id",
};

export function getGoogleSyncConfig(): GoogleSyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      return {
        clientId: DEFAULT_CLIENT_ID,
        autoSync: true,
        syncTasks: true,
        syncCalendar: true,
        calendarReminderMinutes: 15,
        ...JSON.parse(raw),
      };
    }
  } catch (e) {
    console.error("Error reading Google sync config:", e);
  }
  return {
    clientId: DEFAULT_CLIENT_ID,
    autoSync: true,
    syncTasks: true,
    syncCalendar: true,
    calendarReminderMinutes: 15,
  };
}

export function saveGoogleSyncConfig(config: Partial<GoogleSyncConfig>) {
  const current = getGoogleSyncConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
  return updated;
}

export function getGoogleAuthState(): GoogleAuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (raw) {
      const state: GoogleAuthState = JSON.parse(raw);
      // Check if token is expired
      if (state.expiresAt && Date.now() > state.expiresAt) {
        return { accessToken: null, expiresAt: null, userEmail: null, userName: null };
      }
      return state;
    }
  } catch (e) {
    console.error("Error reading Google auth state:", e);
  }
  return { accessToken: null, expiresAt: null, userEmail: null, userName: null };
}

export function saveGoogleAuthState(auth: GoogleAuthState) {
  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth));
}

export function clearGoogleAuthState() {
  localStorage.removeItem(STORAGE_KEYS.AUTH);
  localStorage.removeItem(STORAGE_KEYS.TASKLIST_ID);
}

/**
 * Loads the Google Identity Services (GIS) library dynamically
 */
export async function loadGoogleGisScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if ((window as any).google?.accounts?.oauth2) return true;

  return new Promise((resolve) => {
    const existing = document.getElementById("google-gis-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Failed to load Google Identity Services script");
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

/**
 * Initiates OAuth 2.0 Token flow using Google Identity Services
 */
export async function requestGoogleAccessToken(
  clientIdOverride?: string
): Promise<{ token: string; email?: string; name?: string }> {
  const config = getGoogleSyncConfig();
  const clientId = clientIdOverride || config.clientId || DEFAULT_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      "Google Client ID is required. Please provide a Client ID in Settings or enter it when prompted."
    );
  }

  await loadGoogleGisScript();

  if (!(window as any).google?.accounts?.oauth2) {
    throw new Error("Google Identity Services script failed to initialize.");
  }

  const scopes = [
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes,
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }

          const accessToken = response.access_token;
          const expiresIn = parseInt(response.expires_in, 10) || 3599;
          const expiresAt = Date.now() + expiresIn * 1000;

          // Fetch basic user profile info from Google
          let email: string | null = null;
          let name: string | null = null;
          try {
            const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              email = userData.email || null;
              name = userData.name || null;
            }
          } catch (e) {
            console.warn("Could not fetch Google user profile:", e);
          }

          const authState: GoogleAuthState = {
            accessToken,
            expiresAt,
            userEmail: email,
            userName: name,
          };
          saveGoogleAuthState(authState);

          resolve({ token: accessToken, email: email || undefined, name: name || undefined });
        },
      });

      client.requestAccessToken();
    } catch (err: any) {
      reject(new Error(err.message || "Failed to start Google OAuth flow"));
    }
  });
}

// ── Google Tasks API ─────────────────────────────────────────────────────────

/**
 * Gets or creates the dedicated "Questify Streak Tasks" tasklist in Google Tasks
 */
export async function getOrCreateStreakTaskList(accessToken: string): Promise<string> {
  const cachedId = localStorage.getItem(STORAGE_KEYS.TASKLIST_ID);
  if (cachedId) return cachedId;

  // List existing tasklists
  const res = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Google session expired. Please reconnect.");
    throw new Error(`Google Tasks error: ${res.statusText}`);
  }

  const data = await res.json();
  const existing = data.items?.find((l: any) => l.title === "Questify Streak Targets");
  if (existing?.id) {
    localStorage.setItem(STORAGE_KEYS.TASKLIST_ID, existing.id);
    return existing.id;
  }

  // Create new tasklist
  const createRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: "Questify Streak Targets" }),
  });

  if (!createRes.ok) {
    // Fallback to default "@default" list
    return "@default";
  }

  const newList = await createRes.json();
  if (newList.id) {
    localStorage.setItem(STORAGE_KEYS.TASKLIST_ID, newList.id);
    return newList.id;
  }
  return "@default";
}

/**
 * Sync a single target to Google Tasks
 */
export async function pushTargetToGoogleTasks(
  accessToken: string,
  target: TargetTask
): Promise<{ googleTaskId: string }> {
  const taskListId = await getOrCreateStreakTaskList(accessToken);
  const dueDate = target.target_date ? new Date(`${target.target_date}T23:59:59Z`).toISOString() : undefined;

  const body: any = {
    title: target.title,
    notes: `Questify Daily Target • +5 XP\nCategory: ${target.category || "Daily"}${target.notes ? `\n\nNotes: ${target.notes}` : ""}\n\nTrack progress on Streak: ${window.location.origin}/dashboard`,
    status: target.is_done ? "completed" : "needsAction",
  };
  if (dueDate) body.due = dueDate;
  if (target.is_done && target.completed_at) {
    body.completed = new Date(target.completed_at).toISOString();
  }

  if (target.google_task_id) {
    // Update existing task
    const updateRes = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${target.google_task_id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (updateRes.ok) {
      const data = await updateRes.json();
      return { googleTaskId: data.id };
    }
  }

  // Insert new task
  const insertRes = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!insertRes.ok) {
    throw new Error(`Failed to create Google Task: ${insertRes.statusText}`);
  }

  const data = await insertRes.json();
  return { googleTaskId: data.id };
}

// ── Google Calendar API ──────────────────────────────────────────────────────

/**
 * Creates or updates an event in Google Calendar
 */
export async function pushTargetToGoogleCalendar(
  accessToken: string,
  target: TargetTask
): Promise<{ googleEventId: string; htmlLink?: string }> {
  const dateStr = target.target_date || new Date().toISOString().split("T")[0];
  let start: any;
  let end: any;

  if (target.due_time) {
    const startTime = `${dateStr}T${target.due_time}:00`;
    const startDateObj = new Date(startTime);
    const endDateObj = new Date(startDateObj.getTime() + 45 * 60 * 1000); // 45 min default duration
    start = { dateTime: startDateObj.toISOString() };
    end = { dateTime: endDateObj.toISOString() };
  } else {
    // All-day event
    start = { date: dateStr };
    const nextDay = new Date(dateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    end = { date: nextDay.toISOString().split("T")[0] };
  }

  const config = getGoogleSyncConfig();
  const eventBody: any = {
    summary: `${target.is_done ? "✅ " : "🎯 "}${target.title}`,
    description: `Questify Streak Target\nPoints: +5 XP\nStatus: ${target.is_done ? "Completed" : "In Progress"}${
      target.notes ? `\n\nNotes: ${target.notes}` : ""
    }\n\nStreak Dashboard: ${window.location.origin}/dashboard`,
    start,
    end,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: config.calendarReminderMinutes || 15 },
        { method: "notification", minutes: 30 },
      ],
    },
  };

  if (target.google_event_id) {
    const updateRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${target.google_event_id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );
    if (updateRes.ok) {
      const data = await updateRes.json();
      return { googleEventId: data.id, htmlLink: data.htmlLink };
    }
  }

  const insertRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    }
  );

  if (!insertRes.ok) {
    throw new Error(`Failed to create Google Calendar event: ${insertRes.statusText}`);
  }

  const data = await insertRes.json();
  return { googleEventId: data.id, htmlLink: data.htmlLink };
}

// ── 1-Click Instant Google Calendar Web Intent Link ──────────────────────────

/**
 * Builds a direct Google Calendar Web link (no OAuth needed)
 * Example: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...
 */
export function buildGoogleCalendarUrl(target: {
  title: string;
  target_date?: string;
  due_time?: string | null;
  notes?: string;
}): string {
  const baseUrl = "https://calendar.google.com/calendar/render";
  const dateStr = target.target_date || new Date().toISOString().split("T")[0];
  const compactDate = dateStr.replace(/-/g, "");

  let datesParam: string;
  if (target.due_time) {
    const [h, m] = target.due_time.split(":");
    const startHour = h.padStart(2, "0");
    const startMin = (m || "00").padStart(2, "0");
    
    // Default 1 hour duration
    const endH = (parseInt(startHour, 10) + 1).toString().padStart(2, "0");
    datesParam = `${compactDate}T${startHour}${startMin}00/${compactDate}T${endH}${startMin}00`;
  } else {
    // All day
    const nextDate = new Date(dateStr);
    nextDate.setDate(nextDate.getDate() + 1);
    const compactNext = nextDate.toISOString().split("T")[0].replace(/-/g, "");
    datesParam = `${compactDate}/${compactNext}`;
  }

  const details = encodeURIComponent(
    `🎯 Questify Streak Target (+5 XP)\n\n${target.notes ? `Notes: ${target.notes}\n\n` : ""}Check in and claim XP on Streak: ${
      typeof window !== "undefined" ? window.location.origin : "https://streak.app"
    }/dashboard`
  );

  const text = encodeURIComponent(`🎯 ${target.title}`);
  return `${baseUrl}?action=TEMPLATE&text=${text}&dates=${datesParam}&details=${details}`;
}

/**
 * Link to open Google Tasks web client
 */
export function getGoogleTasksWebUrl(): string {
  return "https://tasks.google.com/embed/?origin=" + encodeURIComponent(window.location.origin);
}

/**
 * Link to open Google Calendar
 */
export function getGoogleCalendarWebUrl(): string {
  return "https://calendar.google.com/calendar/u/0/r";
}

// ── iCalendar (.ICS) Exporter ────────────────────────────────────────────────

/**
 * Generates an .ics file string for targets to import into Google Calendar / Apple Calendar
 */
export function generateIcsCalendar(targets: TargetTask[]): string {
  const nowStr = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Questify Streak//Daily Targets Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Questify Streak Targets",
    "X-WR-TIMEZONE:UTC",
  ];

  targets.forEach((target, index) => {
    const dateStr = target.target_date || new Date().toISOString().split("T")[0];
    const compactDate = dateStr.replace(/-/g, "");
    const uid = `target-${target.id || index}-${Date.now()}@questify.streak`;

    let dtStart: string;
    let dtEnd: string;

    if (target.due_time) {
      const [h, m] = target.due_time.split(":");
      const startH = h.padStart(2, "0");
      const startM = (m || "00").padStart(2, "0");
      const endH = (parseInt(startH, 10) + 1).toString().padStart(2, "0");
      dtStart = `DTSTART:${compactDate}T${startH}${startM}00`;
      dtEnd = `DTEND:${compactDate}T${endH}${startM}00`;
    } else {
      const nextDate = new Date(dateStr);
      nextDate.setDate(nextDate.getDate() + 1);
      const compactNext = nextDate.toISOString().split("T")[0].replace(/-/g, "");
      dtStart = `DTSTART;VALUE=DATE:${compactDate}`;
      dtEnd = `DTEND;VALUE=DATE:${compactNext}`;
    }

    ics.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowStr}`,
      dtStart,
      dtEnd,
      `SUMMARY:${target.is_done ? "✅ " : "🎯 "}${target.title.replace(/[,;]/g, " ")}`,
      `DESCRIPTION:Questify Streak Target (+5 XP)\\nStatus: ${
        target.is_done ? "Completed" : "Active"
      }${target.notes ? `\\nNotes: ${target.notes}` : ""}`,
      `STATUS:${target.is_done ? "COMPLETED" : "CONFIRMED"}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder: " + target.title.replace(/[,;]/g, " "),
      "END:VALARM",
      "END:VEVENT"
    );
  });

  ics.push("END:VCALENDAR");
  return ics.join("\r\n");
}

/**
 * Downloads the .ics file directly in browser
 */
export function downloadIcsFile(targets: TargetTask[], filename = "questify-streak-targets.ics") {
  const content = generateIcsCalendar(targets);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
