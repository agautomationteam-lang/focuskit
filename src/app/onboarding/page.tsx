'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import ReplyKitLogo from '@/components/ReplyKitLogo'

const BUSINESS_TYPES = [
  { id: 'plumber',       label: 'Plumber',       icon: '🔧' },
  { id: 'electrician',   label: 'Electrician',   icon: '⚡' },
  { id: 'dentist',       label: 'Dentist',       icon: '🦷' },
  { id: 'coffee-shop',   label: 'Coffee Shop',   icon: '☕' },
  { id: 'barbershop',    label: 'Barbershop',    icon: '✂️' },
  { id: 'other',         label: 'Other',         icon: '→' },
]

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Formal and measured. Best for medical, legal, and financial businesses.' },
  { id: 'friendly',     label: 'Friendly',     desc: 'Warm and approachable. Great for cafés, retail, and hospitality.' },
  { id: 'casual',       label: 'Casual',       desc: 'Relaxed and conversational. Perfect for gyms, barbershops, and bars.' },
  { id: 'luxury',       label: 'Luxury',       desc: 'Elegant and refined. Ideal for spas, fine dining, and boutiques.' },
]

const GOOGLE_PERMISSIONS = [
  { label: 'View your Google reviews',    desc: 'Read incoming reviews across all your listings.' },
  { label: 'Post replies on your behalf', desc: 'Publish AI-drafted replies directly to Google.' },
  { label: 'View business information',   desc: 'Read your listing name, address, and category.' },
]

const TOTAL_STEPS = 4

// Step slide variants
const stepVariants = {
  enter:  (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir * -60, opacity: 0 }),
}
const stepTransition = { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }

