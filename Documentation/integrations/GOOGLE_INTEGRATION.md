# Google Tasks & Google Calendar Integration

This document outlines the architecture, authentication flow, and synchronization mechanisms connecting daily targets to Google Tasks and Google Calendar.

---

## 1. Key Features
1. **Google Identity Services (GIS) OAuth 2.0**:
   - Uses `https://accounts.google.com/gsi/client` to request ephemeral access tokens directly from the browser.
   - Required OAuth Scopes:
     - `https://www.googleapis.com/auth/tasks`
     - `https://www.googleapis.com/auth/calendar.events`
2. **Dedicated Google Tasks List**:
   - Tasks are pushed directly to a dedicated `"Questify Streak Targets"` list.
   - Any task in this list automatically appears on the official **Google Calendar** sidebar under Tasks.
3. **1-Click Web Intent ("Add to Google Calendar")**:
   - Generates pre-filled Google Calendar web intent URLs:
     `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...`
   - Works immediately for any user without requiring OAuth credentials.
4. **Universal iCalendar (`.ics`) File Exporter**:
   - Generates RFC 5545-compliant `.ics` calendar files with alarms and timestamps for import into Google Calendar, Apple Calendar, or Microsoft Outlook.

---

## 2. File Architecture

### [`src/lib/googleSync.ts`](../questify-reach/src/lib/googleSync.ts)
Contains the core API methods:
- `initGoogleTokenClient()`: Loads the GIS client script dynamically and initializes token client.
- `requestGoogleAccessToken()`: Triggers the Google account consent dialog.
- `getOrCreateStreakTaskList()`: Finds or creates the `"Questify Streak Targets"` list via Google Tasks REST API.
- `syncTargetToGoogleTasks()`: Creates a task with title, notes, and due date.
- `createGoogleCalendarEvent()`: Creates a timed event on the user's primary calendar.
- `buildGoogleCalendarUrl()`: Formats a direct web intent link.
- `downloadIcsFile()`: Exports all pending targets as a downloadable `.ics` calendar file.

### [`src/hooks/useDailyTargets.ts`](../questify-reach/src/hooks/useDailyTargets.ts)
Custom React hook managing daily targets:
- Targets state with Supabase database persistence and local storage fallback.
- Adds new targets with optional reminder times (e.g. `09:00`, `14:30`).
- Completion toggling triggers +5 XP toast reward.
- Direct helper to open 1-click Google Calendar links.

### [`src/components/GoogleSyncDialog.tsx`](../questify-reach/src/components/GoogleSyncDialog.tsx)
The modal interface for managing Google integrations:
- Shows connection status and Google account status.
- Batch "Sync All Targets to Google Tasks" button.
- 1-Click "Download .ics Calendar File" button.
- Step-by-step setup helper and Client ID configuration.
