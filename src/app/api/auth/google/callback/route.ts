import { createAdminClient } from '@/lib/supabase/admin'
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

  const successUrl = `${origin}/dashboard?tab=reviews&google_connected=1`

  console.log('[Google OAuth] Callback started')

  if (oauthError === 'access_denied') {
    const message = oauthDescription ?? 'Google access denied'
    console.log('[Google OAuth] Access denied:', message)
    return NextResponse.redirect(`${origin}/dashboard?tab=home&google_blocked=1&google_error_message=${encodeURIComponent(message)}`)
  }

  if (oauthError || !code || !state) {
    const message = oauthDescription ?? oauthError ?? 'Missing Google authorization code or state'
    console.log('[Google OAuth] Callback missing required params:', message)
    return NextResponse.redirect(dashboardError(origin, message))
  }

  let decoded: { uid: string; ts: number }
  try {
    decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    if (!decoded.uid || Date.now() - decoded.ts > 15 * 60 * 1000) {
      throw new Error('Invalid or expired OAuth state')
    }
    console.log('[Google OAuth] State validated for user:', decoded.uid)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid OAuth state'
    console.log('[Google OAuth] State validation failed:', message)
    return NextResponse.redirect(dashboardError(origin, message))
  }

  const redirectUri = 'https://project-kpmkq.vercel.app/api/auth/google/callback'

  console.log('[Google OAuth] Exchanging authorization code for tokens')
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
    console.log('[Google OAuth] Token exchange failed:', tokenRes.status, tokenText)
    return NextResponse.redirect(dashboardError(origin, `Google token exchange failed: ${tokenText}`))
  }

  let tokens: { access_token?: string; refresh_token?: string }
  try {
    tokens = JSON.parse(tokenText) as { access_token?: string; refresh_token?: string }
  } catch {
    console.log('[Google OAuth] Token response was not JSON:', tokenText)
    return NextResponse.redirect(dashboardError(origin, `Invalid Google token response: ${tokenText}`))
  }

  const { access_token, refresh_token } = tokens
  if (!access_token) {
    console.log('[Google OAuth] No access token in token response:', tokenText)
    return NextResponse.redirect(dashboardError(origin, `Google did not return an access token: ${tokenText}`))
  }

  console.log('[Google OAuth] Token exchange succeeded. Refresh token returned:', Boolean(refresh_token))

  const supabase = createAdminClient()
  console.log('[Google OAuth] Loading business for user:', decoded.uid)

  let { data: biz, error: bizLoadError } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', decoded.uid)
    .maybeSingle()

  if (bizLoadError) {
    console.log('[Google OAuth] Failed to load business:', bizLoadError.message)
    return NextResponse.redirect(dashboardError(origin, bizLoadError.message))
  }

  if (!biz) {
    console.log('[Google OAuth] Creating business row for user:', decoded.uid)
    const { data: newBiz, error: createError } = await supabase
      .from('businesses')
      .insert({
        user_id: decoded.uid,
        name: 'My Business',
        tone: 'professional',
        auto_reply_enabled: false,
      })
      .select('id, name')
      .single()

    if (createError || !newBiz) {
      const message = createError?.message ?? 'Failed to create business row'
      console.log('[Google OAuth] Business create failed:', message)
      return NextResponse.redirect(dashboardError(origin, message))
    }

    biz = newBiz
  }

  const updateData: Record<string, string | null> = {
    google_access_token: access_token,
    google_refresh_token: refresh_token ?? null,
  }
  if (!refresh_token) delete updateData.google_refresh_token

  console.log('[Google OAuth] Saving Google tokens to business:', biz.id)
  const { error: updateError } = await supabase
    .from('businesses')
    .update(updateData)
    .eq('id', biz.id)

  if (updateError) {
    console.log('[Google OAuth] Failed saving tokens:', updateError.message)
    return NextResponse.redirect(dashboardError(origin, updateError.message))
  }

  console.log('[Google OAuth] Tokens saved. Redirecting to dashboard:', successUrl)
  return NextResponse.redirect(successUrl)
}
