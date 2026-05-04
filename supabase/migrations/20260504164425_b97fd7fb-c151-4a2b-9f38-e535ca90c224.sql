-- Remove sensitive tables from realtime publication to stop broadcasting PII to all admin sessions.
ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings;
ALTER PUBLICATION supabase_realtime DROP TABLE public.page_events;

-- Add portfolio_items to realtime so the public portfolio updates instantly when admin publishes.
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_items;