import type { SupabaseClient } from '@supabase/supabase-js'

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

export const MANUAL_SYNC_COOLDOWN_MS = 5 * 60 * 1000
export const BACKGROUND_SYNC_INTERVAL_MS = 30 * 60 * 1000
export const QUOTA_FALLBACK_MESSAGE = 'Reviews synced recently. Showing latest saved reviews.'
export const PERMISSIONS_ERROR_MESSAGE = 'Missing API permissions - contact agautomationteam@gmail.com'
export const RECONNECT_ERROR_MESSAGE = 'Google token expired - please reconnect Google Business'

interface GBPAccount {
  name: string
}

interface GBPLocation {
  name: string
  title?: string
}

interface GBPReview {
  name: string
  reviewer?: { displayName?: string; profilePhotoUrl?: string }
  starRating?: string
  comment?: string
  createTime?: string
}

interface GBPAccountsResponse {
  accounts?: GBPAccount[]
}

export interface GoogleBusinessRecord {
  id: string
  user_id?: string
  name: string
  google_place_id: string | null
  google_location_id?: string | null
  google_access_token: string | null
  google_refresh_token: string | null
  google_account_id: string | null
  last_synced_at?: string | null
}

export interface SyncBusinessReviewsResult {
  source: 'google' | 'cache' | 'none'
  fetched: number
  inserted: number
  totalAvailable: number
  message?: string
  nextSyncAt?: string
  lastSyncedAt?: string
  hasBusinessProfile?: boolean
  needsReconnect?: boolean
  needsManualLocationId?: boolean
}

export class GoogleApiError extends Error {
  status: number
  details?: string

  constructor(status: number, message: string, details?: string) {
    super(message)
    this.status = status
    this.details = details
  }
}

function parseGoogleError(status: number, body: string) {
  if (status === 401) return RECONNECT_ERROR_MESSAGE
  if (status === 403 && /quota|rate limit|resource.?exhausted/i.test(body)) {
    return QUOTA_FALLBACK_MESSAGE
  }
  if (status === 403) return PERMISSIONS_ERROR_MESSAGE

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string }
    return parsed.error?.message ?? parsed.message ?? body
  } catch {
    return body || `Google API error ${status}`
  }
}

function isQuotaError(status: number, message: string, details?: string) {
  const haystack = `${message} ${details ?? ''}`
  return status === 429 || /quota|rate limit|resource.?exhausted/i.test(haystack)
}

async function googleGet<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = await res.text()

  if (!res.ok) {
    throw new GoogleApiError(res.status, parseGoogleError(res.status, body), body)
  }

  return JSON.parse(body) as T
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
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
  if (!res.ok) {
    throw new GoogleApiError(res.status, parseGoogleError(res.status, body), body)
  }

  const data = JSON.parse(body) as { access_token?: string }
  if (!data.access_token) {
    throw new GoogleApiError(401, RECONNECT_ERROR_MESSAGE, body)
  }

  return data.access_token
}

async function fetchAllReviewsFromGoogle(accessToken: string) {
  const accountsData = await googleGet<GBPAccountsResponse>(
    'https://mybusinessbusinessinformation.googleapis.com/v1/accounts',
    accessToken,
  )

  const accounts = accountsData.accounts ?? []
  const reviews: GBPReview[] = []
  let firstLocationPath = ''
  let firstAccountName = ''
  let firstBusinessTitle = ''
  let locationCount = 0

  for (const account of accounts) {
    const accountName = account.name
    const locationsData = await googleGet<{ locations?: GBPLocation[] }>(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress`,
      accessToken,
    )

    const locations = locationsData.locations ?? []
    locationCount += locations.length

    for (const location of locations) {
      const locationName = location.name.startsWith('accounts/')
        ? location.name
        : `${accountName}/${location.name}`

      if (!firstLocationPath) {
        firstLocationPath = locationName
        firstAccountName = accountName
        firstBusinessTitle = location.title ?? ''
      }

      const reviewsData = await googleGet<{ reviews?: GBPReview[] }>(
        `https://mybusiness.googleapis.com/v4/${locationName}/reviews`,
        accessToken,
      )

      reviews.push(...(reviewsData.reviews ?? []))
    }
  }

  return {
    reviews,
    firstLocationPath,
    firstAccountName,
    firstBusinessTitle,
    hasBusinessProfile: locationCount > 0,
  }
}

function normalizeLocationPath(location: string) {
  return location.startsWith('accounts/')
    ? location
    : `accounts/-/locations/${location}`
}

async function fetchReviewsForManualLocationId(accessToken: string, locationId: string) {
  const locationPath = normalizeLocationPath(locationId)
  const reviewsData = await googleGet<{ reviews?: GBPReview[] }>(
    `https://mybusiness.googleapis.com/v4/${locationPath}/reviews`,
    accessToken,
  )

  return {
    reviews: reviewsData.reviews ?? [],
    firstLocationPath: locationPath,
    firstAccountName: locationPath.split('/locations/')[0],
    firstBusinessTitle: '',
    hasBusinessProfile: true,
  }
}

