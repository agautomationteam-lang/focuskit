import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Only available in development — shows queue state and recent logs
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Verify migration has been applied
  const { error: tableCheck } = await admin
    .from('job_queue')
    .select('id', { count: 'exact', head: true })

  if (tableCheck) {
    return NextResponse.json(
      { error: 'job_queue table not found — run migration 005_job_queue.sql first', detail: tableCheck.message },
      { status: 503 }
    )
  }

  const [
    { data: queueRows },
    { data: logRows },
  ] = await Promise.all([
    admin
      .from('job_queue')
      .select('id, type, status, attempts, max_attempts, scheduled_at, created_at, error, payload')
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('action_logs')
      .select('id, action, status, business_id, metadata, error, duration_ms, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const summary = (queueRows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    queue_summary: summary,
    queue_jobs:    queueRows ?? [],
    recent_logs:   logRows   ?? [],
  })
}
