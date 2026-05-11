'use client'

import { useState } from 'react'
import Link from 'next/link'
import ReplyKitLogo from '@/components/ReplyKitLogo'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    await new Promise(r => setTimeout(r, 1200))
    setSending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0b0d14] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-2xl mx-auto mb-5">✓</div>
        <h1 className="text-xl font-bold text-white mb-2">Message sent!</h1>
        <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
          We typically reply within a few hours. Check your inbox at <strong className="text-slate-200">{form.email}</strong>.
        </p>
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">← Back to home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0d14] flex flex-col items-center justify-center px-4 py-16">

      <Link href="/" className="flex items-center gap-2 mb-12">
        <ReplyKitLogo size="sm" />
        <span className="font-bold text-white text-[15px] tracking-tight">ReplyKit</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Get in touch</h1>
          <p className="text-slate-400 text-sm">We're a small team and read every message personally.</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Subject</label>
              <select
                value={form.subject}
                onChange={e => set('subject', e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">Select a topic…</option>
                <option value="billing">Billing & subscription</option>
                <option value="technical">Technical issue</option>
                <option value="feature">Feature request</option>
                <option value="other">Something else</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => set('message', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none leading-relaxed"
                placeholder="Tell us what's on your mind…"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-sm"
            >
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-600">
          <span>agautomationteam@gmail.com</span>
          <span>·</span>
          <span>Typically replies within a few hours</span>
        </div>
      </div>
    </div>
  )
}
