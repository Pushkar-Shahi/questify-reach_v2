# Performance & Backend Optimizations

This document details all performance tuning, query caching strategies, and server security configurations.

---

## 1. Client-Side Query Caching & Stale Time

Configured in [`src/router.tsx`](../questify-reach/src/router.tsx) and query hooks:
- **Global QueryClient Defaults**:
  - `staleTime: 1000 * 30` (30 seconds) — prevents redundant refetches when switching between tabs.
  - `gcTime: 1000 * 60 * 15` (15 minutes garbage collection) — caches inactive data in memory.
  - `refetchOnWindowFocus: false` — eliminates stutter when alternating focus between browser tabs.
- **Route Preloading**:
  - TanStack Router preloads linked routes on hover and intent (`defaultPreload: "intent"`).
- **User & Admin Permissions Caching**:
  - [`src/hooks/useAuth.ts`](../questify-reach/src/hooks/useAuth.ts): User profile cached for 2 minutes; admin role verification cached for 5 minutes.
- **Career Tracks & Tasks Caching**:
  - [`src/lib/career.ts`](../questify-reach/src/lib/career.ts): Career tracks, requirements, and submissions cached with `staleTime: 60s` to `120s`.

---

## 2. Server Headers & Security

Configured in [`src/server.ts`](../questify-reach/src/server.ts) on Nitro / SSR handler:
- **Security Headers**:
  - `X-Content-Type-Options: nosniff` — prevents MIME-sniffing attacks.
  - `X-Frame-Options: SAMEORIGIN` — protects against clickjacking.
  - `Referrer-Policy: strict-origin-when-cross-origin` — enforces privacy on outbound requests.
- **Static Asset Cache Control**:
  - Implements caching policy for static builds (`public, max-age=31536000, immutable` for versioned chunks, `no-cache` for HTML documents).

---

## 3. Build & Runtime Performance

- **Zero-Warning Production Bundler**: Built using Vite 8 + TanStack Start + Cloudflare Nitro preset.
- **PWA Service Worker**: Pre-caches runtime chunks and offline manifest via Workbox.
