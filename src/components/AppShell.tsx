'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import ReplyKitLogo from './ReplyKitLogo'

/* ── Desktop sidebar nav ────────────────────────────────────────────────── */
const SIDEBAR_NAV = [
  {
    href: '/dashboard', label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="6" height="6" rx="1.5"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/integrations', label: 'Integrations',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="3.5" cy="8" r="2"/>
        <circle cx="12.5" cy="3.5" r="2"/>
        <circle cx="12.5" cy="12.5" r="2"/>
        <path d="M5.5 8h2l2.5-4.5M5.5 8h2l2.5 4.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/activity', label: 'Activity',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <polyline points="15 8 12 8 9.5 14 6.5 2 4 8 1 8"/>
      </svg>
    ),
  },
  {
    href: '/settings', label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="2.5"/>
        <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/billing', label: 'Billing',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/>
        <path d="M1.5 6.5h13" strokeLinecap="round"/>
        <path d="M4.5 9.5h2M4.5 11h1" strokeLinecap="round"/>
      </svg>
    ),
  },
]

/* ── Mobile bottom tab bar (5 tabs) ─────────────────────────────────────── */
const BOTTOM_TABS = [
  {
    id: 'home',
    href: '/dashboard?tab=home',
    label: 'Home',
    match: (p: string) => p === '/dashboard',
    filled: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#60a5fa">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    ),
    outline: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10"/>
      </svg>
    ),
  },
  {
    id: 'reviews',
    href: '/dashboard?tab=reviews',
    label: 'Reviews',
    match: (p: string) => false, // controlled by lastTab state
    filled: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#60a5fa">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    ),
    outline: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    ),
  },
  {
    id: 'activity',
    href: '/activity',
    label: 'Activity',
    match: (p: string) => p.startsWith('/activity'),
    filled: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    outline: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    id: 'settings',
    href: '/settings',
    label: 'Settings',
    match: (p: string) => p.startsWith('/settings'),
    filled: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#60a5fa">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.07 7.07 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.37 1.04.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>
    ),
    outline: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="3.5"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M19.78 4.22l-2.12 2.12M6.34 17.66l-2.12 2.12"/>
      </svg>
    ),
  },
  {
    id: 'account',
    href: '/billing',
    label: 'Account',
    match: (p: string) => p.startsWith('/billing') || p.startsWith('/upgrade'),
    filled: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#60a5fa">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    ),
    outline: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
]

interface Props {
  children: React.ReactNode
  businessName?: string
}

export default function AppShell({ children, businessName }: Props) {
  const pathname = usePathname()

  // Track which dashboard sub-tab is active (Home vs Reviews)
  const [lastDashTab, setLastDashTab] = useState<string>('home')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('tab')
    const saved = (fromUrl === 'home' || fromUrl === 'reviews')
      ? fromUrl
      : (localStorage.getItem('rk_last_dash_tab') ?? 'home')
    setLastDashTab(saved)
  }, [pathname])

  function tabIsActive(tab: typeof BOTTOM_TABS[number]) {
    if (tab.id === 'home') return pathname === '/dashboard' && lastDashTab === 'home'
    if (tab.id === 'reviews') return pathname === '/dashboard' && lastDashTab === 'reviews'
    return tab.match(pathname)
  }

  function handleTabClick(tab: typeof BOTTOM_TABS[number]) {
    if (tab.id === 'home' || tab.id === 'reviews') {
      localStorage.setItem('rk_last_dash_tab', tab.id)
      setLastDashTab(tab.id)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0b0d14]">

      {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-52 bg-slate-900 border-r border-slate-800 z-30">

        <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2.5">
          <ReplyKitLogo size="md" />
          <div className="min-w-0">
            <p className="font-bold text-white text-[14px] tracking-tight leading-none">ReplyKit</p>
            {businessName && <p className="text-[11px] text-slate-500 truncate mt-0.5">{businessName}</p>}
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {SIDEBAR_NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  active ? 'bg-white/10 text-white' : 'text-slate-400 active:text-slate-200 active:bg-white/5'
                }`}
              >
                <span className={active ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          <Link
            href="/billing"
            className="ripple flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-blue-600/15 border border-blue-500/25 text-blue-400 text-xs font-semibold"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 10V2M2 6l4-4 4 4"/>
            </svg>
            Upgrade to Pro
          </Link>
          <p className="text-[10px] text-slate-600 px-1 text-center">Free plan · 5 review limit</p>
        </div>
      </aside>

      {/* ── Mobile Topbar ────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-[#0b0d14] border-b border-slate-800/80 mobile-topbar-shell">
        <div className="h-11 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ReplyKitLogo size="sm" />
            <span className="font-bold text-white text-[13px] tracking-tight">ReplyKit</span>
            {businessName && (
              <span className="text-[11px] text-slate-500 truncate max-w-[120px]">· {businessName}</span>
            )}
          </div>
          <Link
            href="/billing"
            className="ripple text-[11px] font-bold text-blue-400 bg-blue-600/10 border border-blue-500/25 px-2.5 py-1 rounded-md"
          >
            Upgrade
          </Link>
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar (5 tabs) ────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0b0d14] border-t border-slate-800/80 mobile-bottom-nav-shell"
      >
        <div className="flex h-14">
          {BOTTOM_TABS.map(tab => {
            const active = tabIsActive(tab)
            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => handleTabClick(tab)}
                className="flex-1 flex flex-col items-center justify-center gap-[2px] relative ripple"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-b-sm bg-blue-400" />
                )}
                {active ? tab.filled : tab.outline}
                <span className={`text-[10px] font-semibold leading-none tracking-wide ${active ? 'text-blue-400' : 'text-slate-500'}`}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Content Area (keyed on pathname for page transition) ──────── */}
      <div className="flex-1 lg:ml-52 min-h-screen app-content-mobile">
        <div key={pathname} className="tab-enter min-h-full">
          {children}
        </div>
      </div>

    </div>
  )
}
