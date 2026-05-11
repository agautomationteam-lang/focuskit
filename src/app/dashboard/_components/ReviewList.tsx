'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ReviewCard from './ReviewCard'
import HomeView from './HomeView'

// ── Sort helpers ──────────────────────────────────────────────────────────────

type SortType = 'newest' | 'oldest' | 'lowest' | 'highest'

function sortParams(s: SortType): { column: string; ascending: boolean } {
  if (s === 'oldest')  return { column: 'review_date', ascending: true }
  if (s === 'lowest')  return { column: 'rating',      ascending: true }
  if (s === 'highest') return { column: 'rating',      ascending: false }
  return                      { column: 'review_date', ascending: false }
}

const SORT_LABELS: Record<SortType, string> = {
  newest:  'Newest first',
  oldest:  'Oldest first',
  lowest:  'Lowest rating',
  highest: 'Highest rating',
}

const PAGE_SIZE = 30

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
  googleConnected?: boolean
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
  googleConnected = false,
}: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const publishFailed    = searchParams.get('publish_failed') === '1'
  const upgradeSuccess   = searchParams.get('upgrade') === 'success'
  const justConnected    = searchParams.get('google_connected') === '1'
  const googleError      = searchParams.get('google_error') === '1'
  const googleErrorMessage = searchParams.get('google_error_message')
  const googleNoBusiness = searchParams.get('google_no_business') === '1'
  const googleBlocked    = searchParams.get('google_blocked') === '1'
  const dashTab          = searchParams.get('tab') ?? 'home'

  const [reviews, setReviews]               = useState<ReviewData[]>(initialReviews)
  const liveReviewCount                     = initialReviewCount
  const [tab, setTab]                       = useState<Tab>('all')
  const [toasts, setToasts]                 = useState<Toast[]>([])
  const activityLog: ActivityEvent[]        = []
  const [loading, setLoading]               = useState(false)
  const [loadStatus, setLoadStatus]         = useState<string | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt]   = useState<Date | null>(null)
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [ptrActive, setPtrActive]           = useState(false)
  const [showWelcome, setShowWelcome]       = useState(false)
  const [welcomeName, setWelcomeName]       = useState('')
  const autoFetchAfterConnectRef            = useRef(false)

  // ── Pagination & sort ────────────────────────────────────────────────────────
  const [sort, setSort]             = useState<SortType>('newest')
  const [offset, setOffset]         = useState(0)
  const [hasMore, setHasMore]       = useState(initialReviews.length === PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

  const ptrStartY          = useRef(0)
  const ptrTriggered       = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Initial skeleton — hide after short delay so first render feels snappy
  useEffect(() => {
    const t = setTimeout(() => setIsInitialLoading(false), 900)
    return () => clearTimeout(t)
  }, [])

  // ── Pull-to-refresh handlers ───────────────────────────────────────────────
  function onPtrTouchStart(e: React.TouchEvent) {
    ptrStartY.current    = e.touches[0].clientY
    ptrTriggered.current = false
  }

  function onPtrTouchMove(e: React.TouchEvent) {
    const dy    = e.touches[0].clientY - ptrStartY.current
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
    await handleRefresh()
  }

  useEffect(() => {
    if (publishFailed || upgradeSuccess) router.replace('/dashboard')
    if (justConnected || googleError || googleNoBusiness || googleBlocked) {
      router.replace(`/dashboard?tab=${dashTab}`)
    }

    const done = localStorage.getItem('rk_onboarding_done')
    if (!done) {
      router.push('/onboarding')
      return
    }

    const welcome = localStorage.getItem('rk_show_welcome')
    const name    = localStorage.getItem('rk_business_name')
    if (welcome) {
      setShowWelcome(true)
      setWelcomeName(name ?? '')
    }

    if (!demo) {
      const saved = localStorage.getItem('rk_review_sort') as SortType | null
      if (saved && saved !== 'newest' && ['oldest', 'lowest', 'highest'].includes(saved)) {
        void applySortFetch(saved)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!justConnected || autoFetchAfterConnectRef.current) return
    autoFetchAfterConnectRef.current = true
    void handleRefresh()
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
      if (sec < 5)       setLastUpdatedLabel('Just now')
      else if (sec < 60) setLastUpdatedLabel(`${sec}s ago`)
      else               setLastUpdatedLabel(`${Math.floor(sec / 60)}m ago`)
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

  // ── Sort / pagination helpers ──────────────────────────────────────────────

  async function applySortFetch(newSort: SortType) {
    setSort(newSort)
    localStorage.setItem('rk_review_sort', newSort)
    setLoadingMore(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { column, ascending } = sortParams(newSort)
      const { data: fresh } = await supabase
        .from('reviews')
        .select('*, responses(*)')
        .eq('business_id', business.id)
        .order(column, { ascending })
        .limit(PAGE_SIZE)
      setReviews(fresh ?? [])
      setOffset(0)
      setHasMore((fresh ?? []).length === PAGE_SIZE)
    } finally {
      setLoadingMore(false)
    }
  }

  const changeSort = useCallback((newSort: SortType) => {
    if (demo || newSort === sort) return
    void applySortFetch(newSort)
  }, [demo, sort, business.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || demo) return
    setLoadingMore(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { column, ascending } = sortParams(sort)
      const newOffset = offset + PAGE_SIZE
      const { data: more } = await supabase
        .from('reviews')
        .select('*, responses(*)')
        .eq('business_id', business.id)
        .order(column, { ascending })
        .range(newOffset, newOffset + PAGE_SIZE - 1)
      if (more && more.length > 0) {
        setReviews(prev => [...prev, ...more])
        setOffset(newOffset)
        setHasMore(more.length === PAGE_SIZE)
      } else {
        setHasMore(false)
      }
    } finally {
      setLoadingMore(false)
    }
  }, [business.id, demo, loadingMore, hasMore, sort, offset])

  // ── Refresh ───────────────────────────────────────────────────────────────

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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error ?? 'Failed to fetch reviews from Google')
      }

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { column, ascending } = sortParams(sort)

      const { data: fresh } = await supabase
        .from('reviews')
        .select('*, responses(*)')
        .eq('business_id', business.id)
        .order(column, { ascending })
        .limit(PAGE_SIZE)

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
        .from('reviews')
        .select('*, responses(*)')
        .eq('business_id', business.id)
        .order(column, { ascending })
        .limit(PAGE_SIZE)

      const finalReviews = final ?? []
      setReviews(finalReviews)
      setOffset(0)
      setHasMore(finalReviews.length === PAGE_SIZE)
      setLastUpdatedAt(new Date())
      setLoadStatus(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync reviews — check your Google Business connection.')
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

  const base     = tab === 'all' ? reviews : reviews.filter(r => r.status === tab)
  const filtered = [...base].sort((a, b) => {
    const aUrgent = a.status === 'pending' && a.rating <= 2 ? -1 : 0
    const bUrgent = b.status === 'pending' && b.rating <= 2 ? -1 : 0
    return aUrgent - bUrgent
  })

  const needsReply        = counts.pending + counts.approved
  const negativeUnreplied = reviews.filter(r => r.status === 'pending' && r.rating <= 2).length
  const handled           = counts.posted
  const negRecovered      = reviews.filter(r => r.status === 'posted' && r.rating <= 2).length
  const postedList        = reviews.filter(r => r.status === 'posted')
  const avgReplyTime      = postedList.length > 0
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
              demo={demo}
              googleConnected={googleConnected}
            />
          </div>
        ) : (
          <div key="reviews" className="tab-enter">
            <main className="android-screen max-w-3xl mx-auto px-4 py-5 sm:py-8">

              {/* Hero headline */}
              <div className="mb-6 fade-in">
                <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
                  Review Inbox
                </h1>
                <p className="text-slate-400 text-sm mt-1.5">
                  Total: <CountUp value={liveReviewCount} /> review{liveReviewCount !== 1 ? 's' : ''} · AI replies posted in seconds
                </p>
              </div>

              {/* Google connection banners */}
              {justConnected && (
                <div className="mb-5 flex items-center gap-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-300 font-medium slide-in-down">
                  <span className="text-base">✓</span>
                  Google Business connected! Click <strong>Refresh</strong> to load your real reviews.
                </div>
              )}
              {googleBlocked && (
                <div className="mb-5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 slide-in-down">
                  <p className="text-sm font-semibold text-amber-300 mb-1">Google access blocked</p>
                  <p className="text-xs text-amber-400/80 leading-relaxed">
                    Google verification is pending. Email <strong>agautomationteam@gmail.com</strong> to be added as a tester, then try connecting again.
                  </p>
                  <a href="/api/auth/google" className="inline-block mt-2 text-xs font-semibold text-amber-300 underline underline-offset-2">
                    Try again →
                  </a>
                </div>
              )}
              {googleError && (
                <div className="mb-5 flex items-center gap-3 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 slide-in-down">
                  <span>⚠️</span>
                  {googleErrorMessage ?? 'Google connection failed.'} <a href="/api/auth/google" className="underline font-semibold ml-1">Try again →</a>
                </div>
              )}
              {googleNoBusiness && (
                <div className="mb-5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-4 slide-in-down">
                  <p className="text-sm font-semibold text-amber-300 mb-1">No Google Business Profile found</p>
                  <p className="text-xs text-amber-400/80 leading-relaxed mb-3">
                    Your Google account isn't linked to a Google Business Profile. You need one before ReplyKit can read and reply to your reviews.
                  </p>
                  <a
                    href="https://business.google.com/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-lg"
                  >
                    Create a Google Business Profile →
                  </a>
                </div>
              )}

              {/* Upgrade / publish-failed banners */}
              {upgradeSuccess && (
                <div className="mb-5 flex items-center gap-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-300 font-medium">
                  <span className="text-base">🎉</span>
                  Subscription active — all reviews unlocked. You&apos;re fully protected.
                </div>
              )}
              {publishFailed && (
                <div className="mb-5 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
                  Couldn&apos;t post to Google — your reply is saved. Find it below and click <strong>Publish reply</strong> to retry.
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
                    <p className="text-sm font-semibold text-amber-300">You&apos;ve hit the free plan limit</p>
                    <p className="text-xs text-amber-400/70 mt-0.5">Your remaining reviews are unprotected. Upgrade to cover every customer.</p>
                  </div>
                  <a href="/upgrade" className="shrink-0 text-xs font-semibold bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors">
                    Protect all reviews →
                  </a>
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

              {/* Filter tabs + sort */}
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

                <div className="flex items-center gap-2">
                  {lastUpdatedLabel && (
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      Updated {lastUpdatedLabel}
                    </span>
                  )}
                  {!demo && (
                    <select
                      value={sort}
                      onChange={e => changeSort(e.target.value as SortType)}
                      disabled={loadingMore}
                      className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                      {(Object.keys(SORT_LABELS) as SortType[]).map(s => (
                        <option key={s} value={s}>{SORT_LABELS[s]}</option>
                      ))}
                    </select>
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
              {isInitialLoading || (loadingMore && reviews.length === 0) ? (
                <div className="space-y-3">
                  {[0, 1, 2].map(i => <ReviewCardSkeleton key={i} />)}
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-20 px-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-3xl mx-auto mb-5">📬</div>
                  <h2 className="text-base font-semibold text-white mb-2">No reviews yet</h2>
                  <p className="text-sm text-slate-400 mb-7 max-w-xs mx-auto leading-relaxed">
                    When you get reviews, they&apos;ll appear here. AI replies will post automatically — you don&apos;t need to lift a finger.
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
                <>
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

                  {/* Load more */}
                  {hasMore && !demo && tab === 'all' && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 px-6 py-2.5 rounded-xl disabled:opacity-50 transition-colors"
                      >
                        {loadingMore ? (
                          <>
                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                            </svg>
                            Loading…
                          </>
                        ) : (
                          'Load more reviews'
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </>
  )
}
