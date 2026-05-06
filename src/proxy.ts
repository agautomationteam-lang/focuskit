import { NextResponse, type NextRequest } from 'next/server'

// Demo mode: no auth required — all routes are open.
export async function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/upgrade',
    '/login',
    '/signup',
    '/api/responses/generate',
    '/api/reviews/fetch',
  ],
}
