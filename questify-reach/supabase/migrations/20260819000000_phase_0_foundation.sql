-- ============================================================================
-- STREAK v2 PHASE 0 - Foundation Migrations
-- ============================================================================
-- Creates unified task model, server-side calculations, and approval system

-- 1. Create unified tasks table (replaces daily_targets + merges track_tasks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Task identification and metadata
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('custom', 'curated_mission', 'recurring', 'spaced_review')),
  category TEXT, -- e.g., "Core Fundamentals", "Domain Skills", "General"
  
  -- Scheduling and timing (timezone-aware)
  target_date DATE,
  due_time TIME,
  timezone TEXT DEFAULT 'UTC',
  
  -- Recurrence (for recurring tasks)
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'biweekly', 'monthly', null for one-time
  recurrence_end_date DATE,
  
  -- Spaced repetition (for curated_mission and spaced_review)
  original_task_id UUID REFERENCES tasks(id), -- Link to first occurrence
  review_interval_days INT, -- Days until next review (e.g., 7, 14, 30)
  last_reviewed_at TIMESTAMP,
  next_review_date DATE, -- Computed, when task should resurface
  difficulty_estimate SMALLINT, -- 1-5 for difficulty prediction
  
  -- Progress tracking
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  points_awarded INT DEFAULT 5,
  
  -- Metadata
  is_archived BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, target_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_next_review ON tasks(next_review_date) WHERE type = 'spaced_review';

-- 2. Create identity field on profiles (for Phase 1)
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  career_identity TEXT; -- "Backend Engineer", "MLOps Engineer", "Data Analyst", etc.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_identity_emoji TEXT; -- Visual marker for identity

-- 3. Create user badges table (for behavior-based titles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- 'consistent', 'comeback_kid', 'deep_worker', etc.
  title TEXT NOT NULL, -- Display name
  description TEXT,
  earned_at TIMESTAMP DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB, -- Dynamic badge data (e.g., streak count for "Consistent")
  UNIQUE(user_id, badge_type, earned_at)
);

-- 4. Create streak freeze tokens table (for Phase 2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS streak_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  earned_at TIMESTAMP DEFAULT now(),
  used_at TIMESTAMP,
  expires_at TIMESTAMP, -- If not used within 90 days, expires
  
  reason TEXT, -- 'earned', 'gifted'
  gifted_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  is_used BOOLEAN DEFAULT FALSE,
  UNIQUE(id)
);

-- 5. Update approval system (for Phase 0.4)
-- ============================================================================
-- Add columns to profiles for auto-approval and reporting
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  approval_requested_at TIMESTAMP;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  approval_approved_at TIMESTAMP;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  approval_approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  approval_rejection_reason TEXT;

-- Create rejection reasons history table
CREATE TABLE IF NOT EXISTS approval_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  flagged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejected_at TIMESTAMP DEFAULT now(),
  metadata JSONB -- Evidence or additional details
);

-- 6. Create user activity snapshots for server-side calculations
-- ============================================================================
-- Idempotent calculation: one daily snapshot per user per day
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  
  -- Snapshot state
  tasks_completed INT DEFAULT 0,
  points_earned INT DEFAULT 0,
  streak_maintained BOOLEAN DEFAULT FALSE, -- Did they do work today?
  
  -- Calculation metadata
  calculated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user ON daily_snapshots(user_id, snapshot_date);

-- 7. Server-side streak calculation function (idempotent, timezone-aware)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID, p_timezone TEXT DEFAULT 'UTC')
RETURNS INT AS $$
DECLARE
  v_current_streak INT := 0;
  v_last_work_date DATE;
  v_today DATE;
BEGIN
  -- Convert today to user's timezone
  v_today := (NOW() AT TIME ZONE p_timezone)::DATE;
  
  -- Get the user's current streak value
  SELECT current_streak INTO v_current_streak FROM profiles WHERE id = p_user_id;
  
  -- Get the most recent day with completed tasks
  SELECT MAX((completed_at AT TIME ZONE p_timezone)::DATE) INTO v_last_work_date
  FROM tasks
  WHERE user_id = p_user_id AND is_completed = TRUE;
  
  -- If no work ever done, streak is 0
  IF v_last_work_date IS NULL THEN
    RETURN 0;
  END IF;
  
  -- If last work was today, streak is maintained (don't reset)
  IF v_last_work_date = v_today THEN
    RETURN v_current_streak;
  END IF;
  
  -- If last work was yesterday, streak continues
  IF v_last_work_date = v_today - INTERVAL '1 day' THEN
    RETURN v_current_streak;
  END IF;
  
  -- Otherwise, streak is broken
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Function to calculate daily points (server-side, idempotent)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_daily_points(p_user_id UUID, p_date DATE)
RETURNS INT AS $$
DECLARE
  v_points INT := 0;
BEGIN
  -- Sum points from all tasks completed on this date
  SELECT COALESCE(SUM(points_awarded), 0) INTO v_points
  FROM tasks
  WHERE user_id = p_user_id 
    AND is_completed = TRUE
    AND DATE(completed_at) = p_date;
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Trigger to maintain last_active_date (for streak calculation)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_last_active_date()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET last_active_date = NOW() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_update_last_active ON tasks;
CREATE TRIGGER tasks_update_last_active
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_last_active_date();

-- 10. Trigger to compute next_review_date for spaced_review tasks
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_next_review_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'spaced_review' AND NEW.review_interval_days IS NOT NULL THEN
    IF NEW.is_completed THEN
      -- When completed, schedule next review
      NEW.last_reviewed_at := NOW();
      NEW.next_review_date := (NOW()::DATE + (NEW.review_interval_days || ' days')::INTERVAL);
    ELSE
      -- If not yet completed, review_date stays the same
      NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_compute_review_date ON tasks;
CREATE TRIGGER tasks_compute_review_date
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION compute_next_review_date();

-- 11. Row-level security policies for tasks
-- ============================================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own tasks
DROP POLICY IF EXISTS tasks_select_own ON tasks;
CREATE POLICY tasks_select_own ON tasks FOR SELECT
  USING (auth.uid()::TEXT = user_id::TEXT);

DROP POLICY IF EXISTS tasks_insert_own ON tasks;
CREATE POLICY tasks_insert_own ON tasks FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

DROP POLICY IF EXISTS tasks_update_own ON tasks;
CREATE POLICY tasks_update_own ON tasks FOR UPDATE
  USING (auth.uid()::TEXT = user_id::TEXT)
  WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

DROP POLICY IF EXISTS tasks_delete_own ON tasks;
CREATE POLICY tasks_delete_own ON tasks FOR DELETE
  USING (auth.uid()::TEXT = user_id::TEXT);

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================
-- 1. Migrate existing daily_targets to tasks table (type='custom')
-- 2. Migrate existing track_tasks to tasks table (type='curated_mission')
-- 3. Update calculate_user_streak() to be called nightly via pg_cron or Edge Function
-- 4. Use daily_snapshots table for idempotent streak calculations
-- 5. All timestamps are in UTC; timezone handling is in application layer
