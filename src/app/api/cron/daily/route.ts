import { createAdminClient } from '@/lib/supabase/admin'
import { enqueue } from '@/lib/jobs/queue'
import { log } from '@/lib/logger'
import { NextResponse } from 'next/server'

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// Runs daily at 09:00 UTC.
// Enqueues fetch_reviews for every business with auto-reply enabled.
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('auto_reply_enabled', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = businesses ?? []
  for (const b of list) {
    await enqueue('fetch_reviews', { businessId: b.id })
  }

  await log({
    action:   'cron_daily',
    status:   'success',
    metadata: { enqueued: list.length },
  })

  return NextResponse.json({ enqueued: list.length })
}
