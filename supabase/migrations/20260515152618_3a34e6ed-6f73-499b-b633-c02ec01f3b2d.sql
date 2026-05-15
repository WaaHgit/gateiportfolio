ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending';
UPDATE public.bookings SET status = 'pending' WHERE status IN ('new', 'contacted');