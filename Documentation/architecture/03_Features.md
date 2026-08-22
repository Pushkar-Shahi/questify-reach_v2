# Key Features & Mechanics

## 1. User Accounts & Admin Workflow
- **Google OAuth Login:** Users log in securely via Google.
- **Approval Gate:** By default, new users are marked as `is_approved: false` and are redirected to a "Pending Approval" screen.
- **Admin Management:** The designated admin (`shahi.pushkar2008@gmail.com`) has a unique Admin panel to review, approve, or reject pending signups. This maintains community exclusivity.

## 2. Gamification & Points Engine
The platform revolves around earning points through various verifiable actions:
- **CGPA Engine:** Students can enter their CGPA for up to 8 semesters. The formula for points is `P_CGPA = CGPA * 10`. This allows historical academic performance to contribute to the user's overall score.
- **Daily Targets:** Users can specify daily goals. Upon marking a goal as complete (honesty system), they are awarded fixed points (e.g., 5 points).
- **Streak Bonuses:** Consecutive daily logins or task completions increment a visual streak (displayed via `StreakRing.tsx`), which grants bonus points.

## 3. Social & Leaderboard
- **Dynamic Leaderboard (`leaderboard.tsx`):** A real-time ranking of all approved users based on their total cumulative points.
- **Public Profiles (`profile.$userId.tsx`):** Users can click on a leaderboard entry to view another user's public profile, inspecting their activity history, streaks, and achievements.

## 4. Interactive Mascot
- **Mascot Widget:** An interactive, persistent on-screen companion (`MascotWidget.tsx`) that reacts to user interactions with animations, messages (`mascotMessages.ts`), and audio cues (`mascotAudio.ts`). It enhances the aesthetic and engaging nature of the application.

## 5. Career & Progress Tracking
- **Career Meter / Path:** Visual components (`CareerMeter.tsx`, `CareerPath.tsx`) that display a user's progression over time or across different skill domains. It utilizes modules like `careerScore.ts` and `careerTopics.ts` to calculate and render progress metrics visually.
