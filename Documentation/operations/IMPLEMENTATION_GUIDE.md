# Streak v2 Upgrade Implementation Guide

**Status:** Phase 0-5 Files Created | Ready for Integration  
**Last Updated:** 2026-08-19

---

## Overview

This guide walks through implementing the **Streak v2 Upgrade Roadmap** for the Questify-Reach platform. The implementation is split into 5 phases, with all code files created and ready for integration.

### Key Files Created

| Phase | Files | Purpose |
|-------|-------|---------|
| **Phase 0** | `questify-reach/supabase/migrations/20260819000000_phase_0_foundation.sql` | Unified tasks table, badge system, auto-approval |
| | `phase0-unified-tasks.ts` | TypeScript types, migrations, server-side calculations |
| | `phase0-approval-system.ts` | Auto-approval, rate limiting, flag/report system |
| **Phase 1** | `phase1-identity.ts` | Career identity, behavior-based badges |
| | `Phase1IdentityComponents.tsx` | UI: Identity selector, chain graphic, badges |
| **Phase 5** | `phase5-skill-trees.ts` | Curated skill tracks, prerequisites, progress tracking |
| | `Phase5SkillTreeComponents.tsx` | UI: Skill tree visualization, skill nodes |

---

## Phase 0: Foundation Fixes (Start Here)

### What It Does
Unifies the fragmented task data model so all later phases build on one system.

### 1. Run SQL Migrations

```bash
# In Supabase dashboard or via CLI:
supabase migration new phase-0-foundation
# The migration is already in questify-reach/supabase/migrations/
supabase migration up
```

**Key Changes:**
- Creates `tasks` table with `type` field: `custom | curated_mission | recurring | spaced_review`
- Adds `user_badges` table for behavior-based titles
- Adds `streak_freezes` table for Phase 2 insurance tokens
- Updates `profiles` with `career_identity`, `approval_status` fields
- Creates `daily_snapshots` table for idempotent streak calculation
- Adds triggers and functions for server-side calculations

### 2. Create Supabase Types

```bash
# Regenerate Supabase types to include new tables
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### 3. Add Server-Side Functions

Copy `phase0-unified-tasks.ts` to `src/lib/`:
```bash
cp phase0-unified-tasks.ts questify-reach/src/lib/
```

**Export in hooks:**
```typescript
// In src/hooks/useAuth.ts or new src/hooks/useServerTasks.ts
export { 
  updateUserStreak, 
  calculateUserTotalPoints,
  awardBadge 
} from "@/lib/phase0-unified-tasks";
```

### 4. Add Approval System

Copy `phase0-approval-system.ts` to `src/lib/`:
```bash
cp phase0-approval-system.ts questify-reach/src/lib/
```

**Create new admin endpoints** (if using API routes):
```typescript
// src/server.ts or routes/admin.tsx
import { 
  getPendingApprovals, 
  approveUser, 
  rejectUser 
} from "@/lib/phase0-approval-system";
```

### 5. Migrate Existing Data

Create migration script:
```typescript
// src/lib/migration-runner.ts
import { migrateCustomTargets, migrateCuratedMissions } from "@/lib/phase0-unified-tasks";

export async function runPhase0Migration(userId: string) {
  const custom = await migrateCustomTargets(userId);
  const missions = await migrateCuratedMissions(userId);
  return { custom, missions };
}
```

**Run on login:**
```typescript
// src/hooks/useAuth.ts
const { user } = useAuthUser();
useEffect(() => {
  if (user?.id) {
    runPhase0Migration(user.id).catch(console.error);
  }
}, [user?.id]);
```

### 6. Set Up Nightly Streak Calculation

**Option A: Supabase Edge Functions**
```typescript
// supabase/functions/calculate-streaks/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"));
  
  // Fetch all users
  const { data: users } = await supabase.from("profiles").select("id");
  
  // Calculate streak for each
  for (const user of users || []) {
    await supabase.rpc("calculate_user_streak", { p_user_id: user.id });
  }
  
  return new Response("OK");
});
```

**Option B: Use Supabase's pg_cron extension**
```sql
-- In Supabase dashboard SQL editor
SELECT cron.schedule('calculate-streaks', '0 0 * * *', $$
  SELECT calculate_user_streak(id) FROM profiles;
$$);
```

---

## Phase 1: Identity Layer (High-Impact)

### What It Does
Frames productivity as **who you are**, not just what you did. Highest leverage, lowest cost.

### 1. Add UI Components

Copy components to `src/components/`:
```bash
cp Phase1IdentityComponents.tsx questify-reach/src/components/
```

### 2. Update Signup Flow

**In signup route** (e.g., `src/routes/_authenticated/me.tsx` or `src/routes/onboarding.tsx`):

```typescript
import { CareerIdentitySelector } from "@/components/Phase1IdentityComponents";
import { useUpdateIdentity } from "@/lib/phase1-identity";

export function SignupIdentity() {
  const updateIdentity = useUpdateIdentity(user?.id);
  
  return (
    <CareerIdentitySelector 
      onSelect={(identity) => updateIdentity.mutate(identity)}
      mode="signup"
    />
  );
}
```

### 3. Add Badge Calculation

**Run after task completion:**
```typescript
// In useDailyTargets.ts or wherever tasks are completed
import { updateUserBadges } from "@/lib/phase1-identity";

const toggleTarget = async (id: string) => {
  // ... existing toggle logic
  await updateUserBadges(user?.id);
};
```

### 4. Display Identity in UI

Update header/profile sections:
```typescript
import { IdentityCard, StreakChain, UserBadgeDisplay } from "@/components/Phase1IdentityComponents";
import { useUserIdentity } from "@/lib/phase1-identity";

