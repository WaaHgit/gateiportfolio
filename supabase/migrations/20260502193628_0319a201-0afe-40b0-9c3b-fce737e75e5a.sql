
-- Analytics: page views & link clicks
CREATE TABLE IF NOT EXISTS public.page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  path text,
  platform text,
  label text,
  referrer text,
  session_id text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_events_created_at_idx ON public.page_events (created_at DESC);
CREATE INDEX IF NOT EXISTS page_events_kind_idx ON public.page_events (kind);
CREATE INDEX IF NOT EXISTS page_events_platform_idx ON public.page_events (platform);

ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log events"
  ON public.page_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(coalesce(kind,'')) BETWEEN 1 AND 40
    AND length(coalesce(path,'')) <= 500
    AND length(coalesce(platform,'')) <= 40
    AND length(coalesce(label,'')) <= 200
    AND length(coalesce(referrer,'')) <= 500
    AND length(coalesce(session_id,'')) <= 80
    AND length(coalesce(user_agent,'')) <= 400
  );

CREATE POLICY "admins read events"
  ON public.page_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Bookings: agreement / calendar fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS agreement_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_time time,
  ADD COLUMN IF NOT EXISTS venue text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS calendar_event_id text;

-- Realtime for bookings & events
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.page_events REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.page_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
