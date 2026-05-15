'use server'

import { startResearchJob } from '@/lib/research/orchestrator'

export async function triggerResearch(formData: FormData): Promise<{ redirectTo: string }> {
  const jobId = (formData.get('jobId') as string | null)?.trim()
  if (!jobId) throw new Error('jobId обязателен')

  await startResearchJob(jobId)

  return { redirectTo: `/research/${jobId}` }
}
