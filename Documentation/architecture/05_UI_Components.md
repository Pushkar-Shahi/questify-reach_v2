# Core UI Components

The `src/components` directory houses the interactive and visual elements of the application. The project relies heavily on modular, reusable components.

## Feature Components
- **`MascotWidget.tsx`**: A sophisticated, interactive visual mascot that floats on the screen. It utilizes physics (`lib/mascotPhysics.ts`), audio (`lib/mascotAudio.ts`), and dynamic messaging (`lib/mascotMessages.ts`) to engage the user.
- **`StreakRing.tsx`**: A circular progress or ring indicator visualizing the user's current activity streak. Often utilizes SVG and animation for a rewarding visual pop.
- **`CareerPath.tsx` & `CareerMeter.tsx`**: Visualizations for user progression over a longer timeline or specific skill topics.
- **`CareerTopics.tsx`**: Likely a grid or list interface allowing users to explore or select various focus areas or goals.
- **`ActivityList.tsx`**: Displays a chronological feed of a user's `Activity_History`, showing points earned and descriptions of tasks completed.
- **`AdminNotifications.tsx`**: Used within the admin panel or global header to alert the admin (`shahi.pushkar2008@gmail.com`) of new users pending approval.
- **`NotificationBell.tsx`**: A standard bell icon component that may show a badge when new platform notifications (or streak reminders) are available.
- **`UserAvatar.tsx`**: A consistent wrapper for displaying the user's Google profile picture, falling back to initials if necessary. Uses Radix UI Avatar.
- **`ThemeToggle.tsx`**: Handles switching the application between light and dark modes.
- **`AuraFlame.tsx`**: A purely decorative, animated component to add visual flair (likely related to high streaks or top leaderboard positions).
- **`InstallPrompt.tsx`**: A component prompting users to install the application as a PWA (Progressive Web App) on their devices.

## The `/ui` Directory
The `src/components/ui` folder contains generic, atomic design system components generated mostly via `shadcn/ui` (which wraps Radix UI primitives and Tailwind CSS). These include:
- Buttons, Inputs, Dialogs, Select menus.
- Accodions, Hover Cards, Tabs, and Tooltips.
These elements ensure a cohesive, accessible, and highly polished aesthetic across the entire platform.
