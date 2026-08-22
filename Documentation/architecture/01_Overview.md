# Goal Spark - Project Overview

## Introduction
Goal Spark is an interactive accountability and goal-tracking platform designed to keep users motivated through gamification, streak rewards, and a real-time points leaderboard. The core philosophy is to create a sense of progression through tangible points tied to real-world achievements (like daily targets and CGPA) while providing an engaging user experience.

## Core Mission
To provide users with a dynamic, gamified environment where accountability is incentivized through points, streaks, and community leaderboards. 

## High-Level Architecture
- **Frontend Framework:** React 19 / TanStack Start (Vite)
- **Styling:** Tailwind CSS + Radix UI components (for accessible, unstyled primitives)
- **State Management & Routing:** TanStack Query + TanStack Router
- **Backend/BaaS:** Supabase (for Auth, PostgreSQL Database, and Realtime subscriptions)
- **Authentication:** Google OAuth via Supabase + Admin Whitelisting System

## Key Differentiators
1. **Honesty-Based Tracking:** No rigorous proof required; built on a high-trust model where users self-report completions.
2. **Dynamic Gamification:** Uses points engines (CGPA multipliers, daily targets) and visual streak representations to reward consistency.
3. **Mascot Integration:** An interactive mascot (configured in `MascotWidget`) that responds to user actions, providing a lively UX.
4. **Admin Gatekeeping:** A robust approval workflow for new sign-ups, ensuring the platform remains exclusive to approved individuals.
