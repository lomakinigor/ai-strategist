'use server'

import { generateStrategyDraft } from '@/lib/strategy/generator'

type GenerateResult = { redirectTo: string } | { error: string }

export async function generateStrategyAction(formData: FormData): Promise<GenerateResult> {
  const jobId = formData.get('jobId') as string
  if (!jobId) return { error: 'jobId обязателен' }

  try {
    const result = await generateStrategyDraft(jobId)
    return { redirectTo: `/research/${jobId}/report?artifactId=${result.reportArtifactId}` }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return { error: message }
  }
}
