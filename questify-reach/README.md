# Goal Spark

# Accountability & Goal-Tracking Platform Spec



## 1. Core Platform Concept

A dynamic, interactive accountability and goal-tracking website designed to keep users motivated through gamification, streak rewards, and a real-time points leaderboard.



## 2. User Accounts & Access Control

* **Google OAuth Login:** Quick and secure sign-in using Google accounts to manage session state and user identity.

* **Admin Approval Gate (Whitelisting):** When a new user logs in for the first time, their account status is set to "Pending Approval". They cannot access any platform features until approved.

* **Designated Admin:** `shahi.pushkar2008@gmail.com` is configured as the primary Admin, automatically granting access to the approval workflow.

* **Profile Setup:** Once approved, users can set their display name and upload a custom profile picture (DP).

* **Personal Activity History:** A dedicated profile dashboard displaying a complete real-time log of points earned (tasks completed, point values, timestamps).



## 3. Leaderboard & Social Features

* **Dynamic Leaderboard:** Real-time updates displaying top-ranked users based on cumulative points.

* **Public Profile Viewing:** Clicking any user on the leaderboard opens their public profile to view their activity log and progress.



## 4. Key Features & Point Mechanics

* **CGPA Point Engine (8 Semesters):** Strictly limited to 8 total entries pre-named "Semester 1" to "Semester 8" (2 entries per year). Preserves up to two decimal places and multiplies by 10 (Formula: P_CGPA = CGPA x 10).

* **Daily Targets:** Users can set multiple daily goals, each awarding 5 points upon completion.

* **Honesty System:** No proof required. Users simply mark tasks as done.

* **Streak Bonuses:** Daily login/completion streaks grant bonus points.



---



## 5. Admin Dashboard Plan

Since `shahi.pushkar2008@gmail.com` is the admin, the website will check the logged-in user's email upon sign-in. If it matches, an extra "Admin Panel" navigation link appears.



### Core Functionality & Features

* **User Management Tab:**

  * **Pending Approvals Table:** Shows all new users waiting for access with details (Google Name, Email, Profile Picture, Date Joined).

  * **Quick Action Buttons:** [ Approve ] (Grants immediate access) and [ Reject / Delete ] (Denies access or removes account).

  * **Approved Users List:** View all active users, search by name/email, and revoke access if necessary.

* **Activity & Oversight Tab:**

  * View overall site metrics (Total Approved Users, Active Streaks Today, Total Tasks Completed).

* **Notification Alert:**

  * Shows a badge on the Admin button (e.g., `Admin Panel (3)`) whenever new users are waiting for approval.



### User View (When Not Yet Approved)

When a non-approved user logs in via Google, they are directed to a friendly "Access Pending" screen:

> "Thanks for logging in! Your request has been sent to the admin (shahi.pushkar2008@gmail.com). You will get full access once your account is approved."



---



## 6. Database Design & Architecture

Structured with three primary entities (Relational or NoSQL):



* **Users Table:**

  * `user_id` (Primary Key)

  * `google_id`, `email`, `name`, `profile_picture_url`

  * `is_approved` (Boolean: false by default, set to true when admin grants permission)

  * `is_admin` (Boolean: grants access to the admin approval panel)

  * `total_points` (Calculated or cached)

  * `current_streak` & `last_active_date`



* **Semester_CGPA Table:**

  * `id`, `user_id`

  * `semester_number` (1 through 8)

  * `cgpa_value` (Decimal, e.g., 8.65)

  * `points_earned` (cgpa_value x 10)

  * `updated_at` (Timestamp)



* **Activity_History Table:**

  * `activity_id`, `user_id`

  * `activity_type` ("TARGET_COMPLETED", "CGPA_UPDATED", "STREAK_BONUS")

  * `description` (e.g., "Completed: Read 10 page

s")

  * `points_awarded` (e.g., +5)

  * `created_at` (Timestamp)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9cda81dc-6a60-496f-88f3-d244184f98ba).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
