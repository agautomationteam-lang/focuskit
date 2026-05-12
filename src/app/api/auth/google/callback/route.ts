import { createAdminClient } from '@/lib/supabase/admin'
import { syncBusinessReviews, type GoogleBusinessRecord } from '@/lib/google-business'
import { NextResponse } from 'next/server'

function dashboardError(origin: string, message: string) {
  const url = new URL('/dashboard', origin)
  url.searchParams.set('tab', 'home')
  url.searchParams.set('google_error', '1')
  url.searchParams.set('google_error_message', message)
  return url
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')
  const oauthDescription = url.searchParams.get('error_description')
  const origin = url.origin

  if (oauthError === 'access_denied') {
    const message = oauthDescription ?? 'Google access was denied.'
    return NextResponse.redirect(`${origin}/dashboard?tab=home&google_blocked=1&google_error_message=${encodeURIComponent(message)}`)
  }

  if (oauthError || !code || !state) {
    const message = oauthDescription ?? 'Google sign-in did not finish correctly.'
    return NextResponse.redirect(dashboardError(origin, message))
  }

  let decoded: { uid: string; ts: number }
  try {
    decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    if (!decoded.uid || Date.now() - decoded.ts > 15 * 60 * 1000) {
      throw new Error('That Google sign-in link expired. Please try again.')
    }
  } catch {
    return NextResponse.redirect(dashboardError(origin, 'That Google sign-in link expired. Please try again.'))
  }

  const redirectUri = 'https://project-kpmkq.vercel.app/api/auth/google/callback'

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokenText = await tokenRes.text()
  if (!tokenRes.ok) {
    return NextResponse.redirect(dashboardError(origin, 'Google sign-in could not be completed. Please try again.'))
  }

  let tokens: { access_token?: string; refresh_token?: string }
  try {
    tokens = JSON.parse(tokenText) as { access_token?: string; refresh_token?: string }
  } catch {
    return NextResponse.redirect(dashboardError(origin, 'Google sign-in returned an unexpected response.'))
  }

  const { access_token, refresh_token } = tokens
  if (!access_token) {
    return NextResponse.redirect(dashboardError(origin, 'Google did not return an access token. Please try again.'))
  }

  const supabase = createAdminClient()

  let { data: business, error: businessLoadError } = await supabase
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
    .eq('user_id', decoded.uid)
    .maybeSingle()

  if (businessLoadError) {
    return NextResponse.redirect(dashboardError(origin, 'We could not load your business profile.'))
  }

  if (!business) {
    const { data: createdBusiness, error: createError } = await supabase
      .from('businesses')
      .insert({
        user_id: decoded.uid,
        name: 'My Business',
        tone: 'professional',
        auto_reply_enabled: false,
      })
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
      .single()

    if (createError || !createdBusiness) {
      return NextResponse.redirect(dashboardError(origin, 'We could not finish setting up your business.'))
    }

    business = createdBusiness
  }

  const updateData: Record<string, string | null> = {
    google_access_token: access_token,
    google_refresh_token: refresh_token ?? null,
  }
  if (!refresh_token) delete updateData.google_refresh_token

  const { error: tokenSaveError } = await supabase
    .from('businesses')
    .update(updateData)
    .eq('id', business.id)

  if (tokenSaveError) {
    return NextResponse.redirect(dashboardError(origin, 'We could not save your Google connection.'))
  }

  const syncedBusiness: GoogleBusinessRecord = {
    ...(business as GoogleBusinessRecord),
    google_access_token: access_token,
    google_refresh_token: refresh_token ?? business.google_refresh_token ?? null,
  }

  try {
    const syncResult = await syncBusinessReviews({
      supabase,
      business: syncedBusiness,
      forceGoogle: true,
      cooldownMs: 5 * 60 * 1000,
    })

    if (syncResult.hasBusinessProfile === false) {
      return NextResponse.redirect(`${origin}/dashboard?tab=reviews&google_no_business=1`)
    }
  } catch {
    return NextResponse.redirect(`${origin}/dashboard?tab=reviews&google_connected=1&google_sync_delayed=1`)
  }

  return NextResponse.redirect(`${origin}/dashboard?tab=reviews&google_connected=1`)
}
