# Accountability & Goal-Tracking Platform

Build a gamified goal-tracking app with Google login, admin approval gate, CGPA points, daily targets, streaks, and a live leaderboard.

## Scope

### Auth & access
- Enable Lovable Cloud + Google OAuth (via `lovable.auth.signInWithOAuth`).
- New users land on "Access Pending" screen until an admin approves them.
- `shahi.pushkar2008@gmail.com` auto-provisioned as admin and auto-approved on first login (via DB trigger).

### Pages
- `/` — public landing with Google sign-in CTA.
- `/pending` — waiting-for-approval screen.
- `/_authenticated/dashboard` — daily targets + CGPA entries + streak + point total.
- `/_authenticated/leaderboard` — live ranking by `total_points`.
- `/_authenticated/profile/$userId` — public profile with activity history.
- `/_authenticated/me` — own profile / edit name & avatar.
- `/_authenticated/admin` — admin only: pending approvals, approved users, metrics.

### Point mechanics
- Daily target completed → +5 points, activity row `TARGET_COMPLETED`.
- CGPA entry (semester 1–8 unique per user) → points = round(cgpa*10), activity `CGPA_UPDATED` (delta over prior points_earned).
- Streak: on first target completion of a day, if `last_active_date` = yesterday, `current_streak += 1` and bonus = `min(current_streak, 10)` points; if gap > 1 day, streak resets to 1.

### Data model (Supabase)
- `profiles(id uuid PK ref auth.users, email, display_name, avatar_url, is_approved bool, total_points int, current_streak int, last_active_date date, created_at)`
- `user_roles(user_id, role app_role)` + `has_role()` SECURITY DEFINER.
- `semester_cgpa(id, user_id, semester_number 1..8, cgpa_value numeric(4,2), points_earned int, updated_at)` UNIQUE(user_id, semester_number).
- `daily_targets(id, user_id, title, is_done bool, target_date date, completed_at)`.
- `activity_history(id, user_id, activity_type, description, points_awarded, created_at)`.
- Trigger `handle_new_user()` on `auth.users` insert → create profile; auto-approve + assign admin role if email = shahi.pushkar2008@gmail.com.
- Server-side functions (SECURITY DEFINER) for `complete_target`, `upsert_cgpa` to atomically update points/streak/activity.

### RLS
- profiles: SELECT for authenticated (public directory for leaderboard); UPDATE own row (name/avatar only via app UI; admin can toggle is_approved via SECURITY DEFINER fn).
- semester_cgpa, daily_targets: SELECT public, INSERT/UPDATE/DELETE own.
- activity_history: SELECT public, INSERT own (via RPC).
- user_roles: SELECT own; admin manages via RPC.

### UI
- Clean, modern design system with warm accent (amber/orange for achievement) + deep neutral base. Avoid generic purple.
- Semantic tokens in `src/styles.css`; shadcn primitives.
- Sonner for toasts.

### Tech
- TanStack Start, Supabase integration.
- `src/routes/_authenticated/route.tsx` gate + a secondary check redirecting non-approved users to `/pending`.
- Google OAuth via `lovable.auth.signInWithOAuth` + `supabase--configure_social_auth`.

## Out of scope (v1)
- File uploads for avatar (use Google avatar URL initially; add storage later).
- Notifications/email.
- Editing/deleting completed targets from prior days.
