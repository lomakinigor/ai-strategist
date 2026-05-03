'use server'

import { redirect } from 'next/navigation'
import { generateStrategyDraft } from '@/lib/strategy/generator'

// Без явного maxDuration Vercel Hobby ограничивает Server Action 10 секундами,
// а Stage 1 (5 параллельных DeepSeek-вызовов с max_tokens=3000) до 10s не успевает
// и падает молча — UI остаётся со спиннером «Генерирую стратегию…».
export const maxDuration = 60

export async function generateStrategyAction(formData: FormData): Promise<void> {
  const jobId = formData.get('jobId') as string
  if (!jobId) throw new Error('jobId обязателен')

  const result = await generateStrategyDraft(jobId)
  redirect(`/research/${jobId}/report?artifactId=${result.reportArtifactId}`)
}
