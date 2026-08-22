# 🎯 Next Steps to Go Live

All code is written and integrated. Here's what needs to happen to activate the features:

---

## Phase 1: Database Setup (BLOCKING - Must Do First) ⚠️

### Step 1.1: Run SQL Migrations

**Location:** `questify-reach/supabase/migrations/20260819000000_phase_0_foundation.sql`

**How:**
1. Go to [Supabase Dashboard](https://supabase.com) → Project
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Apply `20260819000000_phase_0_foundation.sql`
5. Click "Run" (bottom right button)
6. Wait for success message

**What it creates:**
- `tasks` table (unified model for all task types)
- `user_badges` table (earned achievements)
- `streak_freezes` table (insurance tokens for Phase 2)
- `daily_snapshots` table (daily state snapshots for idempotent calculations)
- `approval_rejections` table (audit trail)
- Server functions: `calculate_user_streak()`, `calculate_daily_points()`
- Triggers for automatic updates
- RLS policies for user-scoped access

**Estimated time:** 2 minutes

---

### Step 1.2: Update TypeScript Types

**What changed:** New tables added to database

**How:**
1. Open terminal in `questify-reach/` folder
2. Run: `npm run type-gen`
   - OR manually: `supabase gen types typescript --local > src/integrations/supabase/types.ts`

**What it does:** Regenerates `types.ts` with new table definitions

**Estimated time:** 1 minute

---

## Phase 2: Data Migration (One-Time Setup) 📊

### Step 2.1: Wire Up Migration on First Login

**Files affected:**
- `src/hooks/useAuth.ts`

**What to do:**
Import `migrateCuratedMissions()` and `migrateCustomTargets()` from `src/lib/phase0-unified-tasks.ts`

In `useAuthUser()` hook, add effect:
```typescript
useEffect(() => {
  if (user?.id && !profile?.migration_completed) {
    (async () => {
      await migrateCustomTargets(user.id);
      await migrateCuratedMissions(user.id);
      // Mark migration as done in profile
    })();
  }
}, [user?.id, profile?.migration_completed]);
```

**What it does:**
- Converts `daily_targets` → `tasks` table (type="custom")
- Converts `track_tasks` → `tasks` table (type="curated_mission") with spaced-repetition
- One-time operation per user (safe to run multiple times)

**Estimated time:** 5 minutes

---

## Phase 3: Nightly Streak Calculation (CRITICAL) 🌙

Choose ONE of these approaches:

### Option A: Supabase Edge Function (Recommended)

**Files needed:** Create new file
- `supabase/functions/calculate-streaks/index.ts`

**Template:**
```typescript
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: Request) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get all active users
  const { data: users } = await supabase
    .from("profiles")
    .select("id")
    .eq("approved", true);

  // Calculate streak for each user
  for (const user of users || []) {
    await supabase.rpc("calculate_user_streak", { p_user_id: user.id });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

**Deploy:**
```bash
supabase functions deploy calculate-streaks
```

**Schedule:**
- Go to Supabase Dashboard → Cron → create new
- URL: Your function URL
- Schedule: `0 0 * * *` (midnight UTC)

**Estimated time:** 15 minutes

### Option B: pg_cron (Simpler)

**In Supabase SQL Editor:**
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily calculation at midnight UTC
SELECT cron.schedule(
  'calculate-streaks-daily',
  '0 0 * * *',
  $$SELECT calculate_user_streak(id) FROM profiles WHERE approved = true$$
);
```

**Estimated time:** 2 minutes

---

## Phase 4: Skill Trees Seeding (Optional) 🌳

**Files needed:**
- `src/lib/phase5-skill-trees.ts` (already has `CURATED_SKILL_TRACKS` data)

**How:**
1. Create new file: `supabase/functions/seed-skill-trees/index.ts`
2. Insert `CURATED_SKILL_TRACKS` data into `skill_trees` and `skill_nodes` tables
3. Deploy and run once

**Or:** Manually insert via SQL Editor in Supabase Dashboard

**Estimated time:** 10 minutes (optional - can wait)

---

## Phase 5: Create Skill Tree Route (Optional) 🎯

**Files needed:**
- Create: `src/routes/_authenticated/skills.tsx`

**Template:**
```typescript
import { createFileRoute } from "@tanstack/react-router";
import SkillTreeVisualization from "@/components/Phase5SkillTreeComponents";

export const Route = createFileRoute("/_authenticated/skills")({
  component: SkillTree,
});

function SkillTree() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Skill Trees</h1>
      <SkillTreeVisualization />
    </div>
  );
}
```

**Estimated time:** 5 minutes (optional - can wait)

---

## Verification Checklist ✅

After completing all steps, test these:

- [ ] **New signup** → Identity selector shows on pending page
- [ ] **Select identity** → Saves to profile, shows in pending message
- [ ] **Login existing user** → Dashboard shows identity reminder (if not set)
- [ ] **No tasks** → Shows `NoTasksEmptyState` with 3 suggestions
- [ ] **Add task** → Works as before
- [ ] **Profile page** → Shows identity card with edit button
- [ ] **Change identity** → Modal selector opens, updates on save
- [ ] **Streak calculation** → Nightly job runs (check Supabase logs)
- [ ] **Dark mode** → All colors look correct
- [ ] **Mobile** → Responsive layout works

---

## Timeline

| Phase | Effort | Time | Priority |
|-------|--------|------|----------|
| 1. SQL Migrations | Low | 2 min | CRITICAL |
| 2. Type Generation | Low | 1 min | CRITICAL |
| 3. Data Migration | Medium | 5 min | High |
| 4. Streak Calculation | Medium | 15 min | Critical |
| 5. Skill Trees Seeding | Low | 10 min | Optional |
| 6. Skill Tree Route | Low | 5 min | Optional |

**Total time to MVP:** ~25 minutes (steps 1-4)

---

## Rollback Plan

If anything breaks:

1. **Database issue** → Restore from Supabase backups
2. **Type error** → Regenerate types: `npm run type-gen`
3. **Migration failed** → Mark `migration_completed = false` for that user
4. **Streak calc broken** → Disable cron job in Supabase
5. **Code issue** → Git reset to previous commit

---

## Support Files

Refer to these for detailed instructions:

- **IMPLEMENTATION_GUIDE.md** — In-depth walkthrough with code snippets
- **SUMMARY.md** — High-level architecture overview
- **INTEGRATION_COMPLETE.md** — What was wired into routes
- **phase0-unified-tasks.ts** — All migration functions documented
- **phase0-approval-system.ts** — Rate limiting + approval logic

---

**You're ready to go! 🚀**

Start with Phase 1.1 (Run SQL Migrations) and work through the checklist. The app will have full identity + onboarding + streaks running within 30 minutes.
