ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semesters_unlocked smallint NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
     AND NOT public.has_role(auth.uid(), 'admin')
     AND current_setting('request.jwt.claims', true) IS NOT NULL THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot directly modify points';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_semesters_unlocked(_user_id uuid, _count smallint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _count < 1 OR _count > 8 THEN RAISE EXCEPTION 'Must be between 1 and 8'; END IF;
  UPDATE public.profiles SET semesters_unlocked = _count WHERE id = _user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_set_semesters_unlocked(uuid, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_semesters_unlocked(uuid, smallint) TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_cgpa(_semester smallint, _cgpa numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_existing public.semester_cgpa%ROWTYPE;
  v_new_points integer := ROUND(_cgpa * 10);
  v_delta integer;
  v_profile public.profiles%ROWTYPE;
  v_prev_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
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
$function$;