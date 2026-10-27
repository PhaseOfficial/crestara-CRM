-- ============================================================================
-- Migration: 20261027_storage_buckets.sql
-- Description: Provision Supabase Storage buckets, RLS policies, and customer logo columns
-- ============================================================================

-- 1. Create or update the 'crm-assets' public storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-assets',
  'crm-assets',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

-- 2. Storage Objects Row Level Security (RLS) Policies
-- Note: In Supabase, storage.objects has RLS enabled by default. Do NOT run ALTER TABLE storage.objects.

-- Public Read Access: Anyone (anon and authenticated) can view/download images from crm-assets
DROP POLICY IF EXISTS "Public can view crm-assets" ON storage.objects;
CREATE POLICY "Public can view crm-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crm-assets');

-- Authenticated Upload Access: Authenticated staff and clients can upload to crm-assets
DROP POLICY IF EXISTS "Authenticated users can upload crm-assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload crm-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'crm-assets');

-- Authenticated Update Access: Authenticated users can overwrite/update crm-assets
DROP POLICY IF EXISTS "Authenticated users can update crm-assets" ON storage.objects;
CREATE POLICY "Authenticated users can update crm-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'crm-assets');

-- Authenticated Delete Access: Authenticated users can delete crm-assets
DROP POLICY IF EXISTS "Authenticated users can delete crm-assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete crm-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'crm-assets');

-- 3. Customer Master Table: Logo & Avatar Columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