export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep]           = useState(1)
  const [direction, setDirection] = useState(1)
  const [businessType, setType]   = useState('')
  const [yourName, setName]       = useState('')
  const [tone, setTone]           = useState('friendly')

  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [connecting, setConnecting]           = useState(false)
  const [connected, setConnected]             = useState(false)

  function advance() {
    setDirection(1)
    setStep(s => s + 1)
  }

  function completeOnboarding() {
    const name = yourName.trim() || businessType
    localStorage.setItem('rk_onboarding_done', 'true')
    localStorage.setItem('rk_business_name', name)
    localStorage.setItem('rk_business_type', businessType)
    localStorage.setItem('rk_tone', tone)
    localStorage.setItem('rk_show_welcome', 'true')
    // TODO: persist to Supabase when real auth is wired up
    // await supabase.from('businesses').upsert({ name, type: businessType, tone })
    router.push('/dashboard')
  }

  async function handleGoogleConnect() {
    setConnecting(true)
    await new Promise(r => setTimeout(r, 1800))
    setConnected(true)
    setConnecting(false)
    setShowGoogleModal(false)
  }

  const canAdvance = step === 1 ? !!businessType
                   : step === 2 ? !!yourName.trim()
                   : true

  return (
    <div className="min-h-screen bg-[#0b0d14] flex flex-col items-center px-4 pt-safe-top"
      style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top, 0px))' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <ReplyKitLogo size="md" />
        <span className="font-bold text-white text-[15px] tracking-tight">ReplyKit</span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i + 1 < step  ? 'w-5 h-2 bg-emerald-500' :
              i + 1 === step ? 'w-5 h-2 bg-blue-500' :
                               'w-2 h-2 bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Step card */}
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >

            {/* ── Step 1: Business type ─────────────────────────────────── */}
            {step === 1 && (
              <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl p-6 shadow-lg">
                <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">Step 1 of {TOTAL_STEPS}</p>
                <h2 className="text-lg font-bold text-white mb-1">What type of business?</h2>
                <p className="text-slate-400 text-sm mb-5">We tailor AI replies to your industry.</p>

                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {BUSINESS_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-xl border text-center transition-colors btn-press ${
                        businessType === t.id
                          ? 'bg-blue-600/15 border-blue-500/50 text-blue-300 ring-1 ring-blue-500/25'
                          : 'bg-slate-900/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="text-xl leading-none">{t.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{t.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={advance}
                  disabled={!businessType}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-colors btn-press shadow-sm"
                >
                  Continue →
                </button>
                <button onClick={completeOnboarding} className="w-full text-center text-xs text-slate-600 py-2.5 mt-1">
                  Skip onboarding →
                </button>
              </div>
            )}

            {/* ── Step 2: Your name ─────────────────────────────────────── */}
            {step === 2 && (
              <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl p-6 shadow-lg">
                <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">Step 2 of {TOTAL_STEPS}</p>
                <h2 className="text-lg font-bold text-white mb-1">What's your business name?</h2>
                <p className="text-slate-400 text-sm mb-5">This appears in your AI replies to customers.</p>

                <input
                  type="text"
                  value={yourName}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && yourName.trim()) advance() }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors mb-5"
                  placeholder="e.g. Sunrise Plumbing Co."
                  autoFocus
                />

                <button
                  onClick={advance}
                  disabled={!yourName.trim()}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-colors btn-press shadow-sm"
                >
                  Continue →
                </button>
                <button onClick={completeOnboarding} className="w-full text-center text-xs text-slate-600 py-2.5 mt-1">
                  Skip onboarding →
                </button>
              </div>
            )}

            {/* ── Step 3: Tone ──────────────────────────────────────────── */}
            {step === 3 && (
              <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl p-6 shadow-lg">
                <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">Step 3 of {TOTAL_STEPS}</p>
                <h2 className="text-lg font-bold text-white mb-1">How should we reply?</h2>
                <p className="text-slate-400 text-sm mb-5">Choose the tone for your AI-generated replies.</p>

                <div className="space-y-2 mb-5">
                  {TONES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors btn-press ${
                        tone === t.id
                          ? 'bg-blue-600/15 border-blue-500/50 ring-1 ring-blue-500/25'
                          : 'bg-slate-900/60 border-slate-700'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${tone === t.id ? 'text-blue-300' : 'text-slate-200'}`}>{t.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t.desc}</p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={advance}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold transition-colors btn-press shadow-sm"
                >
                  Continue →
                </button>
                <button onClick={completeOnboarding} className="w-full text-center text-xs text-slate-600 py-2.5 mt-1">
                  Skip onboarding →
                </button>
              </div>
            )}

            {/* ── Step 4: Connect Google ────────────────────────────────── */}
            {step === 4 && (
              <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl p-6 shadow-lg">
                <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">Step 4 of {TOTAL_STEPS}</p>
                <h2 className="text-lg font-bold text-white mb-1">Connect Google Business</h2>
                <p className="text-slate-400 text-sm mb-5">
                  Link your listing so ReplyKit can read reviews and post replies automatically.
                </p>

                {connected ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-4 mb-5 flex items-center gap-3 scale-pop">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-base shrink-0">✓</div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-300">{yourName || 'Business'} connected</p>
                      <p className="text-xs text-emerald-400/70">Google Business Profile linked</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-4 mb-5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm shrink-0">G</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Google Business Profile</p>
                      <p className="text-xs text-slate-500">Not connected</p>
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">Required</span>
                  </div>
                )}

                {!connected ? (
                  <button
                    onClick={() => setShowGoogleModal(true)}
                    className="w-full bg-white text-slate-900 rounded-xl py-3 text-sm font-bold transition-colors mb-3 btn-press shadow-sm"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="font-bold text-base leading-none">G</span>
                      Connect with Google
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={completeOnboarding}
                    className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold transition-colors mb-3 btn-press shadow-sm"
                  >
                    Finish setup →
                  </button>
                )}

                <button onClick={completeOnboarding} className="w-full text-center text-xs text-slate-600 py-2.5">
                  Skip for now →
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Google Permissions Bottom Sheet ───────────────────────────────── */}
      <AnimatePresence>
        {showGoogleModal && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setShowGoogleModal(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 rounded-t-3xl border-t border-slate-700/50 px-6 pt-4"
              style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-6" />

              <h3 className="text-base font-bold text-white mb-1">Authorize ReplyKit</h3>
              <p className="text-xs text-slate-400 mb-5">ReplyKit will have access to:</p>

              <div className="space-y-4 mb-7">
                {GOOGLE_PERMISSIONS.map(p => (
                  <div key={p.label} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white leading-tight">{p.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleGoogleConnect}
                disabled={connecting}
                className="w-full bg-white text-slate-900 rounded-xl py-3.5 text-sm font-bold disabled:opacity-60 transition-colors btn-press shadow-sm mb-3"
              >
                {connecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin inline-block text-slate-600">↻</span>
                    Connecting…
                  </span>
                ) : 'Authorize access'}
              </button>

              <button
                onClick={() => setShowGoogleModal(false)}
                className="w-full text-sm text-slate-500 py-2.5"
              >
                Not now
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
