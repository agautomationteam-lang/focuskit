import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

interface GBPReview {
  name: string
  reviewId: string
  reviewer: { displayName: string; profilePhotoUrl?: string }
  starRating: string
  comment?: string
  createTime: string
}

async function callRefreshToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { access_token?: string }
    return data.access_token ?? null
  } catch { return null }
}

async function fetchGBPReviews(accessToken: string, locationPath: string): Promise<GBPReview[]> {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationPath}/reviews?pageSize=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (res.status === 401) throw Object.assign(new Error('token_expired'), { status: 401 })
  if (!res.ok) throw new Error(`GBP ${res.status}`)
  const data = await res.json() as { reviews?: GBPReview[] }
  return data.reviews ?? []
}


export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await request.json().catch(() => ({})) as { businessId?: string }
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const [{ data: business, error: bizError }, { data: userRecord }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, google_place_id, google_access_token, google_refresh_token')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('users')
      .select('subscription_status')
      .eq('id', user.id)
      .single(),
  ])

  if (bizError || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const isPaid = userRecord?.subscription_status === 'active'
  const FREE_LIMIT = 5

  let rawReviews: GBPReview[]
  let source = 'stub'

  if (business.google_access_token && business.google_place_id) {
    console.log(`[Reviews] Fetching reviews for location: ${business.google_place_id}`)
    try {
      rawReviews = await fetchGBPReviews(business.google_access_token, business.google_place_id)
      source = 'google'
      console.log(`[Reviews] Found ${rawReviews.length} reviews from GBP`)
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 401) {
        const refreshToken = (business as unknown as { google_refresh_token?: string }).google_refresh_token
        if (refreshToken) {
          const newToken = await callRefreshToken(refreshToken)
          if (newToken) {
            await supabase.from('businesses').update({ google_access_token: newToken }).eq('id', businessId)
            rawReviews = await fetchGBPReviews(newToken, business.google_place_id)
            source = 'google'
          } else {
            return NextResponse.json(
              { error: 'Google token expired — reconnect Google Business', needsReconnect: true },
              { status: 401 }
            )
          }
        } else {
          return NextResponse.json(
            { error: 'Google token expired — reconnect Google Business', needsReconnect: true },
            { status: 401 }
          )
        }
      } else {
        return NextResponse.json({ error: 'Failed to fetch from Google Business Profile' }, { status: 502 })
      }
    }
  } else {
    // No Google Business connected — return empty, never insert fake data into a real account
    return NextResponse.json({ fetched: 0, inserted: 0, source: 'none' })
  }

  const limited = isPaid ? rawReviews : rawReviews.slice(0, FREE_LIMIT)

  const syncedAt = new Date().toISOString()
  const toInsert = limited.map(r => ({
    business_id: businessId,
    google_review_id: r.name,
    reviewer_name: r.reviewer.displayName,
    reviewer_photo_url: r.reviewer.profilePhotoUrl ?? null,
    rating: STAR_MAP[r.starRating] ?? 3,
    text: r.comment ?? '',
    review_date: r.createTime,
    status: 'pending',
    synced_at: syncedAt,
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('reviews')
    .upsert(toInsert, { onConflict: 'business_id,google_review_id', ignoreDuplicates: true })
    .select('id')

  if (insertError) {
    console.error(`[Reviews] Supabase insert error: ${insertError.message}`)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  console.log(`[Reviews] Stored ${inserted?.length ?? 0} new reviews in Supabase`)
  return NextResponse.json({ fetched: limited.length, inserted: inserted?.length ?? 0, source })
}
