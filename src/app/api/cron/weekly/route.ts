import { createAdminClient } from '@/lib/supabase/admin'
import { enqueue } from '@/lib/jobs/queue'
import { log } from '@/lib/logger'
import { NextResponse } from 'next/server'

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// Runs every Monday at 09:00 UTC.
// Enqueues send_digest for every business (all users get the weekly summary).
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = businesses ?? []
  for (const b of list) {
    await enqueue('send_digest', { businessId: b.id })
  }

  await log({
    action:   'cron_weekly',
    status:   'success',
    metadata: { enqueued: list.length },
  })

  return NextResponse.json({ enqueued: list.length })
}
