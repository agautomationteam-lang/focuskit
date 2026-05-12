import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
const API_FORBIDDEN_MESSAGE =
  'Missing API permissions - contact agautomationteam@gmail.com'

interface GBPAccount {
  name: string
}

interface GBPLocation {
  name: string
  title?: string
  storefrontAddress?: unknown
}

interface GBPReview {
  name: string
  reviewId?: string
  reviewer?: { displayName?: string; profilePhotoUrl?: string }
  starRating?: string
  comment?: string
  createTime?: string
}

class GoogleApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function parseGoogleError(status: number, body: string) {
  if (status === 401) return 'Google token expired - please reconnect Google Business'
  if (status === 403) return API_FORBIDDEN_MESSAGE

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string }
    return parsed.error?.message ?? parsed.message ?? body
  } catch {
    return body || `Google API error ${status}`
  }
}

async function googleGet<T>(url: string, accessToken: string): Promise<T> {
  console.log('[Reviews] Google GET request URL:', url)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = await res.text()
  console.log('[Reviews] Google GET response:', res.status, body)

  if (!res.ok) {
    const message = parseGoogleError(res.status, body)
    if (res.status === 404) {
      console.log('[Reviews] Google API 404 URL:', url)
    }
    console.log('[Reviews] Google API failed:', res.status, message)
    throw new GoogleApiError(res.status, message)
  }

  console.log('[Reviews] Google API succeeded:', url)
  return JSON.parse(body) as T
}

async function callRefreshToken(refreshToken: string): Promise<string> {
  console.log('[Reviews] Refreshing Google access token')
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
  const body = await res.text()
  console.log('[Reviews] Refresh token response:', res.status, body)

  if (!res.ok) {
    const message = parseGoogleError(res.status, body)
    console.log('[Reviews] Refresh token failed:', res.status, message)
    throw new GoogleApiError(res.status, message)
  }

  const data = JSON.parse(body) as { access_token?: string }
  if (!data.access_token) {
    console.log('[Reviews] Refresh token response missing access token:', body)
    throw new GoogleApiError(401, `Google refresh response missing access token: ${body}`)
  }

  console.log('[Reviews] Google access token refreshed')
  return data.access_token
}

function idFromName(name: string, prefix: string) {
  return name.replace(`${prefix}/`, '')
}

async function fetchAllReviews(accessToken: string) {
  console.log('[Reviews] Fetching Google Business accounts')
  const accountsData = await googleGet<{ accounts?: GBPAccount[] }>(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    accessToken,
  )
  const accounts = accountsData.accounts ?? []
  console.log('[Reviews] Accounts found:', accounts.length)

  const reviews: GBPReview[] = []
  let firstLocationPath = ''
  let firstAccountName = ''
  let firstBusinessTitle = ''

  for (const account of accounts) {
    const accountName = account.name
    console.log('[Reviews] Fetching locations for account:', accountName)

    const locationsData = await googleGet<{ locations?: GBPLocation[] }>(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress`,
      accessToken,
    )
    const locations = locationsData.locations ?? []
    console.log('[Reviews] Locations found for account:', accountName, locations.length)

    for (const location of locations) {
      const locationName = location.name.startsWith('accounts/')
        ? location.name
        : `${accountName}/${location.name}`
      const locationPath = locationName
      if (!firstLocationPath) {
        firstLocationPath = locationPath
        firstAccountName = account.name
        firstBusinessTitle = location.title ?? ''
      }

      console.log('[Reviews] Fetching reviews for location:', locationPath)
      const reviewsData = await googleGet<{ reviews?: GBPReview[] }>(
        `https://mybusiness.googleapis.com/v4/${locationName}/reviews`,
        accessToken,
      )
      const locationReviews = reviewsData.reviews ?? []
      console.log('[Reviews] Reviews found for location:', locationPath, locationReviews.length)
      reviews.push(...locationReviews)
    }
  }

  return { reviews, firstLocationPath, firstAccountName, firstBusinessTitle }
}

