// Хелпер записи одной строки в llm_calls. Никогда не бросает наверх —
// логирование cost не должно ломать основной pipeline. Все ошибки идут в console.

import { getDb } from '@/db'
import { llmCalls } from '@/db/schema'
import { getUsdRubRate } from './rates'
import { estimateCostUsd } from './pricing'

export interface RecordLlmCallParams {
  researchJobId?: string | null
  /**
   * Этап pipeline для группировки в дашборде. Конвенция:
   * - 'intake_parse' | 'intake_scanner'
   * - 'research_business' | 'research_market' | 'research_audience' |
   *   'research_channels' | 'research_competitors'
   * - 'brief_v1' | 'brief_v2'
   * - 'full_v1' | 'full_v2_part_1' .. 'full_v2_part_8'
   */
  stage: string
  /** 'openrouter' | 'openai' | 'deepseek' (через openrouter — указывать 'openrouter') */
  provider: string
  /** Модель как в API запросе ('anthropic/claude-sonnet-4.6' | 'gpt-4o-mini') */
  model: string
  promptTokens?: number | null
  completionTokens?: number | null
  /**
   * Если провайдер вернул реальную стоимость (OpenRouter usage.cost) — передать.
   * Иначе оставить null и стоимость будет посчитана из pricing.ts по токенам.
   */
  costUsd?: number | null
  /** attempt, finish_reason, error если есть, и любые другие диагностические поля */
  metadata?: Record<string, unknown>
}

export async function recordLlmCall(params: RecordLlmCallParams): Promise<void> {
  try {
    const promptTokens = params.promptTokens ?? 0
    const completionTokens = params.completionTokens ?? 0

    let costUsd = params.costUsd ?? null
    if (costUsd === null && (promptTokens > 0 || completionTokens > 0)) {
      costUsd = estimateCostUsd(params.model, promptTokens, completionTokens)
    }

    let costRub: number | null = null
    if (costUsd !== null) {
      const rate = await getUsdRubRate()
      costRub = costUsd * rate
    }

    const db = getDb()
    await db.insert(llmCalls).values({
      researchJobId: params.researchJobId ?? null,
      stage: params.stage,
      provider: params.provider,
      model: params.model,
      promptTokens: params.promptTokens ?? null,
      completionTokens: params.completionTokens ?? null,
      costUsd: costUsd !== null ? costUsd.toFixed(6) : null,
      costRub: costRub !== null ? costRub.toFixed(2) : null,
      metadata: params.metadata ?? null,
    })
  } catch (err) {
    // Не ломаем pipeline — только логируем
    console.error('[cost/record] failed to record llm_call:', err instanceof Error ? err.message : err)
  }
}
