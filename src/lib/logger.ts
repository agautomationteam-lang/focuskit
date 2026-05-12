import { createAdminClient } from '@/lib/supabase/admin'

interface LogEntry {
  action: string
  status: 'success' | 'error' | 'info'
  userId?: string
  businessId?: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  error?: string
  durationMs?: number
}

export async function log(entry: LogEntry): Promise<void> {
  const row = {
    action:        entry.action,
    status:        entry.status,
    user_id:       entry.userId      ?? null,
    business_id:   entry.businessId  ?? null,
    resource_type: entry.resourceType ?? null,
    resource_id:   entry.resourceId  ?? null,
    metadata:      entry.metadata    ?? null,
    error:         entry.error       ?? null,
    duration_ms:   entry.durationMs  ?? null,
  }

  const supabase = createAdminClient()
  await supabase.from('action_logs').insert(row).then(null, () => {})
}
