'use client'

import Link from 'next/link'
import ReplyKitLogo from '@/components/ReplyKitLogo'

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
      <circle cx="7" cy="7" r="7" fill="rgb(16 185 129 / 0.2)"/>
      <path d="M4 7l2 2 4-4" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    popular: false,
    features: [
      '5 reviews/month',
      'AI-drafted replies',
      'Manual approve',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    popular: false,
    features: [
      '25 FREE AI replies included',
      'Unlimited reviews after that',
      'Pro & friendly drafts',
      '1-click publish',
      'Weekly digest',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$59',
    popular: true,
    features: [
      'Unlimited AI replies',
      'Auto-reply enabled',
      'All 4 tone options',
      'Priority support',
    ],
  },
]

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-[#0b0d14] flex flex-col items-center justify-center px-4 py-16">

      <Link href="/" className="flex items-center gap-2 mb-12">
        <ReplyKitLogo size="sm" />
        <span className="font-bold text-white text-[15px] tracking-tight">ReplyKit</span>
      </Link>

      <div className="w-full max-w-2xl">

        <div className="text-center mb-10">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">You're on the free plan</p>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-3">Unlock full protection</h1>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
            Your free plan covers 5 reviews. Every unanswered review after that is money walking out the door.
          </p>
        </div>

        {/* Coming soon notice */}
        <div className="mb-7 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-center">
          <p className="text-sm text-blue-300 font-medium">
            Paid plans launching soon — your pricing is locked in when you sign up today.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 border flex flex-col ${
                plan.popular
                  ? 'bg-blue-600/10 border-blue-500/40 ring-1 ring-blue-500/30'
                  : 'bg-slate-800/60 border-slate-700/50'
              }`}
            >
              {plan.popular && (
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">Most popular</span>
              )}
              <h2 className="text-lg font-bold text-white">{plan.name}</h2>
              <div className="mt-1 mb-5">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check/>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.id === 'free' ? (
                <Link
                  href="/dashboard"
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors btn-press bg-slate-700 text-white"
                >
                  Keep Free
                </Link>
              ) : (
              <Link
                href="/billing"
                className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors btn-press ${
                  plan.popular
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-white'
                }`}
              >
                Get {plan.name} — {plan.price}/month
              </Link>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mb-4">
          Cancel anytime. Billed monthly. No long-term contracts.
        </p>
        <div className="text-center">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