export function UserProfile() {
  const { data: identity } = useUserIdentity(user?.id);
  
  return (
    <div>
      <IdentityCard 
        name={identity?.career_identity || "User"}
        emoji={identity?.preferred_identity_emoji || "🌟"}
        badges={identity?.badges}
      />
      <StreakChain streakDays={profile?.current_streak || 0} />
    </div>
  );
}
```

### 5. At-Risk Notification (Optional)

Add to dashboard:
```typescript
import { StreakAtRiskNotification } from "@/components/Phase1IdentityComponents";

export function Dashboard() {
  const hoursUntilBreak = calculateHoursUntilStreakBreak(profile?.last_active_date);
  
  return (
    <div>
      {hoursUntilBreak < 3 && (
        <StreakAtRiskNotification 
          streakDays={profile?.current_streak || 0}
          hoursUntilBreak={hoursUntilBreak}
          onTaskClick={() => { /* open task input */ }}
        />
      )}
    </div>
  );
}
```

---

## Phase 5: Skill Trees (The Moat)

### What It Does
Provides curated, career-path-specific skill trees—the core differentiator. Start building early.

### 1. Create Database Tables

Add to SQL migrations:
```sql
CREATE TABLE skill_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  emoji TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE skill_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES skill_trees(id),
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  category TEXT,
  prerequisite_ids TEXT[], -- JSON array of skill IDs
  estimated_days INT,
  resources JSONB, -- Array of {title, url, type}
  sort_order INT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE user_skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skill_nodes(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  progress_percent INT DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, skill_id)
);
```

### 2. Seed Curated Tracks

Create seed script:
```typescript
// src/lib/seed-skill-trees.ts
import { CURATED_SKILL_TRACKS } from "@/lib/phase5-skill-trees";

export async function seedSkillTrees() {
  for (const [trackTitle, trackData] of Object.entries(CURATED_SKILL_TRACKS)) {
    // Insert into database via Supabase
    // See phase5-skill-trees.ts for structure
  }
}
```

### 3. Add Components

Copy to `src/components/`:
```bash
cp Phase5SkillTreeComponents.tsx questify-reach/src/components/
```

### 4. Create Skill Tree Route

**New route:** `src/routes/_authenticated/skill-tree.tsx`

```typescript
import { SkillTreeVisualization, TrackSelector } from "@/components/Phase5SkillTreeComponents";
import { useState } from "react";

export function SkillTreePage() {
  const { user } = useAuthUser();
  const [selectedTrack, setSelectedTrack] = useState("Backend Engineer");
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Your Learning Path</h1>
      
      <TrackSelector 
        selectedTrack={selectedTrack}
        onSelectTrack={setSelectedTrack}
      />
      
      {selectedTrack && (
        <SkillTreeVisualization 
          userId={user?.id!}
          trackTitle={selectedTrack}
        />
      )}
    </div>
  );
}
```

### 5. Link from Dashboard

Add button to dashboard:
```typescript
<Link to="/skill-tree" className="...">
  📚 View Skill Tree
</Link>
```

---

## Phase 2 & 3: Social & Loss-Aversion (Future)

### Phase 2: Loss-Aversion Mechanics
- Earned freeze tokens (unlock at 7-day streak)
- Optional stakes mode
- At-risk nudge (3 hours warning)

### Phase 3: Social Mechanics
- Pods/duos (2-5 people, shared weekly targets)
- Gift freeze tokens
- Platform-wide community goals
- Career-track cohorts

*Implementation guide coming when you're ready.*

---

## Phase 4: Predictive Layer (Future)

- Pattern detection ("You usually skip Sundays")
- Trend line on Career Meter
- Weekly recap emails
- At-risk nudges (end-of-day)

---

## Integration Checklist

- [ ] Run Phase 0 SQL migrations
- [ ] Regenerate Supabase types
- [ ] Copy all TypeScript lib files to `src/lib/`
- [ ] Copy React components to `src/components/`
- [ ] Implement data migration script for existing tasks
- [ ] Set up nightly streak calculation (Edge Function or pg_cron)
- [ ] Update signup flow with identity selector
- [ ] Add badge calculation to task completion
- [ ] Update dashboard to show identity card + streak chain
- [ ] Create skill tree page and seed database
- [ ] Test end-to-end: signup → identity → tasks → badges → skill tree

---

## Important Notes

### Timezone Handling
- All task `due_time` and scheduling uses `timezone` field on `tasks` table
- Server-side functions use UTC; convert to user's timezone in frontend
- See `calculateUserStreak()` in `phase0-unified-tasks.ts` for example

### Idempotent Operations
- Streak calculation uses `daily_snapshots` table for idempotency
- Safe to run nightly without creating duplicates
- Points calculation sums from `tasks` directly

### Row-Level Security (RLS)
- All new tables have RLS policies enabled
- Users can only see/edit their own data
- Leaderboard queries need public read access (configure in Supabase)

### Performance Considerations
- Indices on `tasks(user_id, target_date)`, `tasks(next_review_date)` created
- Daily snapshots limit streak calculation to recent dates
- Consider pagination for skill tree if trees grow large

---

## Rollback Plan

If something breaks:

1. **SQL**: In Supabase dashboard, revert to previous migration
2. **Data**: Keep old `daily_targets` and `track_tasks` tables for fallback
3. **Code**: Feature flags can hide new UI behind a toggle

---

## Next Steps

1. **Execute Phase 0** → Foundation is critical
2. **Execute Phase 1** → High-impact, low-cost identity features
3. **Build Phase 5** → Core differentiator, long-term moat
4. **Execute Phase 2-4** → Retention mechanics once foundation is solid

For questions or customizations, reference the inline code comments in each file.
