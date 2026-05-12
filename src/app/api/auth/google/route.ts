import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', '/api/auth/google')
    return NextResponse.redirect(loginUrl)
  }

  const redirectUri = 'https://project-kpmkq.vercel.app/api/auth/google/callback'

  const state = Buffer.from(
    JSON.stringify({ uid: user.id, ts: Date.now() })
  ).toString('base64url')

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage https://www.googleapis.com/auth/plus.business.manage',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

  return NextResponse.redirect(oauthUrl)
}
