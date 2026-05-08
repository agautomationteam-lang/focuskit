import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Header from './_components/Header'
import ReviewList from './_components/ReviewList'
import AppShell from '@/components/AppShell'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const [{ data: userRecord }, { data: biz }] = await Promise.all([
    supabase.from('users').select('subscription_status, email').eq('id', user.id).single(),
    supabase.from('businesses')
      .select('id, name, tone, auto_reply_enabled, google_place_id, google_access_token')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (!biz) redirect('/onboarding')

  const [{ data: allReviews }, { count: reviewsTotal }] = await Promise.all([
    supabase
      .from('reviews')
      .select(`
        id, google_review_id, reviewer_name, rating, text, review_date, status,
        responses (id, draft_professional, draft_friendly, selected_draft, final_text, status)
      `)
      .eq('business_id', biz.id)
      .order('review_date', { ascending: false })
      .limit(30),
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', biz.id)
      .not('google_review_id', 'like', 'stub_%'),
  ])

  const reviews = (allReviews ?? []).filter(
    (r: { google_review_id?: string }) => !r.google_review_id?.startsWith('stub_')
  )

  const googleConnected = !!(biz.google_place_id && biz.google_access_token)

  return (
    <AppShell businessName={biz.name}>
      <Header
        businessName={biz.name}
        userEmail={userRecord?.email ?? user.email ?? ''}
        subscriptionStatus={userRecord?.subscription_status ?? 'trial'}
        googleConnected={googleConnected}
      />
      <Suspense fallback={null}>
        <ReviewList
          business={biz}
          initialReviews={reviews ?? []}
          subscriptionStatus={userRecord?.subscription_status ?? 'trial'}
          reviewCount={reviewsTotal ?? reviews?.length ?? 0}
          demo={false}
          googleConnected={googleConnected}
        />
      </Suspense>
    </AppShell>
  )
}
