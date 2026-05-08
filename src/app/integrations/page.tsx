'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  category: string
  connected: boolean
  comingSoon?: boolean
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'google',
    name: 'Google Business Profile',
    description: 'Import reviews and post AI-generated replies directly to your Google listing.',
    icon: 'G',
    category: 'Reviews',
    connected: true,
  },
  {
    id: 'maps',
    name: 'Google Maps',
    description: 'Sync your Google Maps listing status and review volume in real time.',
    icon: '📍',
    category: 'Reviews',
    connected: true,
  },
  {
    id: 'yelp',
    name: 'Yelp',
    description: 'Respond to Yelp reviews with the same AI-powered workflow.',
    icon: 'Y',
    category: 'Reviews',
    connected: false,
    comingSoon: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get instant alerts in Slack when a new negative review arrives.',
    icon: '#',
    category: 'Notifications',
    connected: false,
  },
  {
    id: 'email',
    name: 'Email Digest',
    description: 'Receive a weekly summary of all reviews and replies to your inbox.',
    icon: '✉',
    category: 'Notifications',
    connected: true,
  },
]

function IntegrationCard({ integration }: { integration: Integration }) {
  const [connected, setConnected] = useState(integration.connected)
  const [loading, setLoading]     = useState(false)

  async function toggle() {
    if (integration.comingSoon) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setConnected(!connected)
    setLoading(false)
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
        connected ? 'bg-blue-600/20 text-blue-300' : 'bg-slate-700 text-slate-400'
      }`}>
        {integration.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{integration.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{integration.category}</p>
          </div>
          {connected ? (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1 h-1 rounded-full bg-emerald-400"/>
              Connected
            </span>
          ) : integration.comingSoon ? (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-700 text-slate-500 border border-slate-600">
              Soon
            </span>
          ) : null}
        </div>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{integration.description}</p>
        <button
          onClick={toggle}
          disabled={loading || integration.comingSoon}
          className={`mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
            integration.comingSoon
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : connected
              ? 'bg-slate-700 text-slate-400'
              : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
          }`}
        >
          {loading
            ? 'Working…'
            : integration.comingSoon
            ? 'Coming soon'
            : connected
            ? 'Disconnect'
            : 'Connect'}
        </button>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const categories = [...new Set(INTEGRATIONS.map(i => i.category))]

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-xl font-bold text-white tracking-tight">Integrations</h1>
          <p className="text-slate-400 text-sm mt-1">Connect ReplyKit to the tools you already use.</p>
        </div>

        <div className="space-y-8">
          {categories.map(cat => (
            <div key={cat}>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{cat}</h2>
              <div className="space-y-3">
                {INTEGRATIONS.filter(i => i.category === cat).map(integration => (
                  <IntegrationCard key={integration.id} integration={integration} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
