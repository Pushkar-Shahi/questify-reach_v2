# Database Design & Schema

The application utilizes Supabase (PostgreSQL) for its relational database. The schema is designed around three primary entities to manage users, their academic performance, and their continuous activity log.

## 1. `Users` Table
Stores authentication and profile metadata for all users.
- `user_id` (UUID, Primary Key)
- `google_id` (String) - OAuth identifier
- `email` (String) - User's email address
- `name` (String) - Display name
- `profile_picture_url` (String) - URL for user's avatar
- `is_approved` (Boolean) - Default `false`. Controls access to the platform.
- `is_admin` (Boolean) - Grants access to the admin dashboard.
- `total_points` (Integer) - Cumulative score from all activities.
- `current_streak` (Integer) - Current continuous daily streak.
- `last_active_date` (Date) - Timestamp of last login/activity.

## 2. `Semester_CGPA` Table
Records the CGPA for up to 8 semesters per user, acting as the foundation for academic points.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> Users)
- `semester_number` (Integer) - Ranges from 1 to 8.
- `cgpa_value` (Decimal) - Raw CGPA (e.g., 8.65).
- `points_earned` (Integer) - Calculated as `cgpa_value * 10`.
- `updated_at` (Timestamp) - Record modification time.

## 3. `Activity_History` Table
An append-only log detailing all points-earning actions. Used to populate profile histories and calculate live totals.
- `activity_id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> Users)
- `activity_type` (String/Enum) - Types include `TARGET_COMPLETED`, `CGPA_UPDATED`, `STREAK_BONUS`.
- `description` (Text) - Human-readable context (e.g., "Completed: Read 10 pages").
- `points_awarded` (Integer) - Points given for this specific action (e.g., +5).
- `created_at` (Timestamp) - Exact time the activity occurred.

## Real-Time & Security
- **Row Level Security (RLS):** Supabase RLS is expected to be configured so users can only write to their own records, while reading leaderboard data and public profiles is widely permitted.
- **Subscriptions:** Changes to `Users` (for leaderboard) and `Activity_History` can be subscribed to via Supabase Realtime for instant UI updates.
