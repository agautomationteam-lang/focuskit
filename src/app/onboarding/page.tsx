'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const BUSINESS_TYPES = [
  { id: 'restaurant',    label: 'Restaurant / Café' },
  { id: 'retail',        label: 'Retail Shop' },
  { id: 'health',        label: 'Health & Beauty' },
  { id: 'auto',          label: 'Auto & Transport' },
  { id: 'professional',  label: 'Professional Services' },
  { id: 'home',          label: 'Home Services' },
  { id: 'other',         label: 'Other' },
]

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Formal and measured. Best for medical, legal, and financial businesses.' },
  { id: 'friendly',     label: 'Friendly',     desc: 'Warm and approachable. Great for cafes, retail, and hospitality.' },
  { id: 'casual',       label: 'Casual',       desc: 'Relaxed and conversational. Perfect for gyms, barbershops, and bars.' },
  { id: 'luxury',       label: 'Luxury',       desc: 'Elegant and refined. Ideal for spas, fine dining, and boutique hotels.' },
]

const CHECKLIST = [
  'Google Business Profile connected',
  'AI reply engine activated',
  'Negative review alerts enabled',
  'Auto-reply configured',
]

const TOTAL_STEPS = 4

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]             = useState(1)
  const [businessName, setName]     = useState('')
  const [businessType, setType]     = useState('')
  const [tone, setTone]             = useState('friendly')
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected]   = useState(false)
  const [success, setSuccess]       = useState(false)

  function next() { setStep(s => s + 1) }

  async function handleConnect() {
    setConnecting(true)
    await new Promise(r => setTimeout(r, 2000))
    setConnected(true)
    setConnecting(false)
  }

  function goToDashboard() {
    router.push('/dashboard')
  }

  // ── Success screen ───────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-[#0b0d14] flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="scale-pop w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-4xl mx-auto mb-6">
          🛡
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 fade-in">
          {businessName || 'Your business'} is now protected 24/7
        </h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed fade-in">
          ReplyKit is watching for new reviews. Negative ones get flagged instantly — and replied to before they do damage.
        </p>

        <div className="w-full max-w-sm bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mb-8 text-left fade-in">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">What's ready</p>
          <ul className="space-y-3">
            {CHECKLIST.map(item => (
              <li key={item} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs shrink-0">✓</span>
                <span className="text-sm text-slate-200">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={goToDashboard}
          className="w-full max-w-sm bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-500 transition-colors shadow-sm btn-press"
        >
          Open dashboard →
        </button>
        <p className="text-xs text-slate-600 mt-4">
          You can adjust settings, tone, and integrations at any time.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0d14] flex flex-col items-center justify-center px-4 py-12">

      <Link href="/" className="flex items-center gap-2 mb-12">
        <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">R</span>
        <span className="font-bold text-white text-[15px] tracking-tight">ReplyKit</span>
      </Link>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              n < step  ? 'bg-emerald-500 text-white' :
              n === step ? 'bg-blue-600 text-white' :
                           'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {n < step ? '✓' : n}
            </div>
            {n < TOTAL_STEPS && <div className={`w-6 h-0.5 rounded-full ${n < step ? 'bg-emerald-500' : 'bg-slate-800'}`}/>}
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm">

        {/* Step 1 — Business name */}
        {step === 1 && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 shadow-xl fade-in">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Step 1 of {TOTAL_STEPS}</p>
            <h2 className="text-xl font-bold text-white mb-1">What's your business called?</h2>
            <p className="text-slate-400 text-sm mb-6">This appears in your replies to customers.</p>
            <input
              type="text"
              value={businessName}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors mb-5"
              placeholder="e.g. Sunrise Bakery"
              autoFocus
            />
            <button
              onClick={next}
              disabled={!businessName.trim()}
              className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 transition-colors btn-press"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Business type */}
        {step === 2 && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 shadow-xl fade-in">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Step 2 of {TOTAL_STEPS}</p>
            <h2 className="text-xl font-bold text-white mb-1">What kind of business is it?</h2>
            <p className="text-slate-400 text-sm mb-6">Helps us tailor your AI replies to your industry.</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {BUSINESS_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all border btn-press ${
                    businessType === t.id
                      ? 'bg-blue-600/15 border-blue-500/50 text-blue-300 ring-1 ring-blue-500/30'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={next}
              disabled={!businessType}
              className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 transition-colors btn-press"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 3 — Tone */}
        {step === 3 && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 shadow-xl fade-in">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Step 3 of {TOTAL_STEPS}</p>
            <h2 className="text-xl font-bold text-white mb-1">Choose your reply tone</h2>
            <p className="text-slate-400 text-sm mb-6">You can change this any time in Settings.</p>
            <div className="space-y-2.5 mb-6">
              {TONES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all btn-press ${
                    tone === t.id
                      ? 'bg-blue-600/15 border-blue-500/50 ring-1 ring-blue-500/30'
                      : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <p className={`text-sm font-semibold ${tone === t.id ? 'text-blue-300' : 'text-slate-200'}`}>{t.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={next} className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-500 transition-colors btn-press">
              Continue →
            </button>
          </div>
        )}

        {/* Step 4 — Google connect */}
        {step === 4 && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 shadow-xl fade-in">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Step 4 of {TOTAL_STEPS}</p>
            <h2 className="text-xl font-bold text-white mb-1">Connect Google Business</h2>
            <p className="text-slate-400 text-sm mb-6">
              ReplyKit needs access to read and reply to your Google reviews.
            </p>

            {connected ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-4 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-base shrink-0">✓</div>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">{businessName} connected</p>
                  <p className="text-xs text-emerald-400/70">Google Business Profile linked successfully</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 shrink-0">G</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Google Business Profile</p>
                  <p className="text-xs text-slate-500">Not connected</p>
                </div>
              </div>
            )}

            {!connected ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full bg-white text-slate-900 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-100 disabled:opacity-60 transition-colors mb-3 btn-press"
              >
                {connecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin inline-block">↻</span>
                    Connecting…
                  </span>
                ) : (
                  'Connect with Google'
                )}
              </button>
            ) : (
              <button
                onClick={() => setSuccess(true)}
                className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-500 transition-colors mb-3 btn-press"
              >
                Finish setup →
              </button>
            )}

            <button
              onClick={() => setSuccess(true)}
              className="w-full text-sm text-slate-500 hover:text-slate-300 py-2 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
