import { createClient } from '@/lib/supabase/server'
import {
  GoogleApiError,
  MANUAL_SYNC_COOLDOWN_MS,
  PERMISSIONS_ERROR_MESSAGE,
  RECONNECT_ERROR_MESSAGE,
  syncBusinessReviews,
  type GoogleBusinessRecord,
} from '@/lib/google-business'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Please sign in to sync reviews.' }, { status: 401 })
  }

  const { businessId } = await request.json().catch(() => ({})) as {
    businessId?: string
  }

  if (!businessId) {
    return NextResponse.json({ error: 'Business ID is required.' }, { status: 400 })
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select(`
      id,
      user_id,
      name,
      google_place_id,
      google_location_id,
      google_access_token,
      google_refresh_token,
      google_account_id,
      last_synced_at
    `)
    .eq('id', businessId)
    .eq('user_id', user.id)
    .single()

  if (businessError || !business) {
    return NextResponse.json({ error: 'We could not find that business.' }, { status: 404 })
  }

  if (!business.google_access_token) {
    return NextResponse.json({
      error: 'Google Business is not connected yet.',
      fetched: 0,
      inserted: 0,
      totalAvailable: 0,
      source: 'none',
    })
  }

  try {
    const result = await syncBusinessReviews({
      supabase,
      business: business as GoogleBusinessRecord,
      cooldownMs: MANUAL_SYNC_COOLDOWN_MS,
    })

    if (result.needsManualLocationId) {
      return NextResponse.json({
        ...result,
        error: 'Almost done! Enter your Google Business Profile URL to start fetching reviews.',
      })
    }

    if (result.source === 'google' && result.hasBusinessProfile === false) {
      return NextResponse.json({
        error: 'No Google Business Profile was found for this account.',
        fetched: 0,
        inserted: 0,
        totalAvailable: 0,
        source: 'google',
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof GoogleApiError) {
      if (err.status === 401) {
        return NextResponse.json({ error: RECONNECT_ERROR_MESSAGE, needsReconnect: true }, { status: 401 })
      }

      if (err.status === 403) {
        return NextResponse.json({ error: PERMISSIONS_ERROR_MESSAGE }, { status: 403 })
      }
    }

    const message = err instanceof Error
      ? err.message
      : 'We could not refresh your reviews right now.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
