import { createAdminClient } from '@/lib/supabase/admin'
import { Suspense } from 'react'
import Header from './_components/Header'
import ReviewList from './_components/ReviewList'
import AppShell from '@/components/AppShell'

const DEMO_EMAIL = 'demo@replykit.app'

const SEED = [
  {
    name: 'Sarah M.', rating: 5, daysAgo: 2,
    text: "Best coffee shop I've ever been to! The staff remembered my name after just my second visit. The atmosphere is perfect.",
    pro: "Thank you so much, Sarah — that genuinely made our team's week. We take real pride in knowing our regulars, and we're thrilled you noticed. Looking forward to your next visit!",
    fri: "Sarah, you're the reason we love what we do! Knowing regulars by name is one of our favorite parts of the job — can't wait to see you again soon!",
  },
  {
    name: 'John D.', rating: 2, daysAgo: 5,
    text: 'Waited 20 minutes for my order on a weekday morning. Staff seemed overwhelmed and nobody acknowledged the wait.',
    pro: "John, we sincerely apologize — a 20-minute wait without acknowledgment is not the experience we aim to deliver. We've already reviewed our morning operations. Please reach out directly and we'll make it right.",
    fri: "John, we're really sorry about that wait — 20 minutes is way too long, especially with no check-in. We'd love a chance to make it up to you. Reach out and the next coffee is on us.",
  },
  {
    name: 'Lisa K.', rating: 5, daysAgo: 7,
    text: 'Incredible atmosphere. I come here every single week to work remotely and the WiFi is fast and reliable. Staff always friendly.',
    pro: "Lisa, thank you for being such a loyal part of our community! We designed the space with remote workers in mind, and it's wonderful to know it's serving you well every week. See you soon!",
    fri: "Lisa! We love having you here every week — you're practically family at this point! Always working to keep the WiFi fast and the vibes just right. See you soon!",
  },
  {
    name: 'Mike R.', rating: 4, daysAgo: 10,
    text: 'Great food, slightly expensive but the quality justifies it. Would definitely come back for special occasions.',
    pro: "Thank you for the thoughtful feedback, Mike. We source premium ingredients and price accordingly — we'd love to be your first choice for the next special occasion.",
    fri: "Thanks Mike! We put a lot of love into sourcing the best stuff, so hearing it shows means everything. Hope to see you again for your next special moment!",
  },
  {
    name: 'Emma S.', rating: 1, daysAgo: 1,
    text: 'Rude service. My order was wrong twice and nobody apologized or offered to fix it properly. Very disappointed.',
    pro: "Emma, we're truly sorry — an incorrect order handled without acknowledgment falls well short of our standards. Please contact us directly and we'll make this right for you.",
    fri: "Emma, this is not okay and we're so sorry. Wrong order twice with no proper fix? That's completely on us. Please reach out — we want to make it right personally.",
  },
] as const

async function seedDemoReviews(supabase: ReturnType<typeof createAdminClient>, businessId: string) {
  const now = new Date()
  const dates = SEED.map(s => {
    const d = new Date(now)
    d.setDate(d.getDate() - s.daysAgo)
    return d.toISOString()
  })

  const reviewRows = SEED.map((s, i) => ({
    business_id: businessId,
    google_review_id: `demo_${i}_${Date.now()}`,
    reviewer_name: s.name,
    rating: s.rating,
    text: s.text,
    review_date: dates[i],
    status: 'posted',
  }))

  const { data: inserted } = await supabase
    .from('reviews')
    .insert(reviewRows)
    .select('id, rating')

  if (inserted?.length) {
    const responseRows = inserted.map((review, i) => ({
      review_id: review.id,
      draft_professional: SEED[i].pro,
      draft_friendly: SEED[i].fri,
      selected_draft: review.rating >= 4 ? 'friendly' : 'professional',
      final_text: review.rating >= 4 ? SEED[i].fri : SEED[i].pro,
      status: 'posted',
      posted_at: dates[i],
    }))
    await supabase.from('responses').insert(responseRows)
  }
}

export default async function DashboardPage() {
  const supabase = createAdminClient()

  // Find existing demo user via public.users (avoids paginated listUsers)
  let { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .maybeSingle()

  let userId: string

  if (userRow) {
    userId = userRow.id
  } else {
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: 'replykit-demo-2024',
      email_confirm: true,
    })

    if (error || !authData.user) {
      // User may already exist in auth but not in public.users
      const { data: list } = await supabase.auth.admin.listUsers()
      const found = list?.users?.find(u => u.email === DEMO_EMAIL)
      if (!found) {
        return (
          <div className="flex items-center justify-center min-h-screen text-red-400 text-sm">
            Demo init failed — check Supabase service role key.
          </div>
        )
      }
      userId = found.id
    } else {
      userId = authData.user.id
    }

    await supabase.from('users').upsert(
      { id: userId, email: DEMO_EMAIL, subscription_status: 'active' },
      { onConflict: 'id' }
    )
  }

  // Find or create demo business
  let { data: biz } = await supabase
    .from('businesses')
    .select('id, name, tone, auto_reply_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (!biz) {
    const { data: created } = await supabase
      .from('businesses')
      .insert({ user_id: userId, name: 'Maple Street Coffee Co.', tone: 'friendly', auto_reply_enabled: true })
      .select('id, name, tone, auto_reply_enabled')
      .single()
    biz = created
  }

  if (!biz) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-400 text-sm">
        Business setup failed — check database connection.
      </div>
    )
  }

  // Migrate old demo name to realistic name
  if (biz.name === 'Demo Coffee Shop') {
    await supabase.from('businesses').update({ name: 'Maple Street Coffee Co.' }).eq('id', biz.id)
    biz = { ...biz, name: 'Maple Street Coffee Co.' }
  }

  // Seed reviews if none exist
  const { count } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', biz.id)

  if (!count || count === 0) {
    await seedDemoReviews(supabase, biz.id)
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id,
      reviewer_name,
      rating,
      text,
      review_date,
      status,
      responses (
        id,
        draft_professional,
        draft_friendly,
        selected_draft,
        final_text,
        status
      )
    `)
    .eq('business_id', biz.id)
    .order('review_date', { ascending: false })

  return (
    <AppShell businessName={biz.name}>
      <Header businessName={biz.name} userEmail={DEMO_EMAIL} subscriptionStatus="active" />
      <Suspense fallback={null}>
        <ReviewList
          business={biz}
          initialReviews={reviews ?? []}
          subscriptionStatus="active"
          reviewCount={reviews?.length ?? 0}
          demo
        />
      </Suspense>
    </AppShell>
  )
}
