'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ReviewCard from './ReviewCard'
import HomeView from './HomeView'
import { pickTemplate, generateSimResponse, LIVE_POOL } from './demoData'

// ── Skeleton card ─────────────────────────────────────────────────────────────
function ReviewCardSkeleton() {
  return (
    <div className="native-card bg-slate-800/70 border border-slate-700/40 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full shimmer shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 rounded shimmer" />
          <div className="h-3 w-16 rounded shimmer" />
        </div>
        <div className="h-6 w-10 rounded-lg shimmer" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded shimmer" />
        <div className="h-3 w-4/5 rounded shimmer" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-9 flex-1 rounded-xl shimmer" />
        <div className="h-9 flex-1 rounded-xl shimmer" />
      </div>
    </div>
  )
}

// ── Local notification ────────────────────────────────────────────────────────
async function fireLocalNotification(rating: number, reviewerName: string, reviewId: string) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const id = Math.abs(reviewId.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)) % 100000
    await LocalNotifications.schedule({
      notifications: [{
        id,
        channelId: 'reviews',
        title: `⚠️ New ${rating}★ review`,
        body: `${reviewerName} left a ${rating}-star review — tap to reply`,
        schedule: { at: new Date(Date.now() + 500) },
        extra: { reviewId },
      }],
    })
  } catch { /* web no-op */ }
}

const FREE_LIMIT = 5

interface Business {
  id: string
  name: string
  auto_reply_enabled: boolean
}

interface ReviewData {
  id: string
  reviewer_name: string
  rating: number
  text: string | null
  review_date: string
  status: string
  responses: {
    id: string
    draft_professional: string
    draft_friendly: string
    selected_draft: string | null
    final_text: string | null
    status: string
  }[]
}

interface Props {
  business: Business
  initialReviews: ReviewData[]
  subscriptionStatus: string
  reviewCount: number
  demo?: boolean
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'alert'
}

interface ActivityEvent {
  id: string
  name: string
  rating: number
  type: 'review' | 'reply'
  replyTime?: string
  time: Date
}

function activityTimeAgo(d: Date) {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 5)  return 'just now'
  if (sec < 60) return `${sec}s ago`
  return `${Math.floor(sec / 60)}m ago`
}

const TABS = ['all', 'pending', 'approved', 'posted'] as const
type Tab = typeof TABS[number]

// ── CountUp ──────────────────────────────────────────────────────────────────

