import { stripe } from '@/lib/stripe'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

function adminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function setSubscriptionStatus(
  stripeCustomerId: string,
  status: 'active' | 'inactive',
  subscriptionId?: string
) {
  const supabase = adminClient()
  const update: Record<string, string> = { subscription_status: status }
  if (subscriptionId) update.stripe_subscription_id = subscriptionId

  await supabase
    .from('users')
    .update(update)
    .eq('stripe_customer_id', stripeCustomerId)
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      // Give users a grace period during payment retry (past_due).
      // Only mark inactive when Stripe has fully given up (canceled/unpaid).
      const activeStatuses = ['active', 'trialing', 'past_due']
      const status = activeStatuses.includes(sub.status) ? 'active' : 'inactive'
      await setSubscriptionStatus(sub.customer as string, status, sub.id)
      break
    }

    case 'customer.subscription.deleted': {
      // Explicit cancel — subscription is gone
      const sub = event.data.object as Stripe.Subscription
      await setSubscriptionStatus(sub.customer as string, 'inactive')
      break
    }

    // invoice.payment_failed is intentionally NOT handled here.
    // Stripe retries automatically. If retries are exhausted, Stripe changes
    // the subscription status to 'unpaid' or 'canceled' and fires
    // customer.subscription.updated / customer.subscription.deleted above.
  }

  return NextResponse.json({ received: true })
}
