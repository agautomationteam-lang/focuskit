-- Job queue for background processing
CREATE TABLE IF NOT EXISTS job_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','completed','failed','dead')),
  priority      INT  NOT NULL DEFAULT 0,
  attempts      INT  NOT NULL DEFAULT 0,
  max_attempts  INT  NOT NULL DEFAULT 5,
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  error         TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_queue_claimable
  ON job_queue (priority DESC, scheduled_at ASC)
  WHERE status = 'pending';

-- Structured log of all system actions
CREATE TABLE IF NOT EXISTS action_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action        TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('success','error','info')),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id   UUID REFERENCES businesses(id) ON DELETE SET NULL,
  resource_type TEXT,
  resource_id   TEXT,
  metadata      JSONB,
  error         TEXT,
  duration_ms   INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_logs_created ON action_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_business ON action_logs (business_id, created_at DESC);

-- Atomically claim jobs using FOR UPDATE SKIP LOCKED (prevents double-processing)
CREATE OR REPLACE FUNCTION claim_jobs(batch_size INT DEFAULT 5)
RETURNS SETOF job_queue
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE job_queue
  SET
    status     = 'processing',
    attempts   = attempts + 1,
    updated_at = now()
  WHERE id IN (
    SELECT id
    FROM   job_queue
    WHERE  status = 'pending'
      AND  scheduled_at <= now()
    ORDER BY priority DESC, scheduled_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
