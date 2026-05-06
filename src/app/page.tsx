import Link from 'next/link'
import MobileRedirect from './mobile-redirect'

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
      <circle cx="7" cy="7" r="7" fill="rgb(16 185 129 / 0.2)"/>
      <path d="M4 7l2 2 4-4" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const STEPS = [
  { n: '01', title: 'Connect Google Business', body: 'Link your Google Business Profile in one click. ReplyKit instantly imports your existing reviews.' },
  { n: '02', title: 'AI writes the perfect reply', body: 'Our AI reads each review and generates a professional, on-brand response in seconds — tailored by tone and star rating.' },
  { n: '03', title: 'Replies go live automatically', body: 'Auto-reply mode posts immediately. Or review drafts and approve with one tap. Either way, no review goes unanswered.' },
]

const TESTIMONIALS = [
  { name: 'Maria L.', biz: 'Sunrise Bakery', text: 'We went from ignoring reviews to replying to every single one. Our rating went from 3.8 to 4.5 in two months.' },
  { name: 'James K.', biz: 'Peak Auto Repair', text: 'A customer left a 1-star review on a Friday night. ReplyKit replied within seconds. By Monday they updated to 4 stars.' },
  { name: 'Priya N.', biz: 'Bloom Beauty Salon', text: 'I used to spend 30 minutes a week writing replies. Now it\'s zero. And the replies are better than what I wrote myself.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0d14] text-slate-300">
      {/* Redirect mobile visitors straight to dashboard */}
      <MobileRedirect />

      {/* ── Desktop Nav only ─────────────────────────── */}
      <nav className="sticky top-0 z-20 bg-[#0b0d14]/90 backdrop-blur border-b border-slate-800/60 px-4 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">R</span>
            <span className="font-bold text-white text-[15px] tracking-tight">ReplyKit</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors font-medium px-2">Sign in</Link>
            <a
              href="/ReplyKit.apk"
              download
              className="flex items-center gap-1.5 text-sm font-semibold border border-slate-600 text-slate-300 px-3.5 py-2 rounded-lg hover:border-slate-400 hover:text-white transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v8M3 6.5l3.5 3.5 3.5-3.5M1.5 11.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Android APK
            </a>
            <Link href="/signup" className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors">Get started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3.5 py-1.5 text-xs font-semibold text-emerald-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          Now with AI auto-reply
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6 max-w-3xl mx-auto">
          Never lose a customer to a bad review again
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          ReplyKit automatically generates and posts professional replies to your Google reviews —
          turning bad reviews into second chances, in seconds.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
          <Link href="/signup" className="w-full sm:w-auto bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-500 transition-colors shadow-lg text-[15px]">
            Start free — no credit card
          </Link>
          <Link href="/dashboard" className="w-full sm:w-auto border border-slate-700 text-slate-300 font-semibold px-8 py-3.5 rounded-xl hover:border-slate-500 hover:text-white transition-colors text-[15px]">
            See live demo →
          </Link>
          <a href="/ReplyKit.apk" download="ReplyKit.apk" className="w-full sm:w-auto flex items-center justify-center gap-2 border border-emerald-700/60 text-emerald-400 font-semibold px-8 py-3.5 rounded-xl hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors text-[15px]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M4 8l4 4 4-4M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Download Android APK
          </a>
        </div>

        {/* Hero mock */}
        <div className="max-w-md mx-auto bg-slate-800 border border-slate-700/50 rounded-2xl p-5 text-left shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 text-sm">★★☆☆☆</span>
            <span className="text-white text-sm font-semibold">Marcus T.</span>
            <span className="text-slate-500 text-xs ml-auto">2 min ago</span>
          </div>
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">
            "Waited 20 minutes with no update. Staff seemed overwhelmed and nobody apologised."
          </p>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">Auto-replied by ReplyKit</span>
            </div>
            <p className="text-sm text-emerald-300 leading-relaxed">
              "Marcus, we're truly sorry — this fell completely short of our standards. Please contact us directly so we can make this right for you personally."
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────── */}
      <section className="border-y border-slate-800 py-12 bg-slate-900/40">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { val: '$340', label: 'Average customer lifetime value lost per unanswered bad review' },
            { val: '94%',  label: 'Of customers read business replies to reviews before deciding' },
            { val: '3×',   label: 'More likely to return after receiving a personalized reply' },
          ].map(s => (
            <div key={s.val}>
              <p className="text-3xl sm:text-4xl font-bold text-white mb-2">{s.val}</p>
              <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">How it works</h2>
          <p className="text-slate-400 max-w-md mx-auto">Set up in under 5 minutes. Works automatically from there.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map(step => (
            <div key={step.n} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <span className="text-[11px] font-bold text-blue-400 tracking-widest uppercase">{step.n}</span>
              <h3 className="text-base font-bold text-white mt-2 mb-3">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROI ──────────────────────────────────────── */}
      <section className="bg-slate-900/50 border-y border-slate-800 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-5 leading-tight">One bad review costs more than you think</h2>
              <div className="space-y-4">
                {[
                  'The average lost customer is worth $340 in lifetime value',
                  'Unanswered bad reviews push customers straight to competitors',
                  'A professional reply recovers up to 70% of at-risk customers',
                  'Google ranks businesses higher when they reply to reviews',
                ].map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <Check/>
                    <span className="text-sm text-slate-300 leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" className="inline-block mt-8 bg-blue-600 text-white font-semibold px-7 py-3 rounded-xl hover:bg-blue-500 transition-colors text-sm shadow-lg">
                Start protecting your reputation →
              </Link>
            </div>
            <div className="space-y-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Without ReplyKit</p>
                <p className="text-white font-semibold text-sm">1-star review sits unanswered for 3 days</p>
                <p className="text-slate-400 text-xs mt-1">~8 potential customers read it. ~5 go elsewhere. $1,700 lost.</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">With ReplyKit</p>
                <p className="text-white font-semibold text-sm">Professional reply posted in 2 seconds</p>
                <p className="text-slate-400 text-xs mt-1">Customers see you care. 70% reconsider. Revenue protected.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-2xl font-bold text-white text-center mb-10">Loved by local businesses</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <p className="text-amber-400 text-sm mb-3">★★★★★</p>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">{`"${t.text}"`}</p>
              <p className="text-white text-sm font-semibold">{t.name}</p>
              <p className="text-slate-500 text-xs">{t.biz}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────── */}
      <section className="bg-slate-900/50 border-y border-slate-800 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Simple, transparent pricing</h2>
            <p className="text-slate-400">Cancel anytime. No long-term contracts.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { name: 'Free',    price: '$0',  mo: false, features: ['5 reviews/month', 'AI-drafted replies', 'Manual approve'], cta: 'Start free', highlight: false },
              { name: 'Starter', price: '$29', mo: true,  features: ['5 AI replies/month', 'Pro & friendly drafts', '1-click publish', 'Weekly digest'], cta: 'Get Starter', highlight: false },
              { name: 'Pro',     price: '$59', mo: true,  features: ['Unlimited AI replies', 'Auto-reply enabled', 'All 4 tone options', 'Priority support'], cta: 'Get Pro', highlight: true },
            ].map(plan => (
              <div key={plan.name} className={`rounded-2xl p-6 border flex flex-col ${plan.highlight ? 'bg-blue-600/10 border-blue-500/40 ring-1 ring-blue-500/30' : 'bg-slate-800/60 border-slate-700/50'}`}>
                {plan.highlight && <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">Most popular</span>}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <div className="mb-5 mt-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  {plan.mo && <span className="text-slate-400 text-sm">/mo</span>}
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300"><Check/>{f}</li>
                  ))}
                </ul>
                <Link href="/signup" className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">Your reputation is too important to leave unmanaged</h2>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
          Join hundreds of local businesses using ReplyKit to protect their reputation and win back customers — automatically.
        </p>
        <Link href="/signup" className="inline-block bg-blue-600 text-white font-semibold px-10 py-4 rounded-xl hover:bg-blue-500 transition-colors text-base shadow-xl">
          Start free today →
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">R</span>
            <span className="font-bold text-white text-sm">ReplyKit</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Demo</Link>
            <Link href="/billing"   className="hover:text-slate-300 transition-colors">Pricing</Link>
            <Link href="/contact"   className="hover:text-slate-300 transition-colors">Contact</Link>
            <Link href="/login"     className="hover:text-slate-300 transition-colors">Sign in</Link>
          </div>
          <p className="text-xs text-slate-600">© 2026 ReplyKit. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
