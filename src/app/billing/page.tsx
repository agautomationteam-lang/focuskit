'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

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
    id: 'starter',
    name: 'Starter',
    price: '$29',
    // TODO: Stripe price_id → price_1xxx_starter ($29/mo = 2900 cents)
    stripeAmount: 2900,
    popular: false,
    tag: '5 replies/mo',
    features: [
      '5 AI-generated replies/month',
      'Professional & friendly drafts',
      'Manual approve before posting',
      'Weekly email digest',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$59',
    // TODO: Stripe price_id → price_1xxx_pro ($59/mo = 5900 cents)
    stripeAmount: 5900,
    popular: true,
    tag: 'Unlimited · Auto-post',
    features: [
      'Unlimited AI-generated replies',
      'All 4 tone options',
      'Auto-reply — zero manual effort',
      'Negative review instant alerts',
      'Priority support',
    ],
  },
]

export default function BillingPage() {
  const [notified, setNotified] = useState<string | null>(null)

  // TODO: Replace handleNotify with Stripe checkout when payment integration is ready
  function handleNotify(plan: string) {
    setNotified(plan)
    setTimeout(() => setNotified(null), 3000)
  }

  return (
    <AppShell businessName="Demo Coffee Shop">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-xl font-bold text-white tracking-tight">Billing</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your plan and subscription.</p>
        </div>

        {/* Current plan */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Current plan</p>
            <p className="text-base font-bold text-white">Free</p>
            <p className="text-xs text-slate-400 mt-0.5">5 reviews/month · Upgrade to unlock unlimited</p>
          </div>
          <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-700 text-slate-400 border border-slate-600">
            Free plan
          </span>
        </div>

        {/* Payment coming soon notice */}
        <div className="mb-7 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-blue-400"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <div>
            <p className="text-sm font-semibold text-blue-300">Paid plans launching soon</p>
            <p className="text-xs text-blue-400/70 mt-0.5 leading-relaxed">
              Sign up now to lock in your pricing. You'll receive an email the moment payment goes live.
            </p>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 border flex flex-col transition-all ${
                plan.popular
                  ? 'bg-blue-600/10 border-blue-500/40 ring-1 ring-blue-500/30'
                  : 'bg-slate-800/60 border-slate-700/50'
              }`}
            >
              {plan.popular && (
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">Most popular</span>
              )}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full shrink-0 mt-0.5">{plan.tag}</span>
              </div>
              <div className="mt-0 mb-5">
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
              {/* TODO: Wire Stripe checkout →
                   fetch('/api/stripe/checkout', {
                     method: 'POST',
                     body: JSON.stringify({ planId: plan.id, amount: plan.stripeAmount })
                   })
                   Starter = $29/mo (2900 cents), Pro = $59/mo (5900 cents) */}
              <button
                onClick={() => handleNotify(plan.id)}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors btn-press ${
                  notified === plan.id
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : plan.popular
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-white'
                }`}
              >
                {notified === plan.id ? '✓ You\'ll be notified' : `Get ${plan.name} — ${plan.price}/mo`}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center space-y-1.5">
          <p className="text-xs text-slate-500">Cancel anytime. Billed monthly. No long-term contracts.</p>
          <p className="text-xs text-slate-600">
            Questions?{' '}
            <Link href="/contact" className="text-slate-400 transition-colors">
              Contact support →
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  )
}
