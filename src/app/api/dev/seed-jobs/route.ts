import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueue } from '@/lib/jobs/queue'
import { NextResponse } from 'next/server'

// Only available in development
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'No business found for this user' }, { status: 404 })
  }

  const businessId = business.id
  const admin      = createAdminClient()
  const jobIds: Record<string, string | string[]> = {}

  // 1. fetch_reviews
  jobIds.fetchReviews = await enqueue('fetch_reviews', { businessId })

  // 2. generate_response for any existing reviews without a response
  const { data: reviews } = await admin
    .from('reviews')
    .select('id, responses(id)')
    .eq('business_id', businessId)
    .eq('status', 'pending')

  const needsGen = (reviews ?? []).filter(
    (r: { id: string; responses: { id: string }[] }) =>
      !r.responses || r.responses.length === 0
  )

  const generateIds: string[] = []
  for (const r of needsGen) {
    const id = await enqueue('generate_response', { reviewId: r.id }, { priority: 1 })
    generateIds.push(id)
  }
  if (generateIds.length > 0) jobIds.generateResponses = generateIds

  // 3. send_digest
  jobIds.sendDigest = await enqueue('send_digest', { businessId })

  return NextResponse.json({ businessId, jobIds })
}
