import { createClient } from '@/lib/supabase/server'
import { processBatch, type BatchResult } from '@/lib/jobs/worker'
import { NextResponse } from 'next/server'

// Only available in development — runs the job worker directly
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  // How many passes to run (fetch_reviews enqueues generate_response, so 2 passes covers the chain)
  const passes = Math.min(Number(body.passes ?? 1), 5)

  const results: BatchResult[] = []
  for (let i = 0; i < passes; i++) {
    const r = await processBatch(10)
    results.push(r)
    if (r.processed === 0) break // queue drained
  }

  return NextResponse.json({ passes: results.length, results })
}