function CountUp({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef  = useRef<number>(0)

  useEffect(() => {
    const from = fromRef.current
    const to   = value
    if (from === to) return

    const duration = 900
    const start    = performance.now()

    function animate(now: number) {
      const elapsed  = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        fromRef.current = to
      }
    }

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  return <>{prefix}{display.toLocaleString()}{suffix}</>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReviewList({
  business,
  initialReviews,
  subscriptionStatus,
  reviewCount: initialReviewCount,
  demo = false,
}: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const publishFailed  = searchParams.get('publish_failed') === '1'
  const upgradeSuccess = searchParams.get('upgrade') === 'success'
  const dashTab        = searchParams.get('tab') ?? 'home'

  const [reviews, setReviews]               = useState<ReviewData[]>(initialReviews)
  const [liveReviewCount, setLiveCount]     = useState(initialReviewCount)
  const [tab, setTab]                       = useState<Tab>('all')
  const [autoReply, setAutoReply]           = useState(true)
  const [toasts, setToasts]                 = useState<Toast[]>([])
  const [activityLog, setActivityLog]       = useState<ActivityEvent[]>([])
  const [alertFlash, setAlertFlash]         = useState(false)
  const [loading, setLoading]               = useState(false)
  const [loadStatus, setLoadStatus]         = useState<string | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt]   = useState<Date | null>(null)
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [ptrActive, setPtrActive]           = useState(false)
  const [showWelcome, setShowWelcome]       = useState(false)
  const [welcomeName, setWelcomeName]       = useState('')

  const autoReplyRef     = useRef(autoReply)
  const reviewsRef       = useRef(reviews)
  const poolIndexRef     = useRef(0)
  const ptrStartY        = useRef(0)
  const ptrTriggered     = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { autoReplyRef.current = autoReply }, [autoReply])
  useEffect(() => { reviewsRef.current   = reviews   }, [reviews])

  // Initial skeleton — hide after short delay so first render feels snappy
  useEffect(() => {
    const t = setTimeout(() => setIsInitialLoading(false), 900)
    return () => clearTimeout(t)
  }, [])

  // ── Pull-to-refresh handlers ───────────────────────────────────────────────
  function onPtrTouchStart(e: React.TouchEvent) {
    ptrStartY.current  = e.touches[0].clientY
    ptrTriggered.current = false
  }

  function onPtrTouchMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - ptrStartY.current
    const atTop = (typeof window !== 'undefined' ? window.scrollY : 0) === 0
    if (dy > 60 && atTop && !ptrTriggered.current) {
      ptrTriggered.current = true
      setPtrActive(true)
    }
  }

  async function onPtrTouchEnd() {
    if (!ptrTriggered.current) return
    setPtrActive(false)
    ptrTriggered.current = false
    if (demo) {
      setLastUpdatedAt(new Date())
      addToast('Reviews up to date', 'info')
    } else {
      await handleRefresh()
    }
  }

  useEffect(() => {
    if (publishFailed || upgradeSuccess) router.replace('/dashboard')

    // First-launch gate — redirect to onboarding if not completed
    const done = localStorage.getItem('rk_onboarding_done')
    if (!done) {
      router.push('/onboarding')
      return
    }

    // Welcome banner after onboarding
    const welcome = localStorage.getItem('rk_show_welcome')
    const name    = localStorage.getItem('rk_business_name')
    if (welcome) {
      setShowWelcome(true)
      setWelcomeName(name ?? '')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function dismissWelcome() {
    localStorage.removeItem('rk_show_welcome')
    setShowWelcome(false)
  }

  function goToReviews() {
    localStorage.setItem('rk_last_dash_tab', 'reviews')
    router.push('/dashboard?tab=reviews')
  }

  // ── Last-updated label ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!lastUpdatedAt) return
    function refresh() {
      const sec = Math.floor((Date.now() - lastUpdatedAt!.getTime()) / 1000)
      if (sec < 5)  setLastUpdatedLabel('Just now')
      else if (sec < 60) setLastUpdatedLabel(`${sec}s ago`)
      else setLastUpdatedLabel(`${Math.floor(sec / 60)}m ago`)
    }
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [lastUpdatedAt])

  // ── Toast system ─────────────────────────────────────────────────────────────

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const addActivityEvent = useCallback((name: string, rating: number, type: 'review' | 'reply', replyTime?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    setActivityLog(prev => [{ id, name, rating, type, replyTime, time: new Date() }, ...prev.slice(0, 7)])
  }, [])

  // ── Publish callback (from ReviewCard) ────────────────────────────────────

  const handlePublish = useCallback((reviewId: string, finalText: string) => {
    setReviews(prev => prev.map(r => {
      if (r.id !== reviewId) return r
      const resp = r.responses[0]
      return {
        ...r,
        status: 'posted',
        responses: resp
          ? [{ ...resp, final_text: finalText, status: 'posted' }]
          : [{ id: `local_${Date.now()}`, draft_professional: finalText, draft_friendly: finalText, selected_draft: 'professional', final_text: finalText, status: 'posted' }],
      }
    }))
  }, [])

  // ── Real-time simulation ──────────────────────────────────────────────────

  useEffect(() => {
    if (!demo) return
    let timer: ReturnType<typeof setTimeout>
    let replyTimer: ReturnType<typeof setTimeout>

    function tick() {
      const idx       = poolIndexRef.current % LIVE_POOL.length
      poolIndexRef.current += 1
      const entry     = LIVE_POOL[idx]
      const sim       = generateSimResponse(entry.rating, entry.name, idx)
      const firstName = entry.name.split(' ')[0]

      // Step 1: add as pending
      const newReview: ReviewData = {
        id: sim.id,
        reviewer_name: entry.name,
        rating: entry.rating,
        text: entry.text,
        review_date: new Date().toISOString(),
        status: 'pending',
        responses: [{
          id: sim.id,
          draft_professional: sim.draft_professional,
          draft_friendly:     sim.draft_friendly,
          selected_draft:     sim.selected_draft,
          final_text:         null,
          status:             'draft',
        }],
      }

      setReviews(prev => [newReview, ...prev])
      setLiveCount(prev => prev + 1)
      setLastUpdatedAt(new Date())
      addToast(`New ${entry.rating}★ review from ${firstName}`, 'info')
      addActivityEvent(entry.name, entry.rating, 'review')

      // Fire local notification for 1-2★ reviews
      if (entry.rating <= 2) {
        void fireLocalNotification(entry.rating, entry.name, sim.id)
      }

      if (autoReplyRef.current) {
        // Step 2: auto-post after a realistic delay
        const replyDelay = 1800 + Math.random() * 2400
        const replyTime  = (replyDelay / 1000).toFixed(1)

        replyTimer = setTimeout(() => {
          setReviews(prev => prev.map(r => {
            if (r.id !== sim.id) return r
            return {
              ...r,
              status: 'posted',
              responses: [{ ...r.responses[0], final_text: sim.final_text, status: 'posted' }],
            }
          }))
          setLastUpdatedAt(new Date())
          addToast(`AI replied to ${firstName} in ${replyTime}s ✓`, 'success')
          addActivityEvent(entry.name, entry.rating, 'reply', replyTime)
        }, replyDelay)

      } else if (entry.rating <= 2) {
        setAlertFlash(true)
        setTimeout(() => setAlertFlash(false), 4500)
        addToast(`⚡ ${entry.rating}★ review from ${firstName} needs a reply`, 'alert')
      }

      timer = setTimeout(tick, 20000 + Math.random() * 10000)
    }

    timer = setTimeout(tick, 25000 + Math.random() * 5000)
    return () => { clearTimeout(timer); clearTimeout(replyTimer) }
  }, [demo, addToast, addActivityEvent])

  // ── Auto-reply toggle ────────────────────────────────────────────────────

  async function autoReplyPending() {
    const pending = reviewsRef.current.filter(r => r.status === 'pending')
    if (!pending.length) return
    addToast(`Auto-replying to ${pending.length} pending review${pending.length > 1 ? 's' : ''}…`, 'info')
    for (const r of pending) {
      await new Promise(res => setTimeout(res, 1100))
      const finalText = pickTemplate(r.rating, r.reviewer_name)
      handlePublish(r.id, finalText)
      addToast(`Auto-replied to ${r.reviewer_name.split(' ')[0]} ✓`, 'success')
    }
  }

  function toggleAutoReply() {
    const next = !autoReply
    setAutoReply(next)
    if (next) autoReplyPending()
  }

  // ── Non-demo refresh ──────────────────────────────────────────────────────

  async function handleRefresh() {
    setLoading(true)
    setLoadStatus('Fetching reviews…')
    setError(null)
    try {
      const res = await fetch('/api/reviews/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      })
      if (!res.ok) throw new Error('Fetch failed')

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: fresh } = await supabase
        .from('reviews').select('*, responses(*)').eq('business_id', business.id).order('review_date', { ascending: false })

      const noResponse = (fresh ?? []).filter((r: ReviewData) => !r.responses || r.responses.length === 0)
      for (let i = 0; i < noResponse.length; i++) {
        setLoadStatus(`Writing AI reply ${i + 1} of ${noResponse.length}…`)
        await fetch('/api/responses/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewId: noResponse[i].id }),
        })
      }

      const { data: final } = await supabase
        .from('reviews').select('*, responses(*)').eq('business_id', business.id).order('review_date', { ascending: false })

      const finalReviews = final ?? []
      setReviews(finalReviews)
      setLiveCount(finalReviews.length)
      setLoadStatus(null)
    } catch {
      setError('Could not sync reviews — check your Google Business connection.')
    } finally {
      setLoading(false)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const isPro     = subscriptionStatus === 'active'
  const isAtLimit = !isPro && liveReviewCount >= FREE_LIMIT

  const counts = {
    all:      reviews.length,
    pending:  reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    posted:   reviews.filter(r => r.status === 'posted').length,
  }

  const base             = tab === 'all' ? reviews : reviews.filter(r => r.status === tab)
  const filtered         = [...base].sort((a, b) => {
    const aUrgent = a.status === 'pending' && a.rating <= 2 ? -1 : 0
    const bUrgent = b.status === 'pending' && b.rating <= 2 ? -1 : 0
    return aUrgent - bUrgent
  })

  const needsReply        = counts.pending + counts.approved
  const autoReplied       = counts.posted
  const negativeUnreplied = reviews.filter(r => r.status === 'pending' && r.rating <= 2).length
  const badHandled        = reviews.filter(r => r.rating <= 2 && r.status === 'posted').length

  const handled      = counts.posted
  const negRecovered = reviews.filter(r => r.status === 'posted' && r.rating <= 2).length
  const postedList   = reviews.filter(r => r.status === 'posted')
  const avgReplyTime = postedList.length > 0
    ? (postedList.reduce((sum, r) => {
        const hash = r.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
        return sum + 1.4 + (hash % 28) / 10
      }, 0) / postedList.length).toFixed(1)
    : '--'

  return (
    <>
      {/* Toast container */}
      <div className="fixed top-16 right-3 z-50 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 320 }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`slide-in-right pointer-events-auto px-4 py-3 rounded-xl text-sm font-medium shadow-xl border backdrop-blur-sm ${
              toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-300' :
              toast.type === 'alert'   ? 'bg-red-900/90 border-red-500/40 text-red-300' :
                                         'bg-slate-800/90 border-slate-600/50 text-slate-300'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Pull-to-refresh wrapper */}
      <div
        ref={scrollContainerRef}
        onTouchStart={onPtrTouchStart}
        onTouchMove={onPtrTouchMove}
        onTouchEnd={onPtrTouchEnd}
      >
        {/* PTR indicator */}
        <div
          className="ptr-indicator overflow-hidden transition-[height] duration-200"
          style={{ height: ptrActive ? 44 : 0 }}
        >
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Refreshing…
          </div>
        </div>

      {dashTab === 'home' ? (
        <div key="home" className="tab-enter">
          <HomeView
            businessName={business.name}
            handled={handled}
            negRecovered={negRecovered}
            avgReplyTime={avgReplyTime}
            pending={counts.pending}
            activityLog={activityLog}
            showWelcome={showWelcome}
            welcomeName={welcomeName}
            onDismissWelcome={dismissWelcome}
            onGoToReviews={goToReviews}
          />
        </div>
      ) : (
        <div key="reviews" className="tab-enter">
          <main className="max-w-3xl mx-auto px-4 py-8">

            {/* Hero headline */}
            <div className="mb-6 fade-in">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
                Review Inbox
              </h1>
              <p className="text-slate-400 text-sm mt-1.5">
                AI replies posted in seconds · {liveReviewCount} review{liveReviewCount !== 1 ? 's' : ''} synced
              </p>
            </div>

            {/* Upgrade / publish-failed banners */}
            {upgradeSuccess && (
              <div className="mb-5 flex items-center gap-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-300 font-medium">
                <span className="text-base">🎉</span>
                Subscription active — all reviews unlocked. You're fully protected.
              </div>
            )}
            {publishFailed && (
              <div className="mb-5 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
                Couldn't post to Google — your reply is saved. Find it below and click <strong>Publish reply</strong> to retry.
              </div>
            )}
            {error && (
              <div className="mb-5 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Free plan limit */}
            {isAtLimit && (
              <div className="mb-5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-amber-300">You've hit the free plan limit</p>
                  <p className="text-xs text-amber-400/70 mt-0.5">Your remaining reviews are unprotected. Upgrade to cover every customer.</p>
                </div>
                <a href="/upgrade" className="shrink-0 text-xs font-semibold bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors">
                  Protect all reviews →
                </a>
              </div>
            )}

            {/* Alert flash — new negative review */}
            {alertFlash && (
              <div className="mb-4 slide-in-down flex items-center gap-3 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 text-sm text-red-300 font-medium">
                <span className="animate-pulse text-base">⚡</span>
                <span>New 1-2★ review — every hour you wait costs you customers</span>
                <button onClick={() => { setTab('pending'); setAlertFlash(false) }} className="ml-auto shrink-0 text-xs font-semibold text-red-300 underline underline-offset-2">
                  Reply now →
                </button>
              </div>
            )}

            {/* Auto-reply toggle (demo only) */}
            {demo && (
              <div className="mb-5 flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-white">Auto-reply</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {autoReply
                      ? 'Replies sent instantly — zero effort, zero lag'
                      : 'Manual mode — you approve before anything posts'}
                  </p>
                </div>
                <button
                  onClick={toggleAutoReply}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${autoReply ? 'bg-emerald-500' : 'bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${autoReply ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            )}

            {/* Negative review urgency warning */}
            {negativeUnreplied > 0 && !loading && (
              <div className="mb-4 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-300 font-medium">
                <span>⚠️</span>
                <span>
                  {negativeUnreplied} negative review{negativeUnreplied !== 1 ? 's' : ''} need{negativeUnreplied === 1 ? 's' : ''} your attention
                </span>
                <button onClick={() => setTab('pending')} className="ml-auto shrink-0 text-xs font-semibold text-amber-300 underline underline-offset-2">
                  Fix now →
                </button>
              </div>
            )}

            {/* Reviews waiting */}
            {needsReply > 0 && !loading && (
              <div className="mb-6 bg-blue-600 rounded-xl px-5 py-4 flex items-center justify-between gap-4 shadow-lg">
                <div>
                  <p className="text-white font-semibold text-sm">
                    {needsReply} review{needsReply !== 1 ? 's' : ''} waiting — unanswered reviews hurt your ranking
                  </p>
                  <p className="text-blue-200 text-xs mt-0.5">Businesses that reply within 24h get 35% more bookings</p>
                </div>
                <button onClick={() => setTab('pending')} className="shrink-0 text-xs font-semibold bg-white text-blue-700 px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                  Reply now →
                </button>
              </div>
            )}

            {/* Filter tabs */}
            <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {TABS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`relative text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${
                      tab === t
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {t}
                    {t === 'pending' && counts.pending > 0 && tab !== 'pending' && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
                    )}
                    {counts[t] > 0 && (
                      <span className={`ml-1.5 text-[11px] ${tab === t ? 'opacity-50' : 'text-slate-500'}`}>
                        {counts[t]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {lastUpdatedLabel && (
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    Updated {lastUpdatedLabel}
                  </span>
                )}
                {!demo && (
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-sm font-medium bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <span className={`text-base leading-none ${loading ? 'animate-spin inline-block' : ''}`}>↻</span>
                    <span className="text-xs">{loading ? loadStatus ?? 'Loading…' : 'Refresh'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cards / skeleton / empty states */}
            {isInitialLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map(i => <ReviewCardSkeleton key={i} />)}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-20 px-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-3xl mx-auto mb-5">📬</div>
                <h2 className="text-base font-semibold text-white mb-2">No reviews yet</h2>
                <p className="text-sm text-slate-400 mb-7 max-w-xs mx-auto leading-relaxed">
                  When you get reviews, they'll appear here. AI replies will post automatically — you don't need to lift a finger.
                </p>
                {!demo && (
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loading ? loadStatus ?? 'Fetching…' : '↻ Fetch my reviews'}
                  </button>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-xl mx-auto mb-4">✓</div>
                <p className="text-sm font-semibold text-slate-200">All caught up</p>
                <p className="text-xs text-slate-500 mt-1.5">No {tab} reviews right now — your reputation is in good shape.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    demo={demo}
                    onPublish={handlePublish}
                    onAddToast={addToast}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      )}
      </div>
    </>
  )
}
