'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    popular: false,
    tag: '5 replies/mo',
    features: [
      '5 AI-generated replies/month',
      'Professional & friendly drafts',
      '1-click approve & publish',
      'Weekly email digest',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$59',
    popular: true,
    tag: 'Unlimited · Auto-post',
    features: [
      'Unlimited AI replies',
      'Auto-reply — zero manual effort',
      'All 4 tone options',
      'Negative review instant alerts',
      'Priority support',
    ],
  },
]

export default function BillingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function handleCheckout(planId: string) {
    setLoading(planId)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })

      if (res.status === 401) {
        router.push('/login?redirect=/billing')
        return
      }

      if (res.status === 400) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Already subscribed')
        setLoading(null)
        return
      }

      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Checkout failed — try again')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(null)
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-xl font-bold text-white tracking-tight">Billing</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your plan and subscription.</p>
        </div>

        {error && (
          <div className="mb-5 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 fade-in">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 border flex flex-col transition-colors ${
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
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading !== null}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors btn-press disabled:opacity-60 ${
                  plan.popular
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-white'
                }`}
              >
                {loading === plan.id
                  ? 'Opening checkout…'
                  : `Get ${plan.name} — ${plan.price}/month`}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center space-y-1.5">
          <p className="text-xs text-slate-500">Cancel anytime. Billed monthly. Secured by Stripe.</p>
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
