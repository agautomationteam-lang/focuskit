import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function postToGMB(params: {
  accessToken: string
  placeId: string
  reviewId: string  // full resource name: "accounts/.../locations/.../reviews/..."
  replyText: string
}): Promise<{ ok: boolean; error?: string }> {
  // reviewId is the full GBP resource path stored in google_review_id
  const url = `https://mybusiness.googleapis.com/v4/${params.reviewId}/reply`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: params.replyText }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { ok: false, error: err }
  }

  return { ok: true }
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { responseId } = body as { responseId?: string }

  if (!responseId) {
    return NextResponse.json({ error: 'responseId required' }, { status: 400 })
  }

  // Load response + ownership chain
  const { data: resp, error: fetchError } = await supabase
    .from('responses')
    .select(
      'id, final_text, status, review_id, reviews!inner(google_review_id, business_id, businesses!inner(user_id, google_place_id, google_access_token))'
    )
    .eq('id', responseId)
    .single()

  if (fetchError || !resp) {
    return NextResponse.json({ error: 'Response not found' }, { status: 404 })
  }

  const review = ((resp as unknown) as {
    reviews: {
      google_review_id: string | null
      business_id: string
      businesses: { user_id: string; google_place_id: string | null; google_access_token: string | null }
    }
  }).reviews

  if (review.businesses.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (resp.status !== 'approved') {
    return NextResponse.json({ error: 'Response must be approved before publishing' }, { status: 400 })
  }

  if (!resp.final_text) {
    return NextResponse.json({ error: 'No final text to publish' }, { status: 400 })
  }

  let publishedLive = false

  // Attempt real GMB publish if credentials are present
  if (
    review.businesses.google_access_token &&
    review.businesses.google_place_id &&
    review.google_review_id
  ) {
    const result = await postToGMB({
      accessToken: review.businesses.google_access_token,
      placeId: review.businesses.google_place_id,
      reviewId: review.google_review_id,
      replyText: resp.final_text,
    })
    publishedLive = result.ok
  }

  // Mark posted regardless (real or simulated)
  const now = new Date().toISOString()

  await supabase
    .from('responses')
    .update({ status: 'posted', posted_at: now })
    .eq('id', responseId)

  await supabase
    .from('reviews')
    .update({ status: 'posted', replied_at: now, reply_text: resp.final_text })
    .eq('id', resp.review_id)

  return NextResponse.json({
    published: true,
    live: publishedLive,
    message: publishedLive
      ? 'Reply posted to Google.'
      : 'Reply marked as posted. Connect Google My Business to publish live.',
  })
}
