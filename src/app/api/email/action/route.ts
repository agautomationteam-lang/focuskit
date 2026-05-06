import { createClient } from '@supabase/supabase-js'
import { verifyMagicLink } from '@/lib/magic-link'
import { NextResponse } from 'next/server'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token') ?? ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const verified = verifyMagicLink(token)
  if (!verified) {
    return NextResponse.redirect(`${appUrl}/dashboard`)
  }

  const { responseId } = verified
  const supabase = serviceClient()

  const { data: resp, error } = await supabase
    .from('responses')
    .select(
      'id, draft_professional, draft_friendly, selected_draft, status, review_id, reviews!inner(google_review_id, businesses!inner(google_place_id, google_access_token))'
    )
    .eq('id', responseId)
    .single()

  if (error || !resp) {
    return NextResponse.redirect(`${appUrl}/dashboard`)
  }

  if (resp.status === 'posted') {
    return NextResponse.redirect(`${appUrl}/dashboard`)
  }

  const selectedDraft: 'professional' | 'friendly' =
    resp.selected_draft === 'friendly' ? 'friendly' : 'professional'
  const finalText =
    selectedDraft === 'friendly' ? resp.draft_friendly : resp.draft_professional

  await supabase
    .from('responses')
    .update({ selected_draft: selectedDraft, final_text: finalText, status: 'approved' })
    .eq('id', responseId)

  await supabase
    .from('reviews')
    .update({ status: 'approved' })
    .eq('id', resp.review_id)

  const review = ((resp as unknown) as {
    reviews: {
      google_review_id: string | null
      businesses: { google_place_id: string | null; google_access_token: string | null }
    }
  }).reviews

  const hasCredentials =
    review.businesses.google_access_token &&
    review.businesses.google_place_id &&
    review.google_review_id

  if (hasCredentials) {
    const gmbUrl = `https://mybusiness.googleapis.com/v4/accounts/-/locations/-/reviews/${review.google_review_id}/reply`
    const gmbRes = await fetch(gmbUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${review.businesses.google_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: finalText }),
    }).catch(() => null)

    if (!gmbRes?.ok) {
      // Response stays approved — user can retry from dashboard
      return NextResponse.redirect(`${appUrl}/dashboard?publish_failed=1`)
    }
  }

  const now = new Date().toISOString()
  await supabase.from('responses').update({ status: 'posted', posted_at: now }).eq('id', responseId)
  await supabase.from('reviews').update({ status: 'posted' }).eq('id', resp.review_id)

  return NextResponse.redirect(`${appUrl}/dashboard`)
}
