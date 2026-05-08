import { createAdminClient } from '@/lib/supabase/admin'
import { getBestDraft, generateDraft } from '@/lib/openai'
import { resend, buildDigestEmail } from '@/lib/resend'
import { createMagicLink } from '@/lib/magic-link'
import { log } from '@/lib/logger'
import { enqueue } from './queue'

type StubReview = {
  google_review_id: string
  reviewer_name: string
  reviewer_photo_url: null
  rating: number
  text: string
  review_date: string
}

async function fetchGoogleReviews(placeId: string): Promise<StubReview[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return []

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return []

  const data = await res.json()
  const reviews = data.result?.reviews
  if (!Array.isArray(reviews) || reviews.length === 0) return []

  return reviews.map((r: {
    author_name: string
    profile_photo_url?: string
    rating: number
    text?: string
    time: number
  }, i: number) => ({
    google_review_id: `${placeId}_${r.time}_${i}`,
    reviewer_name: r.author_name,
    reviewer_photo_url: null as null,
    rating: r.rating,
    text: r.text ?? '',
    review_date: new Date(r.time * 1000).toISOString(),
  }))
}

// ─── fetch_reviews ─────────────────────────────────────────────────────────────

export async function handleFetchReviews(payload: Record<string, unknown>): Promise<void> {
  const t0 = Date.now()
  const businessId = payload.businessId as string

  const supabase = createAdminClient()

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id, google_place_id, auto_reply_enabled')
    .eq('id', businessId)
    .single()

  if (bizError || !business) {
    throw new Error(`Business ${businessId} not found`)
  }

  const rawReviews = business.google_place_id
    ? await fetchGoogleReviews(business.google_place_id)
    : []

  const toInsert = rawReviews.map(r => ({
    business_id:       businessId,
    google_review_id:  r.google_review_id,
    reviewer_name:     r.reviewer_name,
    reviewer_photo_url: r.reviewer_photo_url,
    rating:            r.rating,
    text:              r.text,
    review_date:       r.review_date,
    status:            'pending',
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('reviews')
    .upsert(toInsert, { onConflict: 'business_id,google_review_id', ignoreDuplicates: true })
    .select('id')

  if (insertError) throw new Error(insertError.message)

  // If auto-reply is enabled, enqueue generate_response for reviews without one
  if (business.auto_reply_enabled) {
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('id, responses(id)')
      .eq('business_id', businessId)
      .eq('status', 'pending')

    const needsGeneration = (allReviews ?? []).filter(
      (r: { id: string; responses: { id: string }[] }) =>
        !r.responses || r.responses.length === 0
    )

    for (const r of needsGeneration) {
      await enqueue('generate_response', { reviewId: r.id }, { priority: 1 })
    }
  }

  await log({
    action:      'fetch_reviews',
    status:      'success',
    businessId,
    metadata:    { fetched: rawReviews.length, inserted: inserted?.length ?? 0 },
    durationMs:  Date.now() - t0,
  })
}

// ─── generate_response ─────────────────────────────────────────────────────────

export async function handleGenerateResponse(payload: Record<string, unknown>): Promise<void> {
  const t0 = Date.now()
  const reviewId = payload.reviewId as string

  const supabase = createAdminClient()

  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select('id, rating, text, reviewer_name, business_id, businesses!inner(name, tone, auto_reply_enabled)')
    .eq('id', reviewId)
    .single()

  if (reviewError || !review) {
    throw new Error(`Review ${reviewId} not found`)
  }

  // Skip if already has a response
  const { count } = await supabase
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .eq('review_id', reviewId)

  if ((count ?? 0) > 0) return

  const business = ((review as unknown) as {
    businesses: { name: string; tone: string; auto_reply_enabled: boolean }
  }).businesses

  const base = {
    reviewText:   review.text ?? '',
    rating:       review.rating,
    businessName: business.name,
    reviewerName: review.reviewer_name ?? undefined,
    businessTone: business.tone,
  }

  const recommended = getBestDraft(review.rating)
  const [professional, friendly] = await Promise.all([
    generateDraft({ ...base, draftTone: 'professional' }),
    generateDraft({ ...base, draftTone: 'friendly' }),
  ])

  const autoReply = business.auto_reply_enabled ?? false
  const finalText = recommended === 'friendly' ? friendly : professional
  const now       = new Date().toISOString()

  const { error: upsertError } = await supabase
    .from('responses')
    .upsert(
      {
        review_id:          reviewId,
        draft_professional: professional,
        draft_friendly:     friendly,
        status:             autoReply ? 'posted' : 'draft',
        selected_draft:     recommended,
        final_text:         autoReply ? finalText : null,
        posted_at:          autoReply ? now       : null,
      },
      { onConflict: 'review_id' }
    )

  if (upsertError) throw new Error(upsertError.message)

  // Auto-reply: skip approval, mark review as replied immediately
  if (autoReply) {
    await supabase
      .from('reviews')
      .update({ status: 'posted' })
      .eq('id', reviewId)
  }

  await log({
    action:      autoReply ? 'auto_reply' : 'generate_response',
    status:      'success',
    businessId:  review.business_id,
    resourceType: 'review',
    resourceId:  reviewId,
    metadata:    { autoReply, rating: review.rating, recommended },
    durationMs:  Date.now() - t0,
  })
}

// ─── send_digest ───────────────────────────────────────────────────────────────

const ONE_WEEK_AGO = () =>
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

export async function handleSendDigest(payload: Record<string, unknown>): Promise<void> {
  const t0 = Date.now()
  const businessId = payload.businessId as string

  const supabase  = createAdminClient()
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id, name, users!inner(email)')
    .eq('id', businessId)
    .single()

  if (bizError || !business) {
    throw new Error(`Business ${businessId} not found`)
  }

  const ownerEmail = ((business as unknown) as { users: { email: string } }).users.email

  const { data: rawReviews } = await supabase
    .from('reviews')
    .select('id, reviewer_name, rating, text, status, responses(id, draft_professional, draft_friendly, selected_draft, status)')
    .eq('business_id', businessId)
    .gte('review_date', ONE_WEEK_AGO())
    .order('review_date', { ascending: false })

  const reviews = rawReviews ?? []

  type RawReview = typeof reviews[number] & {
    responses: {
      id: string
      draft_professional: string
      draft_friendly: string
      selected_draft: string | null
      status: string
    }[]
  }

  const pendingReviews = (reviews as RawReview[])
    .filter(r => r.status === 'pending' && r.responses?.length > 0)
    .map(r => {
      const resp = r.responses[0]
      const draft =
        resp.selected_draft === 'friendly' || resp.selected_draft === 'professional'
          ? (resp.selected_draft as 'friendly' | 'professional')
          : getBestDraft(r.rating)
      return {
        reviewer:          r.reviewer_name,
        rating:            r.rating,
        text:              r.text,
        recommendedResponse: draft === 'friendly' ? resp.draft_friendly : resp.draft_professional,
        actionUrl:         createMagicLink(resp.id, appUrl),
      }
    })

  const pending = reviews.filter(r => r.status === 'pending').length
  const posted  = reviews.filter(r => r.status === 'posted').length

  const { subject, html } = buildDigestEmail({
    businessName:   business.name,
    newReviewCount: reviews.length,
    pendingCount:   pending,
    postedCount:    posted,
    pendingReviews,
    appUrl,
  })

  const { error: emailError } = await resend.emails.send({
    from:    'ReplyKit <digest@replykit.co>',
    to:      ownerEmail,
    subject,
    html,
  })

  if (emailError) throw new Error(emailError.message)

  await log({
    action:     'send_digest',
    status:     'success',
    businessId,
    metadata:   { to: ownerEmail, pendingCount: pendingReviews.length },
    durationMs: Date.now() - t0,
  })
}
