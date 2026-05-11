import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const auth = readFileSync('src/app/api/auth/google/route.ts', 'utf8')
const callback = readFileSync('src/app/api/auth/google/callback/route.ts', 'utf8')
const fetchReviews = readFileSync('src/app/api/reviews/fetch/route.ts', 'utf8')
const filesToScan = [
  'src/app/page.tsx',
  'src/app/billing/page.tsx',
  'src/app/upgrade/page.tsx',
  'src/app/onboarding/page.tsx',
  'src/app/dashboard/_components/ReviewList.tsx',
  'src/app/dashboard/_components/HomeView.tsx',
  'src/app/contact/page.tsx',
  'src/app/api/email/digest/route.ts',
  'src/lib/jobs/handlers.ts',
]

assert.match(
  auth,
  /https:\/\/www\.googleapis\.com\/auth\/business\.manage https:\/\/www\.googleapis\.com\/auth\/plus\.business\.manage/,
  'Google OAuth must request both Business Profile scopes',
)

assert.match(
  auth,
  /https:\/\/project-kpmkq\.vercel\.app\/api\/auth\/google\/callback/,
  'Google OAuth redirect_uri must exactly match production callback URL',
)

assert.match(
  auth,
  /console\.log\('\[Google OAuth\] URL:', oauthUrl\)/,
  'Google OAuth route must log the full generated OAuth URL',
)

assert.match(
  callback,
  /google_access_token: access_token/,
  'OAuth callback must save access token to businesses.google_access_token',
)

assert.match(
  callback,
  /google_refresh_token: refresh_token/,
  'OAuth callback must save refresh token to businesses.google_refresh_token',
)

assert.match(
  fetchReviews,
  /https:\/\/mybusinessaccounts\.googleapis\.com\/v1\/accounts/,
  'Review fetch must call requested accounts endpoint',
)

assert.match(
  fetchReviews,
  /https:\/\/mybusiness\.googleapis\.com\/v1\/accounts\/\$\{accountId\}\/locations/,
  'Review fetch must call requested account locations endpoint',
)

assert.match(
  fetchReviews,
  /https:\/\/mybusiness\.googleapis\.com\/v1\/accounts\/\$\{accountId\}\/locations\/\$\{locationId\}\/reviews/,
  'Review fetch must call requested location reviews endpoint',
)

assert.match(
  fetchReviews,
  /Google Business Profile API not enabled\. Please contact agautomationteam@gmail\.com/,
  'Review fetch must return the required 403 API-not-enabled message',
)

for (const file of filesToScan) {
  const text = readFileSync(file, 'utf8')
  assert.doesNotMatch(
    text,
    /support@replykit\.com|support@replykit\.app|digest@replykit\.co/,
    `${file} must not contain placeholder company email addresses`,
  )
}

assert.match(readFileSync('src/app/page.tsx', 'utf8'), /'25 FREE AI replies included'/)
assert.match(readFileSync('src/app/billing/page.tsx', 'utf8'), /'25 FREE AI replies included'/)
assert.match(readFileSync('src/app/upgrade/page.tsx', 'utf8'), /'25 FREE AI replies included'/)

console.log('Google OAuth endpoint checks passed')
