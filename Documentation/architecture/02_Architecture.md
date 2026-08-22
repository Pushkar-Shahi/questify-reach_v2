# Architecture & Tech Stack

## Technology Stack

### Frontend
- **React (v19):** Modern component-based UI development.
- **TanStack Start & Router:** Provides powerful, type-safe routing capabilities and handles the application's skeletal layout (`routeTree.gen.ts`).
- **TanStack Query:** Manages server state, caching, and data fetching operations (especially with Supabase).
- **Vite:** Blazing fast frontend build tool and development server.
- **Tailwind CSS (v4):** Utility-first styling for rapid, responsive UI development.
- **Radix UI:** A suite of unstyled, accessible UI components (dialogs, tooltips, popovers, tabs, etc.) that form the foundation of the design system.
- **Lucide React:** Iconography library used throughout the UI.

### Backend & Infrastructure
- **Supabase:** The primary BaaS (Backend as a Service).
  - **Auth:** Google OAuth integration.
  - **Database:** PostgreSQL database for storing users, activity history, and scores.
- **Platform/Hosting:** The project is configured for seamless deployment, built using the Lovable editor which maintains a sync with GitHub.

## Application Structure (questify-reach/src)

- `/components/`: Reusable UI elements and feature-specific components.
  - `/ui/`: Generic, atomic UI components (buttons, inputs, cards) usually wrapping Radix UI primitives.
  - Feature components: `MascotWidget.tsx`, `CareerPath.tsx`, `StreakRing.tsx`, etc.
- `/routes/`: Defines the application's page structure using TanStack Router.
  - `__root.tsx`: The root layout.
  - `_authenticated/`: Protected routes requiring user login and approval (e.g., `dashboard.tsx`, `admin.tsx`, `leaderboard.tsx`, `me.tsx`, `profile.$userId.tsx`).
- `/lib/`: Utility functions, helper modules, and business logic.
  - `careerScore.ts`, `careerTopics.ts`: Logic for career-based gamification.
  - `mascotAudio.ts`, `mascotPhysics.ts`, `mascotMessages.ts`: Core logic for the interactive mascot.
  - `notifications.ts`: Real-time notification helpers.
- `/hooks/`: Custom React hooks for shared state or side-effects.

## Routing Flow
1. **Public/Unauthenticated:** Users visit the root and can sign in via Google OAuth.
2. **Pending State:** If a user is signed in but `is_approved` is false, they are redirected to `pending.tsx`.
3. **Authenticated & Approved:** Users gain access to the `_authenticated` layout, unlocking `dashboard.tsx`, `leaderboard.tsx`, and their profile (`me.tsx`).
4. **Admin Role:** If the authenticated user is the designated admin, they can access `admin.tsx` to approve/reject pending users.
