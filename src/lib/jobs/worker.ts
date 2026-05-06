import { claimJobs, completeJob, failJob, type Job } from './queue'
import { handleFetchReviews, handleGenerateResponse, handleSendDigest } from './handlers'
import { log } from '@/lib/logger'

async function runJob(job: Job): Promise<void> {
  // Plain console.log first — visible even if DB logging is unavailable
  console.log(`[worker] Running job: ${job.type}  id=${job.id}  attempt=${job.attempts}`)

  // Best-effort structured log — must not throw and kill the job
  log({ action: `job_start:${job.type}`, status: 'info',
        metadata: { jobId: job.id, attempt: job.attempts, payload: job.payload } })
    .catch(() => {})

  switch (job.type) {
    case 'fetch_reviews':     return handleFetchReviews(job.payload)
    case 'generate_response': return handleGenerateResponse(job.payload)
    case 'send_digest':       return handleSendDigest(job.payload)
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

export interface BatchResult {
  processed: number
  succeeded: number
  failed: number
}

export async function processBatch(batchSize = 5): Promise<BatchResult> {
  const jobs = await claimJobs(batchSize)

  if (jobs.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  let succeeded = 0
  let failed    = 0

  for (const job of jobs) {
    try {
      await runJob(job)
      await completeJob(job.id)
      console.log(`[worker] Completed: ${job.type}  id=${job.id}`)
      succeeded++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await failJob(job, msg)
      console.error(`[worker] Failed: ${job.type}  id=${job.id}  error="${msg}"`)
      failed++
      log({
        action:   `job_failed:${job.type}`,
        status:   'error',
        metadata: { jobId: job.id, attempt: job.attempts, payload: job.payload },
        error:    msg,
      }).catch(() => {})
    }
  }

  return { processed: jobs.length, succeeded, failed }
}
