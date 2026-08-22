# UI Architecture, Themes & macOS Animations

This document details the visual design system, navigation bar structure, macOS transition animations, and color palette tokens across all 4 themes.

---

## 1. Centered Floating Navigation Island

The desktop header in [`src/routes/_authenticated/route.tsx`](../questify-reach/src/routes/_authenticated/route.tsx) uses a single unified centered floating island:

```
[ ⚡ S Streak  |  🏠 Home   🏆 Leaderboard   👤 Me   🛡️ Admin  |  🔔  👤  ✨  🚪 ]
```

### Key Elements:
- **Streak Logo**: Anchored with gradient avatar icon and brand typography.
- **Divider**: Subtle `h-6 w-px bg-border/80` vertical separators.
- **Navigation Tabs**: Comfortable `min-w-[120px] sm:min-w-[150px]` with generous padding and spring-pill active states.
- **Action Cluster**: Notification Bell, User Avatar, Theme Selector, and Logout button sharing unified `size-9 sm:size-10` button dimensions.
- **No Dropdown Clipping**: Container avoids `overflow-x-auto` to allow full z-index dropdown menus for notifications and theme selection.

---

## 2. macOS-Style Spring Transitions

Implemented in [`src/styles.css`](../questify-reach/src/styles.css):

```css
@keyframes macos-tab-enter {
  0% {
    opacity: 0;
    transform: scale(0.988) translateY(6px);
    filter: blur(3px);
  }
  60% {
    opacity: 0.95;
    filter: blur(0px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0px);
  }
}

.animate-macos-tab {
  animation: macos-tab-enter 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity, filter;
}
```

The route's `<Outlet />` is wrapped with a dynamic key (`key={loc.pathname}`) to trigger this spring curve on every tab change.

---

## 3. Theme Specifications

### ☀️ Light Theme (`:root`)
- **Background**: `oklch(0.975 0.008 65)` (soft warm alabaster)
- **Foreground**: `oklch(0.16 0.02 55)` (deep charcoal black)
- **Primary Accent**: `oklch(0.64 0.2 42)` (radiant amber orange)
- **Card Surfaces**: `oklch(0.995 0.003 65)` (clean crisp white)

### 🌙 Dark Theme (`.dark`)
- **Background**: `oklch(0.15 0.015 60)` (deep warm obsidian slate `#181615`)
- **Foreground**: `oklch(0.96 0.01 60)` (soft warm white)
- **Primary Accent**: `oklch(0.78 0.17 65)` (luminous electric amber)
- **Card Surfaces**: `oklch(0.19 0.015 60)` (elevated dark surface)

### ✨ Lavender Theme (`.lavender`)
- **Background**: `oklch(0.15 0.03 285)` (deep ethereal midnight plum)
- **Foreground**: `oklch(0.96 0.015 295)` (soft amethyst glow)
- **Primary Accent**: `oklch(0.8 0.14 295)` (radiant pastel orchid amethyst)
- **Card Surfaces**: `oklch(0.20 0.035 285)` (elevated plum violet)

### 🖤 AMOLED Theme (`.amoled`)
- **Background**: `oklch(0 0 0)` / `#000000` (true pitch OLED black)
- **Foreground**: `oklch(1 0 0)` / `#ffffff` (pure monochrome white)
- **Primary Accent**: `oklch(1 0 0)` (monochrome white accent)
- **Card Surfaces**: `oklch(0.04 0 0)` (pitch black elevated panel with crisp `oklch(0.2 0 0)` borders)
