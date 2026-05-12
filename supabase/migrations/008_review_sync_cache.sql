ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS last_synced_at timestamp,
  ADD COLUMN IF NOT EXISTS google_location_id text,
  ADD COLUMN IF NOT EXISTS google_account_id text;
