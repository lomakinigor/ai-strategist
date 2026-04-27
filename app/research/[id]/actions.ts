'use server'

import { redirect } from 'next/navigation'
import { startResearchJob } from '@/lib/research/orchestrator'

export async function triggerResearch(formData: FormData) {
  const jobId = (formData.get('jobId') as string | null)?.trim()
  if (!jobId) throw new Error('jobId обязателен')

  await startResearchJob(jobId)

  redirect(`/research/${jobId}`)
}
