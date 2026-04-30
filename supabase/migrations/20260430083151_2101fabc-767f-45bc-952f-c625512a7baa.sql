ALTER TABLE public.social_links
  ADD CONSTRAINT social_links_url_safe_protocol
  CHECK (url ~* '^(https?://|mailto:|tel:|#|\+?\d)' OR url = '#');