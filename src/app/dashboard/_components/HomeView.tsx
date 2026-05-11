'use client'

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
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec}s ago`
  return `${Math.floor(sec / 60)}m ago`
}

interface HomeViewProps {
  businessName: string
  handled: number
  negRecovered: number
  avgReplyTime: string
  pending: number
  activityLog: ActivityEvent[]
  showWelcome: boolean
  welcomeName: string
  onDismissWelcome: () => void
  onGoToReviews: () => void
  demo?: boolean
  googleConnected?: boolean
}

export default function HomeView({
  businessName,
  handled,
  negRecovered,
  avgReplyTime,
  pending,
  activityLog,
  showWelcome,
  welcomeName,
  onDismissWelcome,
  onGoToReviews,
  demo = false,
  googleConnected = false,
}: HomeViewProps) {
  return (
    <main className="android-screen max-w-3xl mx-auto px-4 py-5 sm:py-8 space-y-4 sm:space-y-5">

      {/* Welcome banner (shown once after onboarding) */}
      {showWelcome && (
        <div className="android-card flex items-start gap-3 px-4 py-3.5 slide-in-down">
          <span className="text-xl leading-none shrink-0 mt-0.5">👋</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-snug">
              Welcome{welcomeName ? `, ${welcomeName}` : ''}!
            </p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Your AI review manager is ready. Swipe right on reviews to approve, left to skip.
            </p>
          </div>
          <button
            onClick={onDismissWelcome}
            className="text-slate-500 shrink-0 text-xl leading-none mt-0.5"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 fade-in">
        <div className="android-card px-3 py-3.5 text-center">
          <p className="text-[22px] font-bold text-white leading-none tabular-nums">{handled}</p>
          <p className="text-xs text-slate-400 mt-1.5">Replies sent</p>
        </div>
        <div className="android-card px-3 py-3.5 text-center">
          <p className="text-[22px] font-bold text-emerald-400 leading-none tabular-nums">{negRecovered}</p>
          <p className="text-xs text-slate-400 mt-1.5">Bad reviews saved</p>
        </div>
        <div className="android-card px-3 py-3.5 text-center">
          <p className="text-[22px] font-bold text-blue-400 leading-none tabular-nums">
            {avgReplyTime === '--' ? '--' : `${avgReplyTime}s`}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">Avg reply time</p>
        </div>
      </div>

      {/* Hero card */}
      <div className="android-card px-5 py-6 fade-in">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #00D9FF 100%)' }}
          >
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="1" width="18" height="13" rx="3" fill="white" opacity="0.95" />
              <polygon points="2,14 2,18 6,14" fill="white" opacity="0.95" />
              <path d="M5 7.5L8.5 11L15 5.5" stroke="#4F46E5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white leading-snug">Your AI Review Manager</h2>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              {businessName ? `${businessName} is` : 'Your business is'} protected. AI-crafted replies post in seconds — no manual work needed.
            </p>
          </div>
        </div>

        {pending > 0 && (
          <div className="mb-3 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <span className="text-sm">⚠️</span>
            <p className="text-sm text-amber-300 font-medium flex-1">
              {pending} review{pending !== 1 ? 's' : ''} waiting for a reply
            </p>
          </div>
        )}

        {!demo && !googleConnected ? (
          <div>
            <a
              href="/api/auth/google"
              className="android-primary-action w-full flex items-center justify-center gap-2 text-sm shadow-sm mb-2"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #00D9FF 100%)', color: '#fff' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity="0.9">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Business →
            </a>
            <p className="text-[11px] text-slate-600 text-center leading-relaxed">
              Google verification pending — if you see &apos;access blocked&apos;, email support@replykit.com
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-semibold text-emerald-300">Google Business connected · real reviews enabled</p>
            </div>
            <button
              onClick={onGoToReviews}
              className="android-primary-action w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm shadow-sm transition-colors"
            >
              {pending > 0
                ? `Reply to ${pending} review${pending !== 1 ? 's' : ''} ->`
                : 'Open Review Inbox ->'}
            </button>
          </div>
        )}
      </div>

      {/* Recent activity */}
      {activityLog.length > 0 ? (
        <div className="android-card overflow-hidden fade-in">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Recent Activity</span>
          </div>
          <div className="divide-y divide-slate-800/50">
            {activityLog.slice(0, 4).map(event => (
              <div key={event.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className={`text-sm leading-none ${event.type === 'reply' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {event.type === 'reply' ? '✓' : '★'}
                </span>
                <span className="text-xs text-slate-300 flex-1">
                  {event.type === 'reply'
                    ? <><strong>{event.name.split(' ')[0]}</strong> replied to in {event.replyTime}s</>
                    : <>New {event.rating}★ from <strong>{event.name.split(' ')[0]}</strong></>
                  }
                </span>
                <span className="text-[11px] text-slate-600 tabular-nums shrink-0">
                  {activityTimeAgo(event.time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 px-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center text-2xl mx-auto mb-4">📊</div>
          <p className="text-sm font-semibold text-slate-300">No activity yet</p>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto">
            Once reviews start coming in, live updates will appear here.
          </p>
          <button
            onClick={onGoToReviews}
            className="mt-5 inline-flex items-center gap-2 bg-blue-600/15 text-blue-400 border border-blue-500/25 px-5 py-2 rounded-xl text-sm font-medium"
          >
            View Review Inbox →
          </button>
        </div>
      )}

    </main>
  )
}
