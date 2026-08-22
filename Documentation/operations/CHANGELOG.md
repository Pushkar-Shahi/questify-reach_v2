# Changelog & Implementation History

This document chronicles all features, updates, optimizations, and bug fixes applied to the application.

---

## 1. Google Tasks & Google Calendar Integration
- **Direct Google OAuth (GIS)**: Integrated Google Identity Services Token Client (`https://accounts.google.com/gsi/client`) enabling direct client-side authentication with scopes:
  - `https://www.googleapis.com/auth/tasks`
  - `https://www.googleapis.com/auth/calendar.events`
- **Google Tasks Dedicated List**: Automatically creates or retrieves a dedicated `"Questify Streak Targets"` list so all targets render natively on Google Calendar's Tasks sidebar.
- **1-Click Google Calendar Web Intent**: Generated direct URLs (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`) allowing instantaneous 1-click scheduling without mandatory OAuth.
- **Universal `.ics` iCalendar Exporter**: Added `.ics` file generator and downloader for Outlook, Apple Calendar, and Google Calendar import.
- **Interactive Daily Target Hook (`useDailyTargets.ts`)**: Added full target management (add target with optional time, toggle with +5 XP confetti toast, delete, reschedule, and auto-sync).

---

## 2. macOS-Style Navigation & Transitions
- **Spring Transition Animations**: Implemented `@keyframes macos-tab-enter` using Apple's fluid spring curve (`cubic-bezier(0.16, 1, 0.3, 1)`), combining subtle scale (`0.988` → `1.0`), slight vertical drift (`6px` → `0px`), and soft blur dissipation (`3px` → `0px`).
- **Route Key Transitions**: Bound `<Outlet />` with dynamic path keys to trigger smooth page-switch animations between tabs (`/dashboard`, `/leaderboard`, `/me`, `/admin`).

---

## 3. Centered Floating Header Island
- **Unified Center Navigation**: Consolidated the Streak brand logo, the navigation tab bar, and the action icon cluster (Notification Bell, User Avatar, Theme Selector, Logout) into a single centered frosted-glass floating capsule (`bg-secondary/40 border border-border/80 shadow-md backdrop-blur-xl`).
- **Clean Symmetrical Dividers**: Embedded subtle vertical separators between the logo, tabs, and action icons for visual structure.
- **Action Icons Repair & Sizing**:
  - Unlocked `NotificationBell.tsx` to render across demo and authenticated modes.
  - Removed container clipping so notification and theme popup dropdowns open with full z-index.
  - Standardized all button geometry to `size-9 sm:size-10`.

---

## 4. Theme System Overhaul
- **☀️ Light Theme**: Crisp typography (`oklch(0.16 0.02 55)`), warm amber primary (`oklch(0.64 0.2 42)`), and clean contrast surfaces.
- **🌙 Dark Theme**: Warm obsidian background (`oklch(0.15 0.015 60)`), electric luminous amber highlights, and layered cards.
- **✨ Lavender Theme**: Deep ethereal plum-violet base (`oklch(0.15 0.03 285)`), radiant amethyst accents (`oklch(0.8 0.14 295)`), and ambient purple glows.
- **🖤 AMOLED Theme**: Pure true OLED pitch black (`#000000`), pure monochrome white (`#ffffff`), and crisp 1px borders with zero color bleeding.

---

## 5. Backend, Caching & Security Optimizations
- **React Query Cache Tuning**: Set `staleTime: 30s`, `gcTime: 15m`, disabled `refetchOnWindowFocus` in `router.tsx` and custom query hooks (`useAuth.ts`, `career.ts`).
- **Nitro / SSR Security Headers**: In `server.ts`, added `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and static asset cache controls.
- **Instant Demo Access**: Added seamless fallback button on landing page to bypass Supabase OAuth configuration constraints when testing.
