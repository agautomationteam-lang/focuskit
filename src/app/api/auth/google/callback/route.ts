import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')
  const origin = url.origin

  const successUrl   = `${origin}/dashboard?tab=reviews&google_connected=1`
  const errorUrl     = `${origin}/dashboard?tab=home&google_error=1`
  const noBusinessUrl = `${origin}/dashboard?tab=home&google_no_business=1`

  if (oauthError === 'access_denied') {
    return NextResponse.redirect(`${origin}/dashboard?tab=home&google_blocked=1`)
  }

  if (oauthError || !code || !state) {
    return NextResponse.redirect(errorUrl)
  }

  // Validate state
  let decoded: { uid: string; ts: number }
  try {
    decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    if (!decoded.uid || Date.now() - decoded.ts > 15 * 60 * 1000) {
      throw new Error('invalid')
    }
  } catch {
    return NextResponse.redirect(errorUrl)
  }

  const redirectUri = `${origin}/api/auth/google/callback`

  // Exchange code for tokens
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

  if (!tokenRes.ok) return NextResponse.redirect(errorUrl)

  const { access_token, refresh_token } = await tokenRes.json() as {
    access_token?: string
    refresh_token?: string
  }

  if (!access_token) return NextResponse.redirect(errorUrl)

  const supabase = createAdminClient()

  // Get or create business for this user
  let { data: biz } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', decoded.uid)
    .maybeSingle()

  if (!biz) {
    const { data: newBiz } = await supabase
      .from('businesses')
      .insert({
        user_id: decoded.uid,
        name: 'My Business',
        tone: 'professional',
        auto_reply_enabled: false,
      })
      .select('id, name')
      .single()
    biz = newBiz
  }

  if (!biz) return NextResponse.redirect(errorUrl)

  // Fetch GBP accounts list
  let locationPath = ''
  let accountName = ''
  let businessTitle = ''

  const accountsRes = await fetch('https://mybusinessaccounts.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  console.log('[Google OAuth] Fetching accounts...')
  if (accountsRes.ok) {
    const { accounts } = await accountsRes.json() as {
      accounts?: Array<{ name: string; accountName?: string }>
    }

    if (accounts && accounts.length > 0) {
      accountName = accounts[0].name // "accounts/123456789"
      const accId = accountName.replace('accounts/', '')
      console.log(`[Google OAuth] Found account: ${accountName}`)

      console.log('[Google OAuth] Fetching locations...')
      const locRes = await fetch(
        `https://mybusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      )

      if (locRes.ok) {
        const { locations } = await locRes.json() as {
          locations?: Array<{ name: string; title?: string }>
        }
        if (locations && locations.length > 0) {
          const loc = locations[0]
          businessTitle = loc.title ?? ''
          const locId = loc.name.replace('locations/', '')
          locationPath = `accounts/${accId}/locations/${locId}`
          console.log(`[Google OAuth] Found location: ${locationPath} (${businessTitle})`)
        } else {
          console.log('[Google OAuth] No locations found for this account')
        }
      } else {
        console.log(`[Google OAuth] Locations fetch failed: ${locRes.status}`)
      }
    } else {
      console.log('[Google OAuth] No accounts found')
    }
  } else {
    console.log(`[Google OAuth] Accounts fetch failed: ${accountsRes.status}`)
  }

  // Persist tokens and location to business record
  const updateData: Record<string, string | null> = {
    google_access_token: access_token,
  }
  if (refresh_token) updateData.google_refresh_token = refresh_token
  if (locationPath) updateData.google_place_id = locationPath
  if (accountName) updateData.google_account_id = accountName
  if (businessTitle && (biz.name === 'My Business' || !biz.name)) {
    updateData.name = businessTitle
  }

  await supabase.from('businesses').update(updateData).eq('id', biz.id)

  // No Business Profile listing found under this Google account
  if (!locationPath) return NextResponse.redirect(noBusinessUrl)

  return NextResponse.redirect(successUrl)
}
