-- Grant anon SELECT on public-readable tables (RLS still applies)
GRANT SELECT ON public.social_links TO anon;
GRANT SELECT ON public.social_links TO authenticated;

GRANT SELECT ON public.portfolio_items TO anon;
GRANT SELECT ON public.portfolio_items TO authenticated;

GRANT SELECT ON public.media TO anon;
GRANT SELECT ON public.media TO authenticated;

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.reviews TO authenticated;

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT ON public.app_settings TO authenticated;

-- Page analytics: anyone can insert events
GRANT INSERT ON public.page_events TO anon;
GRANT INSERT, SELECT ON public.page_events TO authenticated;

-- Bookings: anon must INSERT (public booking form)
GRANT INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;

-- Reviews: authenticated users submit reviews
GRANT INSERT ON public.reviews TO authenticated;

-- Profiles & user_roles for authenticated users
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Service role full access for server functions
GRANT ALL ON public.social_links, public.portfolio_items, public.media,
            public.reviews, public.app_settings, public.page_events,
            public.bookings, public.profiles, public.user_roles
       TO service_role;