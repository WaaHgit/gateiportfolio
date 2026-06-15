ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
DROP POLICY IF EXISTS "realtime admin all topics" ON realtime.messages;