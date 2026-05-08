'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'

interface ActivityItem {
  id: string
  type: 'reply_sent' | 'review_received' | 'negative_alert'
  reviewer: string
  rating: number
  message: string
  time: Date
  read: boolean
}

function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60)  return 'Just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 172800) return 'Yesterday'
  return `${Math.floor(sec / 86400)} days ago`
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24"
          fill={i <= rating ? '#f59e0b' : 'none'}
          stroke={i <= rating ? '#f59e0b' : '#475569'}
          strokeWidth="1.5"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      ))}
    </span>
  )
}

function TypeIcon({ type, rating }: { type: ActivityItem['type']; rating: number }) {
  if (type === 'negative_alert' || (type === 'review_received' && rating <= 2)) {
    return (
      <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    )
  }
  if (type === 'reply_sent') {
    return (
      <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#60a5fa">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    </div>
  )
}

const FILTER_TABS = [
  { id: 'all',     label: 'All' },
  { id: 'alerts',  label: 'Alerts' },
  { id: 'replies', label: 'Replies' },
  { id: 'reviews', label: 'Reviews' },
] as const
type FilterTab = typeof FILTER_TABS[number]['id']

export default function ActivityPage() {
  const [filter, setFilter]   = useState<FilterTab>('all')
  const [items, setItems]     = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!biz) { setLoading(false); return }

      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, reviewer_name, rating, review_date, status, responses(status, posted_at, final_text)')
        .eq('business_id', biz.id)
        .not('google_review_id', 'like', 'stub_%')
        .order('review_date', { ascending: false })
        .limit(50)

      if (!reviews) { setLoading(false); return }

      const activity: ActivityItem[] = []

      for (const r of reviews) {
        const firstName = (r.reviewer_name ?? 'Someone').split(' ')[0]
        const reviewDate = new Date(r.review_date)
        const resp = Array.isArray(r.responses) ? r.responses[0] : null

        // Posted reply → reply_sent
        if (resp && resp.status === 'posted') {
          const postedAt = resp.posted_at ? new Date(resp.posted_at) : reviewDate
          activity.push({
            id: `reply_${r.id}`,
            type: 'reply_sent',
            reviewer: r.reviewer_name ?? 'Someone',
            rating: r.rating,
            message: `AI replied to ${firstName}'s ${r.rating}-star review`,
            time: postedAt,
            read: true,
          })
        }

        // Negative review still pending → alert
        if (r.rating <= 2 && r.status === 'pending') {
          const hoursPending = Math.floor((Date.now() - reviewDate.getTime()) / 3600000)
          activity.push({
            id: `alert_${r.id}`,
            type: 'negative_alert',
            reviewer: r.reviewer_name ?? 'Someone',
            rating: r.rating,
            message: `⚠️ ${r.rating}-star review from ${firstName} — ${hoursPending > 0 ? `${hoursPending}h without reply` : 'reply needed'}`,
            time: reviewDate,
            read: false,
          })
        } else if (r.status === 'pending' && !resp) {
          // Any pending review = review_received event
          activity.push({
            id: `review_${r.id}`,
            type: 'review_received',
            reviewer: r.reviewer_name ?? 'Someone',
            rating: r.rating,
            message: `New ${r.rating}-star review received from ${firstName}`,
            time: reviewDate,
            read: true,
          })
        }
      }

      // Sort by time descending
      activity.sort((a, b) => b.time.getTime() - a.time.getTime())

      setItems(activity)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = items.filter(item => {
    if (filter === 'all')     return true
    if (filter === 'alerts')  return item.type === 'negative_alert'
    if (filter === 'replies') return item.type === 'reply_sent'
    if (filter === 'reviews') return item.type === 'review_received'
    return true
  })

  const unreadCount = items.filter(i => !i.read).length
  const repliesCount = items.filter(i => i.type === 'reply_sent').length
  const reviewsCount = items.filter(i => i.type === 'review_received').length
  const alertsCount  = items.filter(i => i.type === 'negative_alert').length

  function markAllRead() {
    setItems(prev => prev.map(i => ({ ...i, read: true })))
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Activity</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {loading ? 'Loading…' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-blue-400 px-3 py-2 rounded-lg"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-800/70 border border-slate-700/40 rounded-xl px-3 py-3 text-center">
            <p className="text-lg font-bold text-emerald-400 leading-none">{repliesCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Replies</p>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/40 rounded-xl px-3 py-3 text-center">
            <p className="text-lg font-bold text-blue-400 leading-none">{reviewsCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Reviews</p>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/40 rounded-xl px-3 py-3 text-center">
            <p className="text-lg font-bold text-red-400 leading-none">{alertsCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Alerts</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {loading ? (
            [0, 1, 2].map(i => (
              <div key={i} className="h-16 rounded-xl bg-slate-800/50 border border-slate-700/30 shimmer" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-300">No activity yet</p>
              <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                Once reviews come in and replies are sent, your activity will appear here.
              </p>
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                  !item.read
                    ? 'bg-slate-800/80 border-slate-600/60'
                    : 'bg-slate-800/40 border-slate-700/30'
                }`}
              >
                <TypeIcon type={item.type} rating={item.rating} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm font-medium leading-snug ${!item.read ? 'text-white' : 'text-slate-300'}`}>
                      {item.reviewer}
                    </p>
                    <StarRating rating={item.rating} />
                    {!item.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    )}
                  </div>
                  <p className={`text-xs leading-snug ${!item.read ? 'text-slate-300' : 'text-slate-500'}`}>
                    {item.message}
                  </p>
                </div>
                <span className="text-[11px] text-slate-600 shrink-0 mt-0.5 tabular-nums">
                  {timeAgo(item.time)}
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </AppShell>
  )
}
