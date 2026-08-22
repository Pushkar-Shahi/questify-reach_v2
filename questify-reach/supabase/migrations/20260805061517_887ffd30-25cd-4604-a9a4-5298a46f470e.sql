-- ============ CAREER TOPICS ============
CREATE TABLE public.career_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_global boolean NOT NULL DEFAULT false,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'General',
  weight numeric NOT NULL DEFAULT 3,
  progress numeric NOT NULL DEFAULT 0,
  target numeric NOT NULL DEFAULT 100,
  deadline date,
  notes text,
  is_completed boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT career_topics_title_len CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT career_topics_weight_rng CHECK (weight >= 1 AND weight <= 10),
  CONSTRAINT career_topics_progress_rng CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT career_topics_target_rng CHECK (target >= 1 AND target <= 100),
  CONSTRAINT career_topics_owner CHECK ((is_global AND user_id IS NULL) OR (NOT is_global AND user_id IS NOT NULL))
);

CREATE UNIQUE INDEX career_topics_unique_user_title
  ON public.career_topics (user_id, lower(btrim(title))) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX career_topics_unique_global_title
  ON public.career_topics (lower(btrim(title))) WHERE is_global;
CREATE INDEX career_topics_user_idx ON public.career_topics (user_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_topics TO authenticated;
GRANT ALL ON public.career_topics TO service_role;

ALTER TABLE public.career_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "career topics read own or global" ON public.career_topics
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_global);

CREATE POLICY "career topics insert own" ON public.career_topics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT is_global);

CREATE POLICY "career topics update own" ON public.career_topics
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT is_global)
  WITH CHECK (user_id = auth.uid() AND NOT is_global);

CREATE POLICY "career topics delete own" ON public.career_topics
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND NOT is_global);

CREATE POLICY "career topics admin all" ON public.career_topics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_career_topics_updated
  BEFORE UPDATE ON public.career_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  action_label text,
  action_url text,
  priority text NOT NULL DEFAULT 'normal',
  type text NOT NULL DEFAULT 'announcement',
  audience text NOT NULL DEFAULT 'all',
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_title_len CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  CONSTRAINT notifications_body_len CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  CONSTRAINT notifications_priority_chk CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT notifications_audience_chk CHECK (audience IN ('all','user'))
);

GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

CREATE INDEX notification_deliveries_user_idx
  ON public.notification_deliveries (user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.notification_deliveries TO authenticated;
GRANT ALL ON public.notification_deliveries TO service_role;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliveries read own" ON public.notification_deliveries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "deliveries update own read state" ON public.notification_deliveries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications read delivered or admin" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.notification_deliveries d
      WHERE d.notification_id = notifications.id AND d.user_id = auth.uid()
    )
  );

-- Admin-only send function (server-side authorization)
CREATE OR REPLACE FUNCTION public.admin_send_notification(
  _title text,
  _body text,
  _audience text DEFAULT 'all',
  _target_user uuid DEFAULT NULL,
  _priority text DEFAULT 'normal',
  _type text DEFAULT 'announcement',
  _action_label text DEFAULT NULL,
  _action_url text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF btrim(coalesce(_title,'')) = '' OR btrim(coalesce(_body,'')) = '' THEN
    RAISE EXCEPTION 'Title and body are required';
  END IF;
  IF _audience NOT IN ('all','user') THEN
    RAISE EXCEPTION 'Invalid audience';
  END IF;
  IF _audience = 'user' AND _target_user IS NULL THEN
    RAISE EXCEPTION 'Pick a recipient';
  END IF;
  IF _action_url IS NOT NULL AND btrim(_action_url) <> ''
     AND _action_url !~ '^(https?://|/)' THEN
    RAISE EXCEPTION 'Action URL must be an https URL or an in-app path';
  END IF;

  INSERT INTO public.notifications
    (title, body, action_label, action_url, priority, type, audience, expires_at, created_by)
  VALUES
    (btrim(_title), btrim(_body), nullif(btrim(coalesce(_action_label,'')),''),
     nullif(btrim(coalesce(_action_url,'')),''), _priority, _type, _audience, _expires_at, auth.uid())
  RETURNING id INTO v_id;

  IF _audience = 'all' THEN
    INSERT INTO public.notification_deliveries (notification_id, user_id)
    SELECT v_id, p.id FROM public.profiles p
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.notification_deliveries (notification_id, user_id)
    VALUES (v_id, _target_user)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT count(*) INTO v_count FROM public.notification_deliveries WHERE notification_id = v_id;
  UPDATE public.notifications SET recipient_count = v_count WHERE id = v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.notification_deliveries
    SET read_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;