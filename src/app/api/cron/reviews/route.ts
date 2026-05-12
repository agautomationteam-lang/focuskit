import { createAdminClient } from '@/lib/supabase/admin'
import { enqueue } from '@/lib/jobs/queue'
import { BACKGROUND_SYNC_INTERVAL_MS } from '@/lib/google-business'
import { log } from '@/lib/logger'
import { NextResponse } from 'next/server'

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const threshold = new Date(Date.now() - BACKGROUND_SYNC_INTERVAL_MS).toISOString()

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id')
    .not('google_access_token', 'is', null)
    .or(`last_synced_at.is.null,last_synced_at.lt.${threshold}`)

  if (error) {
    return NextResponse.json({ error: 'Could not schedule review sync jobs.' }, { status: 500 })
  }

  const list = businesses ?? []
  for (const business of list) {
    await enqueue('fetch_reviews', { businessId: business.id })
  }

  await log({
    action: 'cron_reviews',
    status: 'success',
    metadata: { enqueued: list.length },
  })

  return NextResponse.json({ enqueued: list.length })
}
