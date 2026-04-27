'use server'

import { redirect } from 'next/navigation'
import { generateStrategyDraft } from '@/lib/strategy/generator'

export async function generateStrategyAction(formData: FormData): Promise<void> {
  const jobId = formData.get('jobId') as string
  if (!jobId) throw new Error('jobId обязателен')

  const result = await generateStrategyDraft(jobId)
  redirect(`/research/${jobId}/report?artifactId=${result.reportArtifactId}`)
}
