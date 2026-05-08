-- Add review history columns for permanent audit trail
-- synced_at: when ReplyKit first fetched the review from Google
-- replied_at: when a reply was posted (denormalized from responses for fast queries)
-- reply_text: the reply text (denormalized for easy export / reporting)

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS synced_at  timestamptz,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_text text;

-- Back-fill synced_at from created_at for existing rows
UPDATE public.reviews SET synced_at = created_at WHERE synced_at IS NULL;

-- Default for new rows
ALTER TABLE public.reviews ALTER COLUMN synced_at SET DEFAULT now();

-- Composite indexes for pagination queries
CREATE INDEX IF NOT EXISTS reviews_business_date_idx   ON public.reviews (business_id, review_date DESC);
CREATE INDEX IF NOT EXISTS reviews_business_rating_idx ON public.reviews (business_id, rating, review_date DESC);
