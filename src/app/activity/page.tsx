'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'

interface ActivityItem {
  id: string
  type: 'reply_sent' | 'review_received' | 'auto_reply' | 'negative_alert'
  reviewer: string
  rating: number
  message: string
  time: string
  read: boolean
}

const DEMO_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    type: 'auto_reply',
    reviewer: 'Sarah Mitchell',
    rating: 5,
    message: 'AI auto-replied to Sarah\'s 5-star review in 2.1s',
    time: '2m ago',
    read: false,
  },
  {
    id: '2',
    type: 'negative_alert',
    reviewer: 'Tom Davies',
    rating: 1,
    message: '⚠️ 1-star review from Tom — reply needed',
    time: '14m ago',
    read: false,
  },
  {
    id: '3',
    type: 'review_received',
    reviewer: 'Priya Sharma',
    rating: 4,
    message: 'New 4-star review received from Priya',
    time: '38m ago',
    read: true,
  },
  {
    id: '4',
    type: 'reply_sent',
    reviewer: 'James Park',
    rating: 3,
    message: 'You replied to James\'s 3-star review',
    time: '1h ago',
    read: true,
  },
  {
    id: '5',
    type: 'auto_reply',
    reviewer: 'Amelia Brooks',
    rating: 5,
    message: 'AI auto-replied to Amelia\'s 5-star review in 1.8s',
    time: '2h ago',
    read: true,
  },
  {
    id: '6',
    type: 'negative_alert',
    reviewer: 'Kevin Wu',
    rating: 2,
    message: '⚠️ 2-star review from Kevin — 4h without reply',
    time: '4h ago',
    read: true,
  },
  {
    id: '7',
    type: 'reply_sent',
    reviewer: 'Nina Clarke',
    rating: 5,
    message: 'You replied to Nina\'s 5-star review',
    time: '6h ago',
    read: true,
  },
  {
    id: '8',
    type: 'auto_reply',
    reviewer: 'Marcus Johnson',
    rating: 4,
    message: 'AI auto-replied to Marcus\'s 4-star review in 2.4s',
    time: 'Yesterday',
    read: true,
  },
  {
    id: '9',
    type: 'review_received',
    reviewer: 'Lisa Tan',
    rating: 5,
    message: 'New 5-star review received from Lisa',
    time: 'Yesterday',
    read: true,
  },
  {
    id: '10',
    type: 'negative_alert',
    reviewer: 'Robert Bell',
    rating: 1,
    message: '⚠️ 1-star review from Robert — replied in 12 mins',
    time: '2 days ago',
    read: true,
  },
]

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

function typeIcon(type: ActivityItem['type'], rating: number) {
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
  if (type === 'auto_reply' || type === 'reply_sent') {
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
  { id: 'all',      label: 'All' },
  { id: 'alerts',   label: 'Alerts' },
  { id: 'replies',  label: 'Replies' },
  { id: 'reviews',  label: 'Reviews' },
] as const
type FilterTab = typeof FILTER_TABS[number]['id']

export default function ActivityPage() {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [items, setItems]   = useState<ActivityItem[]>(DEMO_ACTIVITY)

  const filtered = items.filter(item => {
    if (filter === 'all')     return true
    if (filter === 'alerts')  return item.type === 'negative_alert'
    if (filter === 'replies') return item.type === 'auto_reply' || item.type === 'reply_sent'
    if (filter === 'reviews') return item.type === 'review_received'
    return true
  })

  const unreadCount = items.filter(i => !i.read).length

  function markAllRead() {
    setItems(prev => prev.map(i => ({ ...i, read: true })))
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Activity</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-blue-400 ripple px-3 py-2 rounded-lg"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-800/70 border border-slate-700/40 rounded-xl px-3 py-3 text-center native-card">
            <p className="text-lg font-bold text-emerald-400 leading-none">
              {items.filter(i => i.type === 'auto_reply' || i.type === 'reply_sent').length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Replies</p>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/40 rounded-xl px-3 py-3 text-center native-card">
            <p className="text-lg font-bold text-blue-400 leading-none">
              {items.filter(i => i.type === 'review_received').length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Reviews</p>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/40 rounded-xl px-3 py-3 text-center native-card">
            <p className="text-lg font-bold text-red-400 leading-none">
              {items.filter(i => i.type === 'negative_alert').length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Alerts</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full font-medium transition-colors ripple ${
                filter === tab.id
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Activity list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-400">No activity in this category</p>
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors native-card ${
                  !item.read
                    ? 'bg-slate-800/80 border-slate-600/60'
                    : 'bg-slate-800/40 border-slate-700/30'
                }`}
              >
                {typeIcon(item.type, item.rating)}
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
                <span className="text-[11px] text-slate-600 shrink-0 mt-0.5 tabular-nums">{item.time}</span>
              </div>
            ))
          )}
        </div>

      </div>
    </AppShell>
  )
}
