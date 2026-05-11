import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const callback = readFileSync('src/app/api/auth/google/callback/route.ts', 'utf8')

assert.match(
  callback,
  /https:\/\/mybusinessaccountmanagement\.googleapis\.com\/v1\/accounts/,
  'Google account lookup must use the Business Profile Account Management API host',
)

assert.match(
  callback,
  /https:\/\/mybusinessbusinessinformation\.googleapis\.com\/v1/,
  'Location lookup must use the Business Profile Business Information API host',
)

assert.match(
  callback,
  /\$\{GOOGLE_BUSINESS_INFORMATION_URL\}\/\$\{accountName\}\/locations\?readMask=name,title/,
  'Location lookup must request locations for the selected account with a readMask',
)

assert.doesNotMatch(
  callback,
  /mybusinessaccounts\.googleapis\.com|mybusinessinformation\.googleapis\.com/,
  'Callback must not use obsolete Google Business Profile hostnames',
)

assert.match(
  callback,
  /for \(const account of accounts\)/,
  'Callback must scan all accessible Google Business Profile accounts for a location',
)

assert.match(
  callback,
  /normalizeLocationPath\(accountName, loc\.name\)/,
  'Callback must normalize the location resource path before saving it for reviews',
)

console.log('Google OAuth endpoint checks passed')
