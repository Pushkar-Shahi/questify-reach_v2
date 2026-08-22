
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change approval status';
  END IF;
  IF NEW.semesters_unlocked IS DISTINCT FROM OLD.semesters_unlocked
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change semester access';
  END IF;
  IF NEW.total_points IS DISTINCT FROM OLD.total_points
     AND coalesce(current_setting('app.scoring', true), '') <> 'on'
     AND NOT public.has_role(auth.uid(), 'admin')
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot directly modify points';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_target(_target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_target public.daily_targets%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_bonus integer := 0;
  v_new_streak integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM set_config('app.scoring', 'on', true);

  SELECT * INTO v_target FROM public.daily_targets WHERE id = _target_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target not found'; END IF;
  IF v_target.is_done THEN RETURN; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT v_profile.is_approved THEN RAISE EXCEPTION 'Account not approved'; END IF;

  UPDATE public.daily_targets SET is_done = true, completed_at = now() WHERE id = _target_id;

  IF v_profile.last_active_date IS DISTINCT FROM v_today THEN
    IF v_profile.last_active_date = (v_today - 1) THEN
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

CREATE OR REPLACE FUNCTION public.upsert_cgpa(_semester integer, _cgpa numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing public.semester_cgpa%ROWTYPE;
  v_new_points integer := ROUND(_cgpa * 10);
  v_delta integer;
  v_profile public.profiles%ROWTYPE;
  v_prev_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM set_config('app.scoring', 'on', true);
  IF _semester < 1 OR _semester > 8 THEN RAISE EXCEPTION 'Semester must be 1-8'; END IF;
  IF _cgpa < 0 OR _cgpa > 10 THEN RAISE EXCEPTION 'CGPA must be 0-10'; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT v_profile.is_approved THEN RAISE EXCEPTION 'Account not approved'; END IF;

  IF _semester > v_profile.semesters_unlocked THEN
    RAISE EXCEPTION 'Semester % is locked. Ask an admin to unlock it.', _semester;
  END IF;

  SELECT count(*) INTO v_prev_count FROM public.semester_cgpa
    WHERE user_id = v_uid AND semester_number < _semester;
  IF v_prev_count < _semester - 1 THEN
    RAISE EXCEPTION 'Fill in the earlier semesters first';
  END IF;

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
