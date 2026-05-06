import { createAdminClient } from '@/lib/supabase/admin'

export type JobType = 'fetch_reviews' | 'generate_response' | 'send_digest'

export interface Job {
  id: string
  type: JobType
  payload: Record<string, unknown>
  status: string
  attempts: number
  max_attempts: number
  scheduled_at: string
  error: string | null
}

export async function enqueue(
  type: JobType,
  payload: Record<string, unknown>,
  opts: { priority?: number; delaySeconds?: number; maxAttempts?: number } = {}
): Promise<string> {
  const scheduledAt = opts.delaySeconds
    ? new Date(Date.now() + opts.delaySeconds * 1000).toISOString()
    : new Date().toISOString()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('job_queue')
    .insert({
      type,
      payload,
      priority:     opts.priority    ?? 0,
      max_attempts: opts.maxAttempts ?? 5,
      scheduled_at: scheduledAt,
    })
    .select('id')
    .single()

  if (error) throw new Error(`enqueue failed: ${error.message}`)
  return data.id
}

export async function claimJobs(batchSize = 5): Promise<Job[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('claim_jobs', { batch_size: batchSize })
  if (error) throw new Error(`claimJobs failed: ${error.message}`)
  return (data ?? []) as Job[]
}

export async function completeJob(id: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('job_queue')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)
}

export async function failJob(job: Job, errorMsg: string): Promise<void> {
  const supabase = createAdminClient()

  if (job.attempts >= job.max_attempts) {
    await supabase
      .from('job_queue')
      .update({ status: 'dead', error: errorMsg, updated_at: new Date().toISOString() })
      .eq('id', job.id)
    return
  }

  // Exponential backoff: 2^attempts * 60s → 1m, 2m, 4m, 8m, 16m
  const delaySeconds = Math.pow(2, job.attempts) * 60
  const scheduledAt  = new Date(Date.now() + delaySeconds * 1000).toISOString()

  await supabase
    .from('job_queue')
    .update({
      status:       'pending',
      error:        errorMsg,
      scheduled_at: scheduledAt,
      updated_at:   new Date().toISOString(),
    })
    .eq('id', job.id)
}
