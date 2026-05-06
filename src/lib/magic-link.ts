import { createHmac, timingSafeEqual } from 'crypto'

const secret = () => {
  const s = process.env.MAGIC_LINK_SECRET
  if (!s) throw new Error('MAGIC_LINK_SECRET is not set')
  return s
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days — matches weekly digest

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

export function createMagicLink(responseId: string, appUrl: string): string {
  const expires = Date.now() + TTL_MS
  const sig = sign(`${responseId}:${expires}`)
  const token = Buffer.from(JSON.stringify({ responseId, expires, sig })).toString('base64url')
  return `${appUrl}/api/email/action?token=${token}`
}

export function verifyMagicLink(token: string): { responseId: string } | null {
  try {
    const { responseId, expires, sig } = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf8')
    )

    if (typeof responseId !== 'string' || typeof expires !== 'number' || typeof sig !== 'string') {
      return null
    }

    if (Date.now() > expires) return null

    const expected = sign(`${responseId}:${expires}`)
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null

    return { responseId }
  } catch {
    return null
  }
}