export async function POST(request: Request) {
  console.log('[Reviews] Fetch route started')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('[Reviews] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { businessId } = await request.json().catch(() => ({})) as { businessId?: string }
  if (!businessId) {
    console.log('[Reviews] Missing businessId')
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  console.log('[Reviews] Loading business:', businessId)
  const [{ data: business, error: bizError }, { data: userRecord }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, google_place_id, google_access_token, google_refresh_token, google_account_id')
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
    const message = bizError?.message ?? 'Business not found'
    console.log('[Reviews] Business lookup failed:', message)
    return NextResponse.json({ error: message }, { status: 404 })
  }

  if (!business.google_access_token) {
    console.log('[Reviews] No Google access token saved')
    return NextResponse.json({ error: 'Google Business is not connected', fetched: 0, inserted: 0, source: 'none' })
  }

  const isPaid = userRecord?.subscription_status === 'active'
  const FREE_LIMIT = 5

  let accessToken = business.google_access_token
  let fetched

  try {
    fetched = await fetchAllReviews(accessToken)
  } catch (err) {
    if (err instanceof GoogleApiError && err.status === 401 && business.google_refresh_token) {
      try {
        accessToken = await callRefreshToken(business.google_refresh_token)
        const { error: tokenUpdateError } = await supabase
          .from('businesses')
          .update({ google_access_token: accessToken })
          .eq('id', businessId)
        if (tokenUpdateError) {
          console.log('[Reviews] Failed saving refreshed access token:', tokenUpdateError.message)
          return NextResponse.json({ error: tokenUpdateError.message }, { status: 500 })
        }
        fetched = await fetchAllReviews(accessToken)
      } catch (refreshErr) {
        const message = refreshErr instanceof Error
          ? refreshErr.message
          : 'Google token expired - please reconnect Google Business'
        console.log('[Reviews] Refresh/retry failed:', message)
        return NextResponse.json({ error: message, needsReconnect: true }, { status: 401 })
      }
    } else {
      const message = err instanceof Error ? err.message : 'Failed to fetch from Google Business Profile'
      const status = err instanceof GoogleApiError ? (err.status === 403 ? 403 : 502) : 502
      console.log('[Reviews] Google review fetch failed:', message)
      return NextResponse.json({ error: message }, { status })
    }
  }

  const rawReviews = fetched.reviews
  const limited = isPaid ? rawReviews : rawReviews.slice(0, FREE_LIMIT)
  console.log('[Reviews] Reviews fetched/limited:', rawReviews.length, limited.length)

  if (fetched.firstLocationPath || fetched.firstAccountName || fetched.firstBusinessTitle) {
    const updateData: Record<string, string> = {}
    if (fetched.firstLocationPath) updateData.google_place_id = fetched.firstLocationPath
    if (fetched.firstAccountName) updateData.google_account_id = fetched.firstAccountName
    if (fetched.firstBusinessTitle && (business.name === 'My Business' || !business.name)) {
      updateData.name = fetched.firstBusinessTitle
    }

    if (Object.keys(updateData).length > 0) {
      console.log('[Reviews] Saving discovered Google business metadata:', updateData)
      const { error: metadataError } = await supabase.from('businesses').update(updateData).eq('id', businessId)
      if (metadataError) {
        console.log('[Reviews] Failed saving Google business metadata:', metadataError.message)
        return NextResponse.json({ error: metadataError.message }, { status: 500 })
      }
    }
  }

  const syncedAt = new Date().toISOString()
  const toInsert = limited.map(r => ({
    business_id: businessId,
    google_review_id: r.name,
    reviewer_name: r.reviewer?.displayName ?? 'Google reviewer',
    reviewer_photo_url: r.reviewer?.profilePhotoUrl ?? null,
    rating: STAR_MAP[r.starRating ?? ''] ?? 3,
    text: r.comment ?? '',
    review_date: r.createTime ?? syncedAt,
    status: 'pending',
    synced_at: syncedAt,
  }))

  if (toInsert.length === 0) {
    console.log('[Reviews] No reviews returned from Google')
    return NextResponse.json({ fetched: 0, inserted: 0, source: 'google' })
  }

  console.log('[Reviews] Saving reviews to Supabase:', toInsert.length)
  const { data: inserted, error: insertError } = await supabase
    .from('reviews')
    .upsert(toInsert, { onConflict: 'business_id,google_review_id', ignoreDuplicates: true })
    .select('id')

  if (insertError) {
    console.log('[Reviews] Supabase insert error:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  console.log('[Reviews] Stored reviews in Supabase:', inserted?.length ?? 0)
  return NextResponse.json({
    fetched: limited.length,
    totalAvailable: rawReviews.length,
    inserted: inserted?.length ?? 0,
    source: 'google',
  })
}
