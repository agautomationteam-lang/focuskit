'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { pickTemplate } from './demoData'

interface ResponseData {
  id: string
  draft_professional: string
  draft_friendly: string
  selected_draft: string | null
  final_text: string | null
  status: string
}

interface ReviewData {
  id: string
  reviewer_name: string
  rating: number
  text: string | null
  review_date: string
  status: string
  responses: ResponseData[]
}

interface Props {
  review: ReviewData
  demo?: boolean
  onPublish?: (reviewId: string, finalText: string) => void
  onAddToast?: (msg: string, type: 'success' | 'info' | 'alert') => void
}

const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444']
const SWIPE_THRESHOLD    = 80
const VELOCITY_THRESHOLD = 400

function ReviewerAvatar({ name }: { name: string }) {
  const idx      = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const color    = AVATAR_COLORS[idx % AVATAR_COLORS.length]
  const initials = name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
  return (
    <span
      className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold text-white"
      style={{ background: color }}
    >
      {initials}
    </span>
  )
}

function getReplyTime(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return (1.4 + (hash % 28) / 10).toFixed(1)
}

function StarRating({ n, urgent }: { n: number; urgent: boolean }) {
  return (
    <span className="tracking-tight text-sm">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < n ? (urgent ? 'text-red-400' : 'text-amber-400') : 'text-slate-600'}>★</span>
      ))}
    </span>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 2)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 30)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

async function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'medium') {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    const s = style === 'light' ? ImpactStyle.Light : style === 'heavy' ? ImpactStyle.Heavy : ImpactStyle.Medium
    await Haptics.impact({ style: s })
  } catch { /* not in Capacitor webview */ }
}

async function triggerNotificationVibrate() {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Warning })
  } catch { /* not in Capacitor webview */ }
}

