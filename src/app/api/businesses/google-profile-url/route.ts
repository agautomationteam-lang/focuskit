import { createClient } from '@/lib/supabase/server'
import {
  extractLocationIdFromBusinessUrl,
  MANUAL_SYNC_COOLDOWN_MS,
  syncBusinessReviews,
  type GoogleBusinessRecord,
} from '@/lib/google-business'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  const { businessId, profileUrl } = await request.json().catch(() => ({})) as {
    businessId?: string
    profileUrl?: string
  }

  if (!businessId || !profileUrl) {
    return NextResponse.json({ error: 'Business and profile URL are required.' }, { status: 400 })
  }

  const locationId = extractLocationIdFromBusinessUrl(profileUrl)
  if (!locationId) {
    return NextResponse.json({
      error: 'Enter a Google Business Profile URL in the format https://business.google.com/dashboard/l/XXXXX',
    }, { status: 400 })
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

  const locationPath = `accounts/-/locations/${locationId}`
  const { error: updateError } = await supabase
    .from('businesses')
    .update({
      google_location_id: locationId,
      google_place_id: locationPath,
      last_synced_at: null,
    })
    .eq('id', business.id)

  if (updateError) {
    return NextResponse.json({ error: 'We could not save your Google Business URL.' }, { status: 500 })
  }

  if (!business.google_access_token) {
    return NextResponse.json({
      connected: true,
      locationId,
      message: 'Google Business URL saved.',
    })
  }

  try {
    const syncResult = await syncBusinessReviews({
      supabase,
      business: {
        ...(business as GoogleBusinessRecord),
        google_location_id: locationId,
        google_place_id: locationPath,
      },
      forceGoogle: true,
      cooldownMs: MANUAL_SYNC_COOLDOWN_MS,
    })

    return NextResponse.json({
      connected: true,
      locationId,
      ...syncResult,
    })
  } catch {
    return NextResponse.json({
      connected: true,
      locationId,
      message: 'Google Business URL saved. We will fetch reviews on your next refresh.',
    })
  }
}
