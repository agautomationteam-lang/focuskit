import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const STUB_REVIEWS = [
  {
    google_review_id: 'stub_001',
    reviewer_name: 'Sarah Mitchell',
    reviewer_photo_url: null,
    rating: 5,
    text: 'Absolutely loved this place! The service was incredible and everything exceeded my expectations. Will definitely be back soon.',
    review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    google_review_id: 'stub_002',
    reviewer_name: 'James Rodriguez',
    reviewer_photo_url: null,
    rating: 2,
    text: 'Waited nearly an hour and the order came out wrong. The staff was apologetic but the manager never came by to check on us. Disappointed.',
    review_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    google_review_id: 'stub_003',
    reviewer_name: 'Emma Thompson',
    reviewer_photo_url: null,
    rating: 4,
    text: 'Great experience overall! Slightly long wait but the quality made up for it. The staff was friendly and accommodating.',
    review_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    google_review_id: 'stub_004',
    reviewer_name: 'Michael Chang',
    reviewer_photo_url: null,
    rating: 1,
    text: 'Terrible experience from start to finish. Will not be returning and would not recommend to anyone.',
    review_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    google_review_id: 'stub_005',
    reviewer_name: 'Lisa Patterson',
    reviewer_photo_url: null,
    rating: 5,
    text: 'Best experience I have had in a long time! Everything was perfect — quality, speed, and friendliness. Highly recommend!',
    review_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

async function fetchGoogleReviews(placeId: string): Promise<typeof STUB_REVIEWS[number][]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return STUB_REVIEWS

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return STUB_REVIEWS

  const data = await res.json()
  const reviews = data.result?.reviews
  if (!Array.isArray(reviews) || reviews.length === 0) return STUB_REVIEWS

  return reviews.map((r: {
    author_name: string
    profile_photo_url?: string
    rating: number
    text?: string
    time: number
  }, i: number) => ({
    google_review_id: `${placeId}_${r.time}_${i}`,
    reviewer_name: r.author_name,
    reviewer_photo_url: (r.profile_photo_url ?? null) as null,
    rating: r.rating,
    text: r.text ?? '',
    review_date: new Date(r.time * 1000).toISOString(),
  }))
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const businessId: string | undefined = body.businessId

  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  const [{ data: business, error: bizError }, { data: userRecord }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, google_place_id')
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

  // Gate trial users — cap fetch at FREE_LIMIT
  const FREE_LIMIT = 5
  const isPaid = userRecord?.subscription_status === 'active'

  const allReviews = business.google_place_id
    ? await fetchGoogleReviews(business.google_place_id)
    : STUB_REVIEWS

  const rawReviews = isPaid ? allReviews : allReviews.slice(0, FREE_LIMIT)

  // Upsert reviews (deduplicate by google_review_id)
  const toInsert = rawReviews.map((r) => ({
    business_id: businessId,
    google_review_id: r.google_review_id,
    reviewer_name: r.reviewer_name,
    reviewer_photo_url: r.reviewer_photo_url,
    rating: r.rating,
    text: r.text,
    review_date: r.review_date,
    status: 'pending',
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('reviews')
    .upsert(toInsert, { onConflict: 'business_id,google_review_id', ignoreDuplicates: true })
    .select('id')

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    fetched: rawReviews.length,
    inserted: inserted?.length ?? 0,
    source: business.google_place_id ? 'google' : 'stub',
  })
}
