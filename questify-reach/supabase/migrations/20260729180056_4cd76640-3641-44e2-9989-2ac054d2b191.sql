
-- Roles enum & user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles select own or admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  is_approved boolean NOT NULL DEFAULT false,
  total_points integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles select authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles update own (name/avatar)" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles admin update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles admin delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Prevent non-admins from flipping is_approved on their own row
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change approval status';
  END IF;
  IF NEW.total_points IS DISTINCT FROM OLD.total_points
     AND NOT public.has_role(auth.uid(), 'admin')
     AND current_setting('request.jwt.claims', true) IS NOT NULL THEN
    -- allow SECURITY DEFINER internal updates (which run without user JWT diff intent) via bypass below
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot directly modify points';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_protect BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- Signup trigger: create profile + auto-admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin boolean := (NEW.email = 'shahi.pushkar2008@gmail.com');
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    v_is_admin
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Semester CGPA
CREATE TABLE public.semester_cgpa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester_number smallint NOT NULL,
  cgpa_value numeric(4,2) NOT NULL,
  points_earned integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, semester_number),
  CHECK (semester_number BETWEEN 1 AND 8),
  CHECK (cgpa_value >= 0 AND cgpa_value <= 10)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semester_cgpa TO authenticated;
GRANT ALL ON public.semester_cgpa TO service_role;
ALTER TABLE public.semester_cgpa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cgpa select all" ON public.semester_cgpa FOR SELECT TO authenticated USING (true);
CREATE POLICY "cgpa modify own" ON public.semester_cgpa FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Daily targets
CREATE TABLE public.daily_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  is_done boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_targets TO authenticated;
GRANT ALL ON public.daily_targets TO service_role;
ALTER TABLE public.daily_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "targets select all" ON public.daily_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "targets modify own" ON public.daily_targets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Activity history
CREATE TABLE public.activity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_history TO authenticated;
GRANT ALL ON public.activity_history TO service_role;
ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity select all" ON public.activity_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity insert own" ON public.activity_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RPC: complete_target
CREATE OR REPLACE FUNCTION public.complete_target(_target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_target public.daily_targets%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_bonus integer := 0;
  v_new_streak integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_target FROM public.daily_targets WHERE id = _target_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target not found'; END IF;
  IF v_target.is_done THEN RETURN; END IF;

  UPDATE public.daily_targets SET is_done = true, completed_at = now() WHERE id = _target_id;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT v_profile.is_approved THEN RAISE EXCEPTION 'Account not approved'; END IF;

  -- Streak update: only on first completed target of the day
  IF v_profile.last_active_date IS DISTINCT FROM v_today THEN
    IF v_profile.last_active_date = v_today - INTERVAL '1 day' THEN
      v_new_streak := v_profile.current_streak + 1;
    ELSE
      v_new_streak := 1;
    END IF;
    v_bonus := LEAST(v_new_streak, 10);
    UPDATE public.profiles
      SET current_streak = v_new_streak,
          last_active_date = v_today,
          total_points = total_points + 5 + v_bonus
      WHERE id = v_uid;
    INSERT INTO public.activity_history(user_id, activity_type, description, points_awarded)
      VALUES (v_uid, 'STREAK_BONUS', 'Day ' || v_new_streak || ' streak bonus', v_bonus);
  ELSE
    UPDATE public.profiles SET total_points = total_points + 5 WHERE id = v_uid;
  END IF;

  INSERT INTO public.activity_history(user_id, activity_type, description, points_awarded)
    VALUES (v_uid, 'TARGET_COMPLETED', 'Completed: ' || v_target.title, 5);
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_target(uuid) TO authenticated;

-- RPC: upsert_cgpa
CREATE OR REPLACE FUNCTION public.upsert_cgpa(_semester smallint, _cgpa numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing public.semester_cgpa%ROWTYPE;
  v_new_points integer := ROUND(_cgpa * 10);
  v_delta integer;
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _semester < 1 OR _semester > 8 THEN RAISE EXCEPTION 'Semester must be 1-8'; END IF;
  IF _cgpa < 0 OR _cgpa > 10 THEN RAISE EXCEPTION 'CGPA must be 0-10'; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT v_profile.is_approved THEN RAISE EXCEPTION 'Account not approved'; END IF;

  SELECT * INTO v_existing FROM public.semester_cgpa WHERE user_id = v_uid AND semester_number = _semester FOR UPDATE;
  IF FOUND THEN
    v_delta := v_new_points - v_existing.points_earned;
    UPDATE public.semester_cgpa
      SET cgpa_value = _cgpa, points_earned = v_new_points, updated_at = now()
      WHERE id = v_existing.id;
  ELSE
    v_delta := v_new_points;
    INSERT INTO public.semester_cgpa(user_id, semester_number, cgpa_value, points_earned)
      VALUES (v_uid, _semester, _cgpa, v_new_points);
  END IF;

  UPDATE public.profiles SET total_points = total_points + v_delta WHERE id = v_uid;

  INSERT INTO public.activity_history(user_id, activity_type, description, points_awarded)
    VALUES (v_uid, 'CGPA_UPDATED', 'Semester ' || _semester || ' set to ' || _cgpa::text, v_delta);
END;
$$;
GRANT EXECUTE ON FUNCTION public.upsert_cgpa(smallint, numeric) TO authenticated;

-- Admin RPC: set approval
CREATE OR REPLACE FUNCTION public.admin_set_approval(_user_id uuid, _approved boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles SET is_approved = _approved WHERE id = _user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_approval(uuid, boolean) TO authenticated;

-- Admin RPC: delete user profile (also cascades to auth via caller flow if needed)
CREATE OR REPLACE FUNCTION public.admin_delete_profile(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.profiles WHERE id = _user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_profile(uuid) TO authenticated;
