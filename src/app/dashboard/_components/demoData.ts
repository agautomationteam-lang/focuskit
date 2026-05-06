// Shared demo data: response templates + live review pool

const fn = (name: string) => name.split(' ')[0]

const BANK: Record<string, Array<(name: string) => string>> = {
  '1': [
    n => `${fn(n)}, we're truly sorry — this fell completely short of our standards. Please contact us directly so we can make this right for you personally.`,
    n => `${fn(n)}, this is unacceptable and we sincerely apologize. We'd like to speak with you directly and make it right immediately.`,
    n => `We're deeply sorry, ${fn(n)}. This is not the experience we want for anyone. Please reach out — we take this very seriously.`,
  ],
  '2': [
    n => `${fn(n)}, we're sorry for falling short. A poor experience handled without care isn't acceptable and we're addressing this with the team. Please give us another chance.`,
    n => `Thank you for the honest feedback, ${fn(n)}. We hear you and are reviewing our service standards right now. We'd genuinely love the chance to do better.`,
    n => `${fn(n)}, this wasn't the experience we want for you. We're sorry and actively working to improve — please come back and let us make it right.`,
  ],
  '3': [
    n => `Thank you for sharing, ${fn(n)}! We're always working to improve wait times and quality. We hope to impress you more on your next visit.`,
    n => `${fn(n)}, we appreciate the feedback. We're on it — hope to see you again and show you what we're really capable of!`,
    n => `Thanks, ${fn(n)}! Your feedback helps us get better every day. We'd love to give you a reason to upgrade that rating next time.`,
  ],
  '4': [
    n => `Thank you, ${fn(n)}! We're really glad you enjoyed the visit and we're working hard toward that 5th star. Hope to see you again soon!`,
    n => `${fn(n)}, your kind words mean so much to our whole team! We love having you — hope to see you again very soon!`,
    n => `Thanks so much, ${fn(n)}! We're working hard to earn that extra star. Come back soon — we have some exciting things in the works!`,
  ],
  '5': [
    n => `${fn(n)}, thank you so much — this made our whole team's day! We love having you and can't wait to see you again soon.`,
    n => `Wow, ${fn(n)}! We're so grateful for your kind words. Our team works hard every single day for moments like these — you're why we do it!`,
    n => `${fn(n)}, you're the reason we love what we do! Thank you from our whole team — we can't wait to see you back again!`,
  ],
}

export function pickTemplate(rating: number, name: string, index = 0): string {
  const key = Math.min(Math.max(Math.round(rating), 1), 5).toString()
  const bank = BANK[key]
  return bank[Math.abs(index) % bank.length](name)
}

export interface SimResponse {
  id: string
  draft_professional: string
  draft_friendly: string
  selected_draft: 'professional' | 'friendly'
  final_text: string
  status: string
}

export function generateSimResponse(rating: number, name: string, variant = 0): SimResponse {
  const pro = pickTemplate(rating, name, variant)
  const fri = pickTemplate(rating, name, variant + 1)
  const preferred: 'professional' | 'friendly' = rating >= 4 ? 'friendly' : 'professional'
  return {
    id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    draft_professional: pro,
    draft_friendly: fri,
    selected_draft: preferred,
    final_text: preferred === 'friendly' ? fri : pro,
    status: 'draft',
  }
}

export const LIVE_POOL: Array<{ name: string; rating: number; text: string }> = [
  { name: 'Marcus T.',   rating: 1, text: 'Absolutely terrible experience. Barista was dismissive and my order was completely wrong. Very frustrating.' },
  { name: 'Priya S.',    rating: 5, text: 'Hidden gem! Best flat white in the city. The team genuinely cares about every customer. Already told all my friends.' },
  { name: 'Tom W.',      rating: 3, text: 'Average coffee, nothing memorable. Service was okay but the wait time felt long for a quiet weekday afternoon.' },
  { name: 'Ava K.',      rating: 5, text: 'I live across the street and visit every morning. Never once disappointed. The consistency here is genuinely rare.' },
  { name: 'Derek N.',    rating: 2, text: 'My drink was lukewarm and when I mentioned it, the staff seemed annoyed rather than helpful. Disappointing for the price.' },
  { name: 'Sofia L.',    rating: 4, text: 'Love the atmosphere and the staff is always warm and friendly. The new seasonal menu is excellent!' },
  { name: 'James C.',    rating: 1, text: 'Found debris in my pastry and the staff were dismissive when I raised it. This is a serious hygiene concern.' },
  { name: 'Rachel H.',   rating: 5, text: 'Best coffee shop experience I\'ve had in years. The almond croissant is life-changing. Highly, highly recommend!' },
  { name: 'Ben A.',      rating: 4, text: 'Great spot for remote work. Fast WiFi, excellent espresso. Gets busy at noon but absolutely worth it.' },
  { name: 'Chloe R.',    rating: 2, text: 'Waited 25 minutes with no update. When I asked, staff seemed overwhelmed and nobody apologised for the delay.' },
  { name: 'Daniel O.',   rating: 5, text: 'The oat latte here is next level. Staff remember my name and order every time — that kind of thing matters.' },
]
