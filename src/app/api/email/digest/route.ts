import { createClient } from '@/lib/supabase/server'
import { resend, buildDigestEmail } from '@/lib/resend'
import { createMagicLink } from '@/lib/magic-link'
import { getBestDraft } from '@/lib/openai'
import { NextResponse } from 'next/server'

const ONE_WEEK_AGO = () =>
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`

  const supabase = await createClient()

  if (!isCron) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await request.json().catch(() => ({}))
  const { businessId } = body as { businessId?: string }

  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id, name, users!inner(email)')
    .eq('id', businessId)
    .single()

  if (bizError || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const ownerEmail = ((business as unknown) as { users: { email: string } }).users.email

  // Reviews from the last 7 days, including their AI responses
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Build action cards only for pending reviews that have a generated response
  const pendingReviews = (reviews as RawReview[])
    .filter((r) => r.status === 'pending' && r.responses?.length > 0)
    .map((r) => {
      const resp = r.responses[0]
      const draft =
        resp.selected_draft === 'friendly' || resp.selected_draft === 'professional'
          ? (resp.selected_draft as 'friendly' | 'professional')
          : getBestDraft(r.rating)
      const responseText =
        draft === 'friendly' ? resp.draft_friendly : resp.draft_professional

      return {
        reviewer: r.reviewer_name,
        rating: r.rating,
        text: r.text,
        recommendedResponse: responseText,
        actionUrl: createMagicLink(resp.id, appUrl),
      }
    })

  const pending = reviews.filter((r) => r.status === 'pending').length
  const posted  = reviews.filter((r) => r.status === 'posted').length

  const { subject, html } = buildDigestEmail({
    businessName: business.name,
    newReviewCount: reviews.length,
    pendingCount: pending,
    postedCount: posted,
    pendingReviews,
    appUrl,
  })

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: 'ReplyKit <digest@replykit.co>',
    to: ownerEmail,
    subject,
    html,
  })

  if (emailError) {
    return NextResponse.json({ error: emailError.message }, { status: 500 })
  }

  return NextResponse.json({
    sent: true,
    emailId: emailData?.id,
    to: ownerEmail,
    pendingCount: pendingReviews.length,
  })
}
