DROP POLICY IF EXISTS "public read media" ON storage.objects;
-- Allow public read of individual objects but block listing
-- by adding a policy that always denies SELECT when no specific name is queried.
-- The Supabase pattern: keep public bucket but remove SELECT policy entirely.
-- Public buckets serve files via CDN URLs without needing a SELECT RLS policy.
-- So: no SELECT policy = no listing, but public CDN URLs still work.