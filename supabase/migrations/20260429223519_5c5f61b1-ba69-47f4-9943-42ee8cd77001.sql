-- ========== ROLES ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== PORTFOLIO ==========
CREATE TYPE public.media_type AS ENUM ('image','video','audio');
CREATE TYPE public.media_category AS ENUM ('audio','video','graphics','photography');

CREATE TABLE public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  type media_type NOT NULL,
  category media_category NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can view portfolio" ON public.portfolio_items
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage portfolio" ON public.portfolio_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== BOOKINGS ==========
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  description TEXT NOT NULL,
  preferred_date DATE,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit booking" ON public.bookings
  FOR INSERT TO anon, authenticated WITH CHECK (
    length(full_name) BETWEEN 1 AND 200 AND
    length(email) BETWEEN 3 AND 320 AND
    length(phone) BETWEEN 3 AND 50 AND
    length(service) BETWEEN 1 AND 200 AND
    length(description) BETWEEN 1 AND 5000
  );
CREATE POLICY "admins view bookings" ON public.bookings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete bookings" ON public.bookings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== SOCIAL LINKS ==========
CREATE TABLE public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '#',
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public view social links" ON public.social_links
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage social links" ON public.social_links
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.social_links (platform, label, url, sort_order) VALUES
  ('instagram','Instagram','#',1),
  ('tiktok','TikTok','#',2),
  ('youtube','YouTube','#',3),
  ('portfolio','Portfolio','#',4),
  ('email','Email','mailto:hello@example.com',5),
  ('whatsapp','WhatsApp','#',6);

-- ========== STORAGE BUCKET ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('media','media',true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read media" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
CREATE POLICY "admins upload media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'media' AND public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "admins update media" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'media' AND public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "admins delete media" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'media' AND public.has_role(auth.uid(), 'admin')
  );