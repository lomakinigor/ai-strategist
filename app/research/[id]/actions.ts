'use server'

import { startResearchJob } from '@/lib/research/orchestrator'

type TriggerResult = { redirectTo: string } | { error: string }

export async function triggerResearch(formData: FormData): Promise<TriggerResult> {
  const jobId = (formData.get('jobId') as string | null)?.trim()
  if (!jobId) return { error: 'jobId обязателен' }

  try {
    await startResearchJob(jobId)
    return { redirectTo: `/research/${jobId}` }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return { error: message }
  }
}
