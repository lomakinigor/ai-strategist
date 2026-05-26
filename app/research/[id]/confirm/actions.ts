'use server'

import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { researchJobs } from '@/db/schema'
import { buildConfirmDraft } from '@/lib/strategy/confirm'
import type { Confirmation } from '@/lib/strategy/confirm-types'
import { generateStrategyDraft } from '@/lib/strategy/generator'

// Черновик гейта: уже подтверждённое (если есть) либо свежий LLM-проход по фактам.
export async function getConfirmDraftAction(jobId: string): Promise<Confirmation> {
  const db = getDb()
  const rows = await db
    .select({ c: researchJobs.confirmationsJson })
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)
  const existing = rows[0]?.c as Confirmation | null
  if (existing) return existing
  return buildConfirmDraft(jobId)
}

type GenResult = { redirectTo: string } | { error: string }

// Сохраняет подтверждение и запускает генерацию отчёта (single-pass).
export async function saveAndGenerateAction(
  jobId: string,
  confirmation: Confirmation,
): Promise<GenResult> {
  const db = getDb()
  try {
    await db
      .update(researchJobs)
      .set({ confirmationsJson: { ...confirmation, confirmedAt: new Date().toISOString() } })
      .where(eq(researchJobs.id, jobId))
    const result = await generateStrategyDraft(jobId)
    return { redirectTo: `/research/${jobId}/report?artifactId=${result.reportArtifactId}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Неизвестная ошибка при генерации' }
  }
}