export function extractLocationIdFromBusinessUrl(input: string) {
  const trimmed = input.trim()
  const match = trimmed.match(/\/dashboard\/l\/([^/?#]+)/i)
  return match?.[1] ?? null
}

async function countSavedReviews(
  supabase: SupabaseClient,
  businessId: string,
) {
  const { count } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .not('google_review_id', 'like', 'stub_%')

  return count ?? 0
}

export async function syncBusinessReviews({
  supabase,
  business,
  forceGoogle = false,
  cooldownMs = MANUAL_SYNC_COOLDOWN_MS,
}: {
  supabase: SupabaseClient
  business: GoogleBusinessRecord
  forceGoogle?: boolean
  cooldownMs?: number
}): Promise<SyncBusinessReviewsResult> {
  if (!business.google_access_token) {
    return { source: 'none', fetched: 0, inserted: 0, totalAvailable: 0 }
  }

  const lastSynced = business.last_synced_at ? new Date(business.last_synced_at) : null
  const nextSyncAt = lastSynced ? new Date(lastSynced.getTime() + cooldownMs) : null

  if (!forceGoogle && nextSyncAt && nextSyncAt.getTime() > Date.now()) {
    const totalSaved = await countSavedReviews(supabase, business.id)
    return {
      source: 'cache',
      fetched: totalSaved,
      inserted: 0,
      totalAvailable: totalSaved,
      message: QUOTA_FALLBACK_MESSAGE,
      nextSyncAt: nextSyncAt.toISOString(),
      lastSyncedAt: lastSynced?.toISOString(),
    }
  }

  let accessToken = business.google_access_token
  let googleData

  try {
    googleData = business.google_location_id
      ? await fetchReviewsForManualLocationId(accessToken, business.google_location_id)
      : await fetchAllReviewsFromGoogle(accessToken)
  } catch (err) {
    if (err instanceof GoogleApiError && err.status === 401 && business.google_refresh_token) {
      accessToken = await refreshGoogleAccessToken(business.google_refresh_token)
      const { error: tokenUpdateError } = await supabase
        .from('businesses')
        .update({ google_access_token: accessToken })
        .eq('id', business.id)

      if (tokenUpdateError) {
        throw new GoogleApiError(500, 'Could not update your Google connection.')
      }

      googleData = business.google_location_id
        ? await fetchReviewsForManualLocationId(accessToken, business.google_location_id)
        : await fetchAllReviewsFromGoogle(accessToken)
    } else if (err instanceof GoogleApiError && isQuotaError(err.status, err.message, err.details)) {
      const totalSaved = await countSavedReviews(supabase, business.id)
      return {
        source: 'cache',
        fetched: totalSaved,
        inserted: 0,
        totalAvailable: totalSaved,
        message: QUOTA_FALLBACK_MESSAGE,
        nextSyncAt: (nextSyncAt ?? new Date(Date.now() + cooldownMs)).toISOString(),
        lastSyncedAt: lastSynced?.toISOString(),
      }
    } else if (!business.google_location_id && err instanceof GoogleApiError) {
      const totalSaved = await countSavedReviews(supabase, business.id)
      return {
        source: totalSaved > 0 ? 'cache' : 'none',
        fetched: totalSaved,
        inserted: 0,
        totalAvailable: totalSaved,
        hasBusinessProfile: false,
        needsManualLocationId: true,
        message: totalSaved > 0 ? QUOTA_FALLBACK_MESSAGE : undefined,
      }
    } else {
      throw err
    }
  }

  const syncedAt = new Date().toISOString()
  if (!business.google_location_id && googleData.hasBusinessProfile === false) {
    const totalSaved = await countSavedReviews(supabase, business.id)
    return {
      source: totalSaved > 0 ? 'cache' : 'none',
      fetched: totalSaved,
      inserted: 0,
      totalAvailable: totalSaved,
      hasBusinessProfile: false,
      needsManualLocationId: true,
    }
  }

  const toUpsert = googleData.reviews.map(review => ({
    business_id: business.id,
    google_review_id: review.name,
    reviewer_name: review.reviewer?.displayName ?? 'Google reviewer',
    reviewer_photo_url: review.reviewer?.profilePhotoUrl ?? null,
    rating: STAR_MAP[review.starRating ?? ''] ?? 3,
    text: review.comment ?? '',
    review_date: review.createTime ?? syncedAt,
    status: 'pending',
    synced_at: syncedAt,
  }))

  let insertedCount = 0
  if (toUpsert.length > 0) {
    const { data: inserted, error: upsertError } = await supabase
      .from('reviews')
      .upsert(toUpsert, { onConflict: 'business_id,google_review_id' })
      .select('id')

    if (upsertError) {
      throw new GoogleApiError(500, 'Could not save your latest Google reviews.')
    }

    insertedCount = inserted?.length ?? 0
  }

  const businessUpdate: Record<string, string | null> = {
    last_synced_at: syncedAt,
    google_account_id: googleData.firstAccountName || business.google_account_id || null,
    google_location_id: googleData.firstLocationPath || business.google_location_id || null,
    google_place_id: googleData.firstLocationPath || business.google_place_id || null,
  }

  if (googleData.firstBusinessTitle && (business.name === 'My Business' || !business.name)) {
    businessUpdate.name = googleData.firstBusinessTitle
  }

  const { error: businessUpdateError } = await supabase
    .from('businesses')
    .update(businessUpdate)
    .eq('id', business.id)

  if (businessUpdateError) {
    throw new GoogleApiError(500, 'Could not save your Google Business details.')
  }

  const totalSaved = await countSavedReviews(supabase, business.id)

  return {
    source: 'google',
    fetched: googleData.reviews.length,
    inserted: insertedCount,
    totalAvailable: totalSaved,
    lastSyncedAt: syncedAt,
    nextSyncAt: new Date(Date.now() + cooldownMs).toISOString(),
    hasBusinessProfile: googleData.hasBusinessProfile,
  }
}
