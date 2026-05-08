interface HeaderProps {
  businessName: string
  userEmail: string
  subscriptionStatus: string
  googleConnected?: boolean
}

export default function Header({ businessName, googleConnected = false }: HeaderProps) {
  return (
    <header className="hidden lg:block bg-slate-900 border-b border-slate-800 px-4 py-3.5 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
        <span className="text-sm text-slate-300 font-semibold truncate">{businessName}</span>
        {googleConnected ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Google Business · Connected
          </span>
        ) : (
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0"
          >
            Connect Google Business →
          </a>
        )}
      </div>
    </header>
  )
}
