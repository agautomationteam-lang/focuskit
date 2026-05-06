import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface PendingReview {
  reviewer: string
  rating: number
  text: string | null
  recommendedResponse: string
  actionUrl: string
}

export function buildDigestEmail(params: {
  businessName: string
  newReviewCount: number
  pendingCount: number
  postedCount: number
  pendingReviews: PendingReview[]
  appUrl: string
}): { subject: string; html: string } {
  const stars = (n: number) =>
    `<span style="color:#f59e0b;letter-spacing:1px;">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`

  const reviewCards = params.pendingReviews
    .map(
      (r) => `
  <tr>
    <td style="padding:0 0 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px 12px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>${stars(r.rating)}</td>
                <td align="right" style="font-size:13px;color:#6b7280;">${escHtml(r.reviewer)}</td>
              </tr>
            </table>
            ${
              r.text
                ? `<p style="margin:10px 0 0;font-size:14px;color:#374151;line-height:1.55;">${escHtml(r.text.slice(0, 200))}${r.text.length > 200 ? '…' : ''}</p>`
                : `<p style="margin:10px 0 0;font-size:13px;color:#9ca3af;font-style:italic;">(rating only — no written review)</p>`
            }
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 14px;">
            <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#6366f1;margin:0 0 6px;">&#10022; Recommended reply</p>
            <p style="margin:0;font-size:14px;color:#1f2937;line-height:1.6;background:#f8fafc;border-left:3px solid #6366f1;padding:10px 14px;border-radius:4px;">${escHtml(r.recommendedResponse)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 18px;">
            <a href="${r.actionUrl}"
               style="display:block;background:#16a34a;color:#fff;text-decoration:none;text-align:center;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:.2px;">
              Approve &amp; Publish in 1 click →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
    )
    .join('')

  const noActionNote =
    params.pendingReviews.length === 0 && params.pendingCount === 0
      ? `<tr><td style="padding:12px 0 20px;font-size:14px;color:#6b7280;text-align:center;">No pending reviews right now. All caught up.</td></tr>`
      : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Weekly Review Digest</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 20px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#111827;">ReplyKit</p>
              <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">Weekly digest · ${params.businessName}</p>
            </td>
          </tr>

          <!-- Stats bar -->
          <tr>
            <td style="padding:0 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align:center;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 8px;">
                    <div style="font-size:26px;font-weight:700;color:#111827;">${params.newReviewCount}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">New reviews</div>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="text-align:center;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 8px;">
                    <div style="font-size:26px;font-weight:700;color:#d97706;">${params.pendingCount}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">Need a reply</div>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="text-align:center;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 8px;">
                    <div style="font-size:26px;font-weight:700;color:#16a34a;">${params.postedCount}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">Replies posted</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Review cards or empty note -->
          ${
            params.pendingReviews.length > 0
              ? `<tr><td style="padding:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Pending replies</td></tr>
                 <tr><td><table width="100%" cellpadding="0" cellspacing="0">${reviewCards}</table></td></tr>`
              : `<tr><td><table width="100%" cellpadding="0" cellspacing="0">${noActionNote}</table></td></tr>`
          }

          <!-- Dashboard link -->
          <tr>
            <td style="padding:8px 0 0;text-align:center;">
              <a href="${params.appUrl}/dashboard"
                 style="font-size:13px;color:#6366f1;text-decoration:underline;">
                Open dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;font-size:12px;color:#9ca3af;">
              ReplyKit · You're receiving this because you signed up for weekly digests.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const n = params.pendingCount
  const subject =
    n > 0
      ? `${n} review${n !== 1 ? 's' : ''} waiting — reply in 1 click`
      : params.newReviewCount > 0
        ? `${params.newReviewCount} new review${params.newReviewCount !== 1 ? 's' : ''} this week — ${params.businessName}`
        : `All caught up this week — ${params.businessName}`

  return { subject, html }
}
