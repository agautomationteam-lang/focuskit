import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, tone } = await request.json().catch(() => ({})) as {
    name?: string
    tone?: string
  }

  const bizName = (name ?? '').trim() || 'My Business'
  const bizTone = tone ?? 'professional'

  // Update if exists, create if not
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('businesses')
      .update({ name: bizName, tone: bizTone })
      .eq('id', existing.id)
    return NextResponse.json({ businessId: existing.id })
  }

  const { data: created, error } = await supabase
    .from('businesses')
    .insert({
      user_id: user.id,
      name: bizName,
      tone: bizTone,
      auto_reply_enabled: false,
    })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create business' }, { status: 500 })
  }

  return NextResponse.json({ businessId: created.id })
}
