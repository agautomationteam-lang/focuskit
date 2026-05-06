import { createClient } from '@/lib/supabase/server'
import { getBestDraft, generateDraft } from '@/lib/openai'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const reviewId: string | undefined = body.reviewId

  if (!reviewId) {
    return NextResponse.json({ error: 'reviewId required' }, { status: 400 })
  }

  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select('id, rating, text, reviewer_name, business_id, businesses!inner(name, user_id, tone)')
    .eq('id', reviewId)
    .single()

  if (reviewError || !review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  const business = ((review as unknown) as {
    businesses: { name: string; user_id: string; tone: string }
  }).businesses

  if (business.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Gate trial users at FREE_LIMIT reviews
  const FREE_LIMIT = 5
  const { data: userRecord } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  if (userRecord?.subscription_status !== 'active') {
    const { count } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', review.business_id)

    if ((count ?? 0) > FREE_LIMIT) {
      return NextResponse.json(
        { error: 'upgrade_required', message: 'Upgrade to generate responses for more than 5 reviews.' },
        { status: 402 }
      )
    }
  }

  const base = {
    reviewText:   review.text ?? '',
    rating:       review.rating,
    businessName: business.name,
    reviewerName: review.reviewer_name ?? undefined,
    businessTone: business.tone,
  }

  const recommended = getBestDraft(review.rating)

  let professional: string
  let friendly: string
  try {
    ;[professional, friendly] = await Promise.all([
      generateDraft({ ...base, draftTone: 'professional' }),
      generateDraft({ ...base, draftTone: 'friendly' }),
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OpenAI request failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const { data: response, error: upsertError } = await supabase
    .from('responses')
    .upsert(
      {
        review_id: reviewId,
        draft_professional: professional,
        draft_friendly: friendly,
        status: 'draft',
        selected_draft: recommended,
        final_text: null,
        posted_at: null,
      },
      { onConflict: 'review_id' }
    )
    .select()
    .single()

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ response, recommended_draft: recommended })
}
