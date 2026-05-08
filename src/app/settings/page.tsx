'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`}/>
    </button>
  )
}

const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'friendly',     label: 'Friendly' },
  { id: 'casual',       label: 'Casual' },
  { id: 'luxury',       label: 'Luxury' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [tone, setTone]                 = useState('friendly')
  const [autoReply, setAutoReply]       = useState(true)
  const [subscriptionStatus, setSub]    = useState('trial')
  const [saved, setSaved]               = useState(false)
  const [saving, setSaving]             = useState(false)
  const [loading, setLoading]           = useState(true)
  const [bizId, setBizId]               = useState<string | null>(null)
  const [loggingOut, setLoggingOut]     = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: biz }, { data: userRow }] = await Promise.all([
        supabase.from('businesses').select('id, name, tone, auto_reply_enabled').eq('user_id', user.id).maybeSingle(),
        supabase.from('users').select('subscription_status').eq('id', user.id).single(),
      ])

      if (biz) {
        setBizId(biz.id)
        setBusinessName(biz.name ?? '')
        setTone(biz.tone ?? 'friendly')
        setAutoReply(biz.auto_reply_enabled ?? true)
      }
      if (userRow) setSub(userRow.subscription_status ?? 'trial')
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!bizId) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('businesses').update({
      name: businessName,
      tone,
      auto_reply_enabled: autoReply,
    }).eq('id', bizId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    const rkKeys = Object.keys(localStorage).filter(k => k.startsWith('rk_'))
    rkKeys.forEach(k => localStorage.removeItem(k))
    router.push('/')
  }

  const planLabel = subscriptionStatus === 'active' ? 'Pro' : subscriptionStatus === 'starter' ? 'Starter' : 'Free trial'

  return (
    <AppShell businessName={businessName}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your business and reply preferences.</p>
        </div>

        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 shimmer">
                <div className="h-3 w-24 bg-slate-700 rounded mb-4"/>
                <div className="h-9 bg-slate-700/60 rounded-lg"/>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">

            {/* Business */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-white mb-4">Business</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Business name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1.5">Used in AI-generated replies to customers.</p>
              </div>
            </div>

            {/* Reply tone */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-white mb-4">Reply tone</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium text-left transition-colors border ${
                      tone === t.id
                        ? 'bg-blue-600/15 border-blue-500/50 text-blue-300 ring-1 ring-blue-500/30'
                        : 'bg-slate-900/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Automation */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-white mb-4">Automation</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Auto-reply</p>
                    <p className="text-xs text-slate-500 mt-0.5">Post AI replies immediately without approval</p>
                  </div>
                  <Toggle enabled={autoReply} onChange={setAutoReply}/>
                </div>
              </div>
            </div>

            {/* Account */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-white mb-4">Account</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Plan</p>
                    <p className="text-sm text-slate-200 mt-0.5">{planLabel}</p>
                  </div>
                  {subscriptionStatus !== 'active' && (
                    <Link
                      href="/billing"
                      className="text-xs font-semibold text-blue-400 bg-blue-600/10 border border-blue-500/25 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
                <div className="border-t border-slate-700/50"/>
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">Support</p>
                  <Link href="/contact" className="text-xs text-slate-400 transition-colors">
                    Contact support →
                  </Link>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !bizId}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {saved && (
                <span className="text-xs text-emerald-400 font-medium fade-in">✓ Saved</span>
              )}
            </div>

            {/* Logout */}
            <div className="pt-4 border-t border-slate-700/40">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 text-sm text-red-400 font-medium py-2 disabled:opacity-50 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M10 2h3.5a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10M6.5 11 10 8l-3.5-3M10 8H1.5"/>
                </svg>
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  )
}
