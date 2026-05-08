-- Add Google OAuth columns for Business Profile API
-- Run this in Supabase SQL editor before deploying the Google OAuth integration

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS google_refresh_token text,
  ADD COLUMN IF NOT EXISTS google_account_id text;
