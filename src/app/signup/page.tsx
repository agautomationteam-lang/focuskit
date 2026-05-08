'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ReplyKitLogo from '@/components/ReplyKitLogo'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.session) {
      router.push('/onboarding')
    } else {
      setCheckEmail(true)
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-[#0b0d14] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-2xl mx-auto mb-5">📬</div>
        <h1 className="text-xl font-bold text-white mb-3">Check your email</h1>
        <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
          We sent a confirmation link to <strong className="text-slate-200">{email}</strong>.
          Click it to activate your account.
        </p>
        <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
          ← Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0d14] flex flex-col items-center justify-center px-4">

      <Link href="/" className="flex items-center gap-2 mb-10">
        <ReplyKitLogo size="sm" />
        <span className="font-bold text-white text-[15px] tracking-tight">ReplyKit</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-slate-400 text-sm mb-7">Free forever — no credit card required</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-sm mt-1"
            >
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-4">
            By signing up you agree to our Terms of Service
          </p>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