export default function ReviewCard({ review, demo = false, onPublish, onAddToast }: Props) {
  const resp        = review.responses?.[0] ?? null
  const recommended: 'professional' | 'friendly' = review.rating >= 4 ? 'friendly' : 'professional'

  const initialDraft = ((): 'professional' | 'friendly' => {
    if (resp?.selected_draft === 'professional' || resp?.selected_draft === 'friendly') return resp.selected_draft
    return recommended
  })()

  const initialText = resp?.final_text ?? (resp ? (initialDraft === 'professional' ? resp.draft_professional : resp.draft_friendly) : '')

  const [selectedDraft, setSelectedDraft] = useState<'professional' | 'friendly'>(initialDraft)
  const [editedText, setEditedText]       = useState(initialText)
  const [reviewStatus, setReviewStatus]   = useState(review.status)
  const [responseData, setResponseData]   = useState(resp)
  const [loading, setLoading]             = useState<string | null>(null)
  const [error, setError]                 = useState<string | null>(null)
  const [variantIndex, setVariantIndex]   = useState(2)
  const [reposted, setReposted]           = useState(false)
  const [dismissed, setDismissed]         = useState(false)

  // ── Framer-motion values (driven by touch, zero re-renders during swipe) ─
  const x              = useMotionValue(0)
  const rotate         = useTransform(x, [-140, 0, 140], [-4, 0, 4])
  const approveOpacity = useTransform(x, [30, SWIPE_THRESHOLD], [0, 1])
  const skipOpacity    = useTransform(x, [-SWIPE_THRESHOLD, -30], [1, 0])

  const isPosted   = reviewStatus === 'posted'
  const isApproved = reviewStatus === 'approved'
  const isDisabled = loading !== null
  const isUrgent   = review.rating <= 2 && reviewStatus === 'pending'
  const isOnRec    = selectedDraft === recommended

  // Haptic pulse for urgent 1-2★ cards on mount
  useEffect(() => {
    if (isUrgent) void triggerNotificationVibrate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Swipe end logic (kept in a ref so DOM handler always reads fresh state)
  const cardRef    = useRef<HTMLDivElement>(null)
  const swipeLogic = useRef<(dx: number, vx: number) => void>(() => {})

  swipeLogic.current = (dx: number, vx: number) => {
    if (!isPosted && (dx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD)) {
      void triggerHaptic('medium')
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 })
      void handlePublishDemo()
    } else if (dx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) {
      void triggerHaptic('light')
      animate(x, -520, {
        type: 'spring', stiffness: 250, damping: 28,
        velocity: Math.min(vx, -300),
        onComplete: () => setDismissed(true),
      })
    } else {
      animate(x, 0, { type: 'spring', stiffness: 600, damping: 42 })
    }
  }

  // ── Direct DOM touch handler: decides direction before doing anything ────
  // Using non-passive touchmove lets us call preventDefault for horizontal
  // swipes only — vertical touches fall through to native browser scroll.
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    let startX = 0, startY = 0, lastX = 0, lastT = 0
    let direction: 'x' | 'y' | null = null
    let active = false

    function onTouchStart(e: TouchEvent) {
      const t = e.target as HTMLElement
      if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.tagName === 'A') return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      lastX = startX
      lastT = Date.now()
      direction = null
      active = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!active) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      if (!direction) {
        if (Math.hypot(dx, dy) > 8) {
          direction = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
          if (direction === 'y') { active = false; return }
        } else { return }
      }

      e.preventDefault()
      x.set(dx)
      lastX = e.touches[0].clientX
      lastT = Date.now()
    }

    function onTouchEnd(e: TouchEvent) {
      if (!active || direction !== 'x') { active = false; direction = null; return }
      active = false

      const finalX = e.changedTouches[0].clientX
      const dx     = finalX - startX
      const dt     = Math.max(Date.now() - lastT, 16)
      const vx     = (finalX - lastX) / dt * 1000

      swipeLogic.current(dx, vx)
      direction = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draft helpers ────────────────────────────────────────────────────────
  function switchDraft(draft: 'professional' | 'friendly') {
    if (!responseData) return
    setSelectedDraft(draft)
    setEditedText(draft === 'professional' ? responseData.draft_professional : responseData.draft_friendly)
  }

  // ── Demo handlers ────────────────────────────────────────────────────────
  function handleRegenerateDemo() {
    const next = variantIndex + 1
    setVariantIndex(next)
    const pro = pickTemplate(review.rating, review.reviewer_name, next)
    const fri = pickTemplate(review.rating, review.reviewer_name, next + 1)
    const updated = {
      ...(responseData ?? { id: 'local', selected_draft: null, final_text: null, status: 'draft' }),
      draft_professional: pro,
      draft_friendly: fri,
    }
    setResponseData(updated as ResponseData)
    setEditedText(selectedDraft === 'professional' ? pro : fri)
    onAddToast?.('New reply generated', 'info')
  }

  async function handlePublishDemo() {
    if (!editedText.trim()) return
    setLoading('publish')
    await new Promise(r => setTimeout(r, 900))
    setReviewStatus('posted')
    setResponseData(prev => prev ? { ...prev, final_text: editedText.trim(), status: 'posted' } : prev)
    setLoading(null)
    onPublish?.(review.id, editedText.trim())
    void triggerHaptic('medium')
    onAddToast?.(
      isUrgent
        ? `Damage controlled — ${review.reviewer_name.split(' ')[0]}'s reply posted ✓`
        : 'Reply published to Google ✓',
      'success'
    )
  }

  async function handleRepostDemo() {
    setLoading('repost')
    await new Promise(r => setTimeout(r, 700))
    setLoading(null)
    setReposted(true)
    void triggerHaptic('light')
    onAddToast?.('Reposted to Google ✓', 'success')
    setTimeout(() => setReposted(false), 2500)
  }

  // ── API handlers ─────────────────────────────────────────────────────────
  async function api(path: string, body: object) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    let data: Record<string, unknown>
    try { data = JSON.parse(text) } catch {
      throw new Error(res.ok ? 'Unexpected server response' : `Server error ${res.status}`)
    }
    if (!res.ok) {
      const msg = data.error === 'upgrade_required'
        ? 'Upgrade to generate responses for more than 5 reviews.'
        : String(data.message ?? data.error ?? 'Request failed')
      throw new Error(msg)
    }
    return data
  }

  async function handleGenerate() {
    setLoading('generate')
    setError(null)
    try {
      const data    = await api('/api/responses/generate', { reviewId: review.id })
      const newResp = data.response as ResponseData
      setResponseData(newResp)
      const best = review.rating >= 4 ? 'friendly' : 'professional'
      setSelectedDraft(best)
      setEditedText(best === 'professional' ? newResp.draft_professional : newResp.draft_friendly)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(null) }
  }

  async function handleApproveAndPublish() {
    if (!responseData || !editedText.trim()) return
    setLoading('publish')
    setError(null)
    try {
      const approved = await api('/api/responses/approve', { responseId: responseData.id, selectedDraft, finalText: editedText.trim() })
      await api('/api/responses/publish', { responseId: (approved.response as ResponseData).id })
      setReviewStatus('posted')
      setResponseData(prev => prev ? { ...prev, status: 'posted', final_text: editedText.trim() } : prev)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(null) }
  }

  async function handlePublishApi() {
    if (!responseData) return
    setLoading('publish')
    setError(null)
    try {
      await api('/api/responses/publish', { responseId: responseData.id })
      setReviewStatus('posted')
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(null) }
  }

  if (dismissed) return null

  return (
    <motion.div
      ref={cardRef}
      style={{
        x,
        rotate,
        boxShadow: isUrgent
          ? undefined
          : '0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.18)',
      }}
      className={`rounded-2xl p-5 space-y-4 border relative overflow-hidden select-none ${
        isUrgent
          ? 'bg-slate-800 urgent-pulse'
          : 'bg-slate-800 border-slate-700/50'
      }`}
    >
      {/* Swipe-right: approve overlay (green checkmark) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-start pl-6 rounded-2xl bg-emerald-500/25 pointer-events-none z-10"
        style={{ opacity: approveOpacity }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-emerald-500/30 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <span className="text-xs font-bold text-emerald-400 mt-1">Approve</span>
        </div>
      </motion.div>

      {/* Swipe-left: skip overlay (grey X) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-6 rounded-2xl bg-slate-700/60 pointer-events-none z-10"
        style={{ opacity: skipOpacity }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-slate-600/50 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-400 mt-1">Skip</span>
        </div>
      </motion.div>

      {/* Urgent warning strip */}
      {isUrgent && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 -mt-1 -mx-1">
          <span className="text-red-400 animate-pulse text-base leading-none">⚠</span>
          <span className="text-xs font-semibold text-red-300">Needs your reply · Low rating</span>
          <span className="ml-auto text-[10px] text-red-400/60 font-medium">Reply now</span>
        </div>
      )}

      {/* Review header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <ReviewerAvatar name={review.reviewer_name} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StarRating n={review.rating} urgent={isUrgent} />
              <span className="font-semibold text-white text-sm">{review.reviewer_name}</span>
              <span className="text-slate-500 text-xs">{timeAgo(review.review_date)}</span>
            </div>
            {review.text && (
              <p className={`text-sm mt-2 leading-relaxed line-clamp-3 ${isUrgent ? 'text-red-200/80' : 'text-slate-300'}`}>
                {review.text}
              </p>
            )}
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 border ${
          isUrgent
            ? 'bg-red-500/15 text-red-400 border-red-500/30'
            : isPosted
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : isApproved
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        }`}>
          {isUrgent ? 'Needs reply' : isPosted ? 'Replied' : isApproved ? 'Approved' : 'Pending'}
        </span>
      </div>

      <div className={`border-t ${isUrgent ? 'border-red-500/15' : 'border-slate-700'}`} />

      {/* Swipe hint */}
      {!isPosted && responseData && (
        <p className="text-[10px] text-slate-600 text-center -mt-1">
          ← skip &nbsp;·&nbsp; swipe to approve →
        </p>
      )}

      {/* Response section */}
      {isPosted ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">
            Replied via ReplyKit · {getReplyTime(review.id)}s
          </p>
          {responseData?.final_text && (
            <p className="text-sm text-emerald-300 leading-relaxed">{responseData.final_text}</p>
          )}
          {demo && (
            <button
              onClick={handleRepostDemo}
              disabled={isDisabled}
              className="ripple mt-2.5 text-xs text-emerald-400/60 disabled:opacity-40 transition-colors btn-press min-h-[44px] flex items-center"
            >
              {loading === 'repost' ? 'Reposting…' : reposted ? '✓ Reposted' : '↻ Repost to Google'}
            </button>
          )}
        </div>

      ) : responseData ? (
        <div className="space-y-3">

          {loading === 'generate' && (
            <div className="space-y-2">
              <div className="shimmer h-4 rounded-lg w-3/4"/>
              <div className="shimmer h-4 rounded-lg w-full"/>
              <div className="shimmer h-4 rounded-lg w-5/6"/>
            </div>
          )}

          {loading !== 'generate' && (
            <>
              {/* Draft switcher */}
              <div className="flex items-center gap-2">
                {(['professional', 'friendly'] as const).map(draft => {
                  const isSelected = selectedDraft === draft
                  const isRec      = draft === recommended
                  return (
                    <button
                      key={draft}
                      onClick={() => switchDraft(draft)}
                      className={`ripple flex items-center gap-1.5 text-xs px-3 py-2 rounded-full font-medium transition-colors btn-press min-h-[44px] ${
                        isSelected
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="capitalize">{draft}</span>
                      {isRec && <span className={`text-[10px] ${isSelected ? 'text-amber-500' : 'text-amber-400'}`}>✦</span>}
                    </button>
                  )
                })}
                <span className="text-[11px] text-slate-500 ml-0.5">
                  {isOnRec ? `Best for ${review.rating}★` : '✦ recommended'}
                </span>
              </div>

              {/* Editable reply */}
              <textarea
                value={editedText}
                onChange={e => setEditedText(e.target.value)}
                rows={4}
                className={`w-full border rounded-xl px-3.5 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent bg-slate-700 leading-relaxed resize-none transition-colors text-slate-200 ${
                  isUrgent
                    ? 'border-red-500/30 focus:ring-red-500/50'
                    : 'border-slate-600 focus:ring-blue-500'
                }`}
                placeholder="Your reply…"
              />
            </>
          )}

          {/* Action row */}
          {loading !== 'generate' && (
            <div className="flex items-center justify-between">
              <button
                onClick={demo ? handleRegenerateDemo : handleGenerate}
                disabled={isDisabled}
                className="ripple text-xs text-slate-500 disabled:opacity-40 transition-colors btn-press min-h-[44px] px-2 flex items-center"
              >
                ↻ Regenerate
              </button>

              {demo ? (
                <button
                  onClick={handlePublishDemo}
                  disabled={isDisabled || !editedText.trim()}
                  className={`ripple px-5 py-2.5 min-h-[48px] rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm btn-press ${
                    isUrgent
                      ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {loading === 'publish' ? (
                    <span className="flex items-center gap-1.5">
                      <span className="animate-spin inline-block text-xs">↻</span>
                      Posting…
                    </span>
                  ) : isUrgent ? '⚡ Reply & protect' : '✓ Approve & Publish'}
                </button>
              ) : isApproved ? (
                <button
                  onClick={handlePublishApi}
                  disabled={isDisabled}
                  className="ripple bg-emerald-600 text-white px-5 py-2.5 min-h-[48px] rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm btn-press"
                >
                  {loading === 'publish' ? 'Posting…' : '→ Publish reply'}
                </button>
              ) : (
                <button
                  onClick={handleApproveAndPublish}
                  disabled={isDisabled || !editedText.trim()}
                  className="ripple bg-blue-600 text-white px-5 py-2.5 min-h-[48px] rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm btn-press"
                >
                  {loading === 'publish' ? 'Publishing…' : '✓ Approve & Publish'}
                </button>
              )}
            </div>
          )}
        </div>

      ) : (
        <button
          onClick={demo ? handleRegenerateDemo : handleGenerate}
          disabled={isDisabled}
          className={`ripple w-full border-2 border-dashed rounded-xl py-4 min-h-[56px] text-sm disabled:opacity-50 transition-colors font-medium btn-press ${
            isUrgent
              ? 'border-red-500/40 text-red-400'
              : 'border-slate-600 text-slate-500'
          }`}
        >
          {isDisabled ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block">↻</span>
              Writing reply…
            </span>
          ) : isUrgent ? '⚡ Reply now' : '🛡 Generate AI reply'}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </motion.div>
  )
}
