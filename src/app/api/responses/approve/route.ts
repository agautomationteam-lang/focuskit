import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SelectedDraft } from '@/types/database'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { responseId, selectedDraft, finalText } = body as {
    responseId?: string
    selectedDraft?: SelectedDraft
    finalText?: string
  }

  if (!responseId || !selectedDraft || !finalText?.trim()) {
    return NextResponse.json(
      { error: 'responseId, selectedDraft, and finalText are required' },
      { status: 400 }
    )
  }

  // Verify ownership through join chain
  const { data: existing, error: fetchError } = await supabase
    .from('responses')
    .select('id, review_id, reviews!inner(business_id, businesses!inner(user_id))')
    .eq('id', responseId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Response not found' }, { status: 404 })
  }

  const owner = ((existing as unknown) as {
    reviews: { businesses: { user_id: string } }
  }).reviews.businesses.user_id

  if (owner !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('responses')
    .update({
      selected_draft: selectedDraft,
      final_text: finalText.trim(),
      status: 'approved',
    })
    .eq('id', responseId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Also update review status
  await supabase
    .from('reviews')
    .update({ status: 'approved' })
    .eq('id', existing.review_id)

  return NextResponse.json({ response: updated })
}
