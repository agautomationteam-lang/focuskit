import OpenAI from 'openai'

let _client: OpenAI | null = null
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  return _client
}

// ─── Recommendation logic ────────────────────────────────────────────────────
// 4–5★ → friendly  (match the positive energy)
// 1–3★ → professional  (careful and considered for mixed/negative)
export function getBestDraft(rating: number): 'professional' | 'friendly' {
  return rating >= 4 ? 'friendly' : 'professional'
}

// ─── Tone voice map ──────────────────────────────────────────────────────────
const BUSINESS_TONE_VOICE: Record<string, string> = {
  professional: 'Polished and measured. Write like a business owner who is confident, thoughtful, and genuinely invested in their customers. Not stiff — just considered.',
  friendly:     'Warm and real. Write like an owner who knows their regulars. Contractions, natural rhythm, no performance.',
  luxury:       'Gracious and understated. High-end hospitality energy — calm, unhurried, quietly appreciative. Never gushing.',
  casual:       "Direct and genuine. Low-key. Write like a text from someone who cares but doesn't overthink it.",
}

// ─── Rating-specific guidance ─────────────────────────────────────────────────
function ratingGuidance(rating: number): string {
  if (rating >= 4) {
    return `${rating}-star review — great experience. Match the energy without performing it. Pick up on something specific they mentioned and respond to that, not the rating. A short, warm sentence can land harder than a long polished one.`
  }
  if (rating === 3) {
    return `3-star review — something was off but they're not furious. Acknowledge what didn't land, no excuses. Show you're the kind of place that actually listens. Don't over-apologize.`
  }
  return `${rating}-star review — something went wrong. Lead with what actually happened (not "we're sorry you felt that way"). Two or three calm sentences. One clear next step. Don't beg — just be straight with them.`
}

// ─── System prompt ────────────────────────────────────────────────────────────
// Sets the permanent rules. Applies to every generation.
function buildSystemPrompt(rating: number, businessTone: string): string {
  const voice = BUSINESS_TONE_VOICE[businessTone] ?? BUSINESS_TONE_VOICE.professional

  return `You write Google review responses for local businesses.

Your job: write replies that sound like a real owner wrote them — not a PR department, not a chatbot.

VOICE: ${voice}

BANNED PHRASES — never use any of these:
"We truly appreciate your feedback" | "Your feedback means a lot" | "We value your business" | "We strive to provide" | "Your satisfaction is our top priority" | "We apologize for any inconvenience" | "Thank you for taking the time" | "We hope to see you again" | "Please don't hesitate to reach out" | "We're sorry to hear about your experience" | "Thank you for your review" | "I understand how you feel" | "We appreciate you" | "I understand your frustration" | "We understand"

RULES:
1. 2–4 sentences. No more, no less.
2. Contractions are required (we're, you'll, it's, wasn't, can't)
3. No bullets, no sign-offs, no "Warm regards"
4. One exclamation mark maximum — and only if it genuinely fits
5. Deliberately vary sentence length — at least one short sentence (under 8 words) somewhere in the reply
6. Don't repeat the reviewer's exact words back at them
7. Never make promises you can't verify ("we'll make sure this never happens again")
8. Don't open with "I" or "We" more than 50% of the time — try opening with what happened, a name, or a reaction
9. Avoid mirroring the same sentence structure twice in the same reply

${rating >= 4 ? `POSITIVE REVIEW GUIDANCE:
- A flicker of genuine warmth is fine — don't suppress it entirely
- One specific detail from their review > generic enthusiasm
- Landing on something real beats landing on something polished` : ''}
${rating <= 2 ? `NEGATIVE REVIEW EXTRA RULES:
- Max 3 sentences — shorter is stronger
- Never use the word "inconvenience"
- Don't say "sorry" more than once
- Specific acknowledgment beats a generic apology every time
- Stay calm and grounded — no groveling, no over-explaining
- Give them one concrete next step (reach out, come back, ask for [owner name])` : ''}`
}

// ─── User prompt ──────────────────────────────────────────────────────────────
// Provides the specific task per request.
export interface GenerateParams {
  reviewText: string
  rating: number
  businessName: string
  reviewerName?: string
  businessTone?: string
  draftTone: 'professional' | 'friendly'
}

function extractFirstName(name: string): string | null {
  const first = name.trim().split(/\s+/)[0]
  return first && first.length > 1 ? first : null
}

function buildUserPrompt(params: GenerateParams): string {
  const { reviewText, rating, businessName, reviewerName, businessTone, draftTone } = params

  const toneKey = businessTone && BUSINESS_TONE_VOICE[businessTone] ? businessTone : draftTone
  const firstName = reviewerName ? extractFirstName(reviewerName) : null

  const nameInstruction = firstName
    ? `Reviewer's first name: ${firstName}. Use it at the very start of the reply — but only about half the time, and only when it sounds like something a real person would say. If it would feel awkward or salesy, skip it entirely.`
    : `No reviewer name available. Don't address them by name.`

  const draftInstruction = draftTone === 'professional'
    ? `Professional tone (${toneKey}): measured and direct. Mix one short sentence with one longer one. Don't open with "Thank you" or "I". Lead with the substance.`
    : `Friendly tone (${toneKey}): warmer, more spontaneous. Can open with the reviewer's name or a reaction. At least one short punchy sentence. Don't open with "Thank you".`

  const situationGuide = ratingGuidance(rating)

  return `Business: "${businessName}"
${nameInstruction}
Rating: ${rating}/5 stars
Review: "${reviewText?.trim() || '(no written review — rating only)'}"

SITUATION: ${situationGuide}

DRAFT TYPE: ${draftInstruction}

Write the response now. Output only the reply — no quotes, no explanation.`
}

// ─── Main generation function ─────────────────────────────────────────────────
export async function generateDraft(params: GenerateParams): Promise<string> {
  const systemPrompt = buildSystemPrompt(
    params.rating,
    params.businessTone ?? params.draftTone
  )
  const userPrompt = buildUserPrompt(params)

  const completion = await client().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens: 200,
    temperature: params.draftTone === 'friendly' ? 0.92 : 0.78,
  })

  return completion.choices[0]?.message?.content?.trim() ?? ''
}

// Keep PromptParams as alias for backwards compat
export type PromptParams = GenerateParams
