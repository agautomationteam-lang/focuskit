import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

const PLANS = {
  starter: { name: 'ReplyKit Starter', amount: 4900 },
  pro:     { name: 'ReplyKit Pro',     amount: 9900 },
} as const

type PlanId = keyof typeof PLANS

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const plan: PlanId = body.plan === 'pro' ? 'pro' : 'starter'

  const { data: dbUser } = await supabase
    .from('users')
    .select('stripe_customer_id, subscription_status')
    .eq('id', user.id)
    .single()

  if (dbUser?.subscription_status === 'active') {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  let customerId = dbUser?.stripe_customer_id ?? undefined

  try {
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email,
          metadata: { supabase_user_id: user.id },
        },
        { idempotencyKey: `customer-${user.id}` }
      )
      customerId = customer.id

      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: PLANS[plan].name },
            unit_amount: PLANS[plan].amount,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?upgrade=success`,
      cancel_url:  `${appUrl}/upgrade`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe request failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
