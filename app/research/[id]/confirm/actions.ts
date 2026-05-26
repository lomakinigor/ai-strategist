'use server'

import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { researchJobs, companies } from '@/db/schema'
import { buildConfirmDraft } from '@/lib/strategy/confirm'
import { seedBlock, type Confirmation } from '@/lib/strategy/confirm-types'
import { generateStrategyDraft } from '@/lib/strategy/generator'

// Черновик гейта: уже подтверждённое (если есть) либо свежий LLM-проход по фактам,
// предзаполненный данными из intake (направления + используемые каналы).
export async function getConfirmDraftAction(jobId: string): Promise<Confirmation> {
  const db = getDb()
  const rows = await db
    .select({ c: researchJobs.confirmationsJson, companyId: researchJobs.companyId })
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)
  const existing = rows[0]?.c as Confirmation | null
  if (existing) return existing

  const draft = await buildConfirmDraft(jobId)

  // Предзаполнение из intake: направления и используемые рекламные каналы.
  const companyId = rows[0]?.companyId
  if (companyId) {
    const [company] = await db
      .select({ directions: companies.directions, adChannels: companies.adChannels })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)
    const dir = company?.directions as { items?: string[] } | null
    draft.directions = seedBlock(draft.directions, dir?.items ?? [])
    draft.channelsUsed = seedBlock(draft.channelsUsed, company?.adChannels ?? [])
  }

  return draft
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
