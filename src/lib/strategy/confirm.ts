// Серверная часть гейта: buildConfirmDraft — дешёвый LLM-проход, извлекает 5 блоков
// понимания из research-фактов с пометкой провенанса. Чистые типы/serialize — в confirm-types.

import { buildResearchContext, serializeContext } from '@/lib/rag/context'
import { AI_CONFIG } from '@/lib/ai/config'
import {
  emptyConfirmation,
  type Confirmation,
  type ConfirmItem,
  type Provenance,
} from './confirm-types'

const DRAFT_SYSTEM = `Ты извлекаешь структурированное «понимание» о компании из фактов research для экрана подтверждения.
Верни СТРОГО JSON (без markdown, без пояснений) такой формы:
{
  "directions": [{"text": "...", "provenance": "site|brief|research|ai_guess"}],
  "channelsUsed": [{"text": "Яндекс.Директ", "provenance": "research"}],
  "clients": [{"text": "...", "provenance": "site|research"}],
  "reviews": [{"text": "...", "provenance": "site|research"}],
  "competitors": [{"text": "Название — что делает", "provenance": "research|ai_guess"}]
}
ПРАВИЛА:
- directions: если у компании несколько разных направлений — каждое ОТДЕЛЬНЫМ элементом, НЕ склеивать в «единый комплекс».
- channelsUsed: только каналы с ЯВНЫМ признаком использования клиентом (объявления на Авито, кампании Директа и т.п.). Нет признака — пустой массив, НЕ домысливай.
- competitors: provenance "ai_guess" для найденных AI (не указанных клиентом).
- Если по блоку данных нет — пустой массив [].
- Текст полей — на русском, кратко.`

interface ORChatResponse {
  choices: Array<{ message: { content: string } }>
}

function coerceItems(raw: unknown): ConfirmItem[] {
  if (!Array.isArray(raw)) return []
  const ok: Provenance[] = ['site', 'brief', 'research', 'ai_guess']
  return raw
    .map((r) => {
      const text =
        typeof (r as { text?: unknown })?.text === 'string' ? (r as { text: string }).text.trim() : ''
      const pRaw = (r as { provenance?: unknown })?.provenance
      const provenance: Provenance = ok.includes(pRaw as Provenance) ? (pRaw as Provenance) : 'research'
      return { text, provenance }
    })
    .filter((i) => i.text.length > 0)
    .slice(0, 12)
}

// LLM-проход: из фактов job → черновик 5 блоков. На любой ошибке возвращает пустой черновик
// (гейт всё равно покажется, пользователь заполнит вручную).
export async function buildConfirmDraft(jobId: string): Promise<Confirmation> {
  const draft = emptyConfirmation()
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return draft

  let facts = ''
  try {
    facts = serializeContext(await buildResearchContext(jobId))
  } catch {
    return draft
  }
  if (!facts.trim()) return draft

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'ai-strategist-confirm',
      },
      body: JSON.stringify({
        model: AI_CONFIG.strategy.defaultModel,
        max_tokens: 1500,
        // json_object (не json_schema) — совместимо с throughput-роутингом OpenRouter.
        response_format: { type: 'json_object' },
        provider: { allow_fallbacks: true, sort: 'throughput' },
        messages: [
          { role: 'system', content: DRAFT_SYSTEM },
          { role: 'user', content: `Факты research:\n${facts}` },
        ],
      }),
    })
    if (!res.ok) return draft
    const data = (await res.json()) as ORChatResponse
    const content = data.choices?.[0]?.message?.content ?? ''
    const parsed = JSON.parse(content) as Record<string, unknown>
    return {
      directions: { items: coerceItems(parsed.directions), unknown: false },
      channelsUsed: { items: coerceItems(parsed.channelsUsed), unknown: false },
      clients: { items: coerceItems(parsed.clients), unknown: false },
      reviews: { items: coerceItems(parsed.reviews), unknown: false },
      competitors: { items: coerceItems(parsed.competitors), unknown: false },
    }
  } catch {
    return draft
  }
}
