// BRIEF v2 — НОВЫЙ независимый генератор краткого отчёта.
// КЛЮЧЕВОЕ ОТЛИЧИЕ от brief.ts: НЕ берёт FULL_REPORT.contentMarkdown как вход.
// Генерируется ПАРАЛЛЕЛЬНО с полным из ОДНИХ исходных данных (facts + intake),
// поэтому может работать даже когда полного отчёта ещё нет.
//
// Структура вывода: 11 аналитических секций (Navigator Pattern) + блок
// AI-автоматизации (5.1/5.2/5.3) + intake-цитата + executive preview.
//
// Принцип: только индикаторы объёма, никаких конкретных чисел — чтобы не
// противоречить полному отчёту (он может их уточнить/опровергнуть).

import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { facts, intakeSubmissions, companies } from '@/db/schema'
import { AI_CONFIG } from '@/lib/ai/config'
import {
  detectNicheId,
  getNicheAutomations,
  type NicheAutomationPattern,
} from './niche-automations'

export const BRIEF_V2_MAX_TOKENS = 8192

// ─── Типы блоков ──────────────────────────────────────────────────────────────

export interface SectionV2 {
  id: string
  title: string
  theses: string[] // 1-2 предложения, без точных чисел, привязаны к бизнесу
  in_full: string[] // 3-5 подтем «в полном отчёте по этой теме»
  implementation_l2?: string | null // sub-плашка Level 2 (структурно отделена)
  unavailable?: boolean | null // true → секция помечается «доступно при предоставлении данных»
}

export interface AutomationBlockV2 {
  emotional_thesis: string
  found_points: Array<{ title: string; description: string }>
  in_full: string
  implementation_l2: string
}

export interface BriefV2 {
  intake_quote: string
  executive_preview: string[] // 3-4 тезиса
  sections: SectionV2[] // 11 шт
  ai_automation: {
    business_process: AutomationBlockV2 // 5.1
    marketing: AutomationBlockV2 // 5.2 ВСЕГДА
    niche_specific: AutomationBlockV2 // 5.3
  }
}

// ─── Зафиксированный порядок 11 секций ────────────────────────────────────────

export const SECTION_ORDER_V2: Array<{ id: string; title: string }> = [
  { id: 'site', title: 'Сайт клиента' },
  { id: 'niche', title: 'Бизнес-ниша' },
  { id: 'audience', title: 'Целевая аудитория' },
  { id: 'ad_channels', title: 'Рекламные каналы клиента' },
  { id: 'competitors', title: 'Конкуренты' },
  { id: 'comparison_usp', title: 'Сравнение с конкурентами и USP' },
  { id: 'foreign_experience', title: 'Зарубежный опыт за 2 года' },
  { id: 'effective_channels', title: 'Эффективные каналы продвижения в нише сейчас' },
  { id: 'swot', title: 'SWOT клиента' },
  { id: 'test_ideas', title: 'Идеи для тестирования' },
  { id: 'strategic_conclusions', title: 'Стратегические выводы по intake-запросу' },
]

// ─── Промпт ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты — старший бизнес-стратег. Твоя задача — создать КРАТКИЙ обзорный отчёт для клиента (v2).

КРИТИЧНО:
- Краткий отчёт ≠ выжимка полного. Это самостоятельный обзор по ТЕМАМ.
- НЕ называй конкретных чисел (CPL, %, ₽, метрики). Полный отчёт даст их.
- Каждая секция — ОБОЗНАЧЕНИЕ темы + промис того, что раскрыто в полном.
- Тезисы должны быть привязаны к бизнесу клиента (упоминай его специфику).
- Все стратегические выводы отталкивайся от запроса клиента из intake.
- Возвращай ТОЛЬКО валидный JSON без markdown-обёртки.`

export function buildBriefV2Prompt(args: {
  companyName: string
  industry: string
  description: string | null
  website: string | null
  intakeQuote: string
  factsByType: Record<string, string[]>
  nicheAutomationsPreview: NicheAutomationPattern[]
}): string {
  const factsBlock = Object.entries(args.factsByType)
    .filter(([, items]) => items.length > 0)
    .map(([type, items]) => `### ${type}\n${items.slice(0, 12).map((f) => `- ${f}`).join('\n')}`)
    .join('\n\n')

  const nicheHint = args.nicheAutomationsPreview
    .map((p) => `- "${p.title}" — ${p.description}`)
    .join('\n')

  return `# Компания
${args.companyName}${args.website ? ` · ${args.website}` : ''}${args.industry ? ` · ${args.industry}` : ''}
${args.description ? `Описание: ${args.description}` : ''}

# Запрос клиента из intake (ОБЯЗАН быть процитирован в intake_quote и быть основой strategic_conclusions)
"${args.intakeQuote}"

# Исходные ФАКТЫ research-стадии (по типам)
${factsBlock || '(данных мало — формируй секции на уровне темы без конкретных утверждений)'}

# Подсказка по нишевым AI-автоматизациям (используй для блока 5.3 niche_specific)
${nicheHint}

---

## Структура вывода JSON

{
  "intake_quote": "${args.intakeQuote.replace(/"/g, '\\"')}",
  "executive_preview": [
    "3-4 тезиса от ИИ-стратега, явно отталкивающиеся от intake-запроса. Без чисел, с привязкой к бизнесу клиента."
  ],
  "sections": [
    {
      "id": "site",
      "title": "Сайт клиента",
      "theses": ["1-2 коротких тезиса (без чисел), привязанных к бизнесу клиента"],
      "in_full": ["3-5 подтем из полного отчёта"],
      "implementation_l2": "Опциональная sub-плашка Level 2: одна фраза о том, что мы можем реализовать под ключ (или null если неприменимо)",
      "unavailable": false
    },
    ... (остальные 10 секций в том же порядке: niche, audience, ad_channels, competitors, comparison_usp, foreign_experience, effective_channels, swot, test_ideas, strategic_conclusions)
  ],
  "ai_automation": {
    "business_process": {
      "emotional_thesis": "Один эмоциональный абзац про риск отстать от конкурентов по издержкам",
      "found_points": [
        { "title": "Точка автоматизации", "description": "1-2 предложения" }
      ],
      "in_full": "Что раскрыто в полном (одна фраза)",
      "implementation_l2": "Что мы реализуем под ключ — одна фраза"
    },
    "marketing": {
      "emotional_thesis": "Тезис про то, что без AI-автоматизации маркетинга упускаются возможности контента и квалификации",
      "found_points": [
        { "title": "Автопостинг по соцсетям компании", "description": "..." },
        { "title": "Нейроагент в рекламных каналах для квалификации", "description": "..." }
      ],
      "in_full": "Что раскрыто в полном",
      "implementation_l2": "Что мы реализуем под ключ"
    },
    "niche_specific": {
      "emotional_thesis": "Тезис о нишевых паттернах автоматизации, дающих преимущество",
      "found_points": [
        { "title": "...", "description": "..." }
      ],
      "in_full": "Что раскрыто в полном",
      "implementation_l2": "Что мы реализуем под ключ"
    }
  }
}

## Правила
- sections — ровно 11, в указанном порядке (id зафиксированы).
- Если для ad_channels нет ФАКТОВ про рекламные каналы клиента → unavailable=true, theses=[], in_full="доступно при предоставлении данных".
- executive_preview — ровно 3 или 4 элемента.
- ai_automation.marketing присутствует ВСЕГДА, даже если pain не нашёлся в фактах.
- ai_automation.niche_specific — используй переданный nicheHint как ориентир.
- НЕ ИСПОЛЬЗУЙ КОНКРЕТНЫЕ ЧИСЛА в theses/found_points/emotional_thesis.
- found_points в каждом блоке — 2-3 пункта.
- Весь текст на русском.`
}

// ─── Сбор входных данных ──────────────────────────────────────────────────────

interface CollectedInputs {
  companyName: string
  industry: string
  description: string | null
  website: string | null
  intakeQuote: string
  factsByType: Record<string, string[]>
}

async function collectInputs(researchJobId: string, companyId: string): Promise<CollectedInputs> {
  const db = getDb()

  const [companyRow] = await db
    .select({
      name: companies.name,
      industry: companies.industry,
      description: companies.description,
      website: companies.website,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  // intake quote — берём последний intake этой компании, ищем поле «цели/запрос»
  const intakeRows = await db
    .select({ payload: intakeSubmissions.inputPayload, createdAt: intakeSubmissions.createdAt })
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.companyId, companyId))
    .limit(5)

  // Берём первый intake (оригинальный, не upgrade-snapshot)
  const original =
    intakeRows.find(
      (r) => !(r.payload as Record<string, unknown>)?._upgrade_from_artifact,
    ) ?? intakeRows[0]
  const payload = (original?.payload ?? {}) as Record<string, unknown>
  const intakeQuote =
    (payload.goals as string | undefined) ||
    (payload.description as string | undefined) ||
    (payload.request as string | undefined) ||
    'Главный запрос не указан в intake'

  // Факты по типам
  const factRows = await db
    .select({
      content: facts.content,
      researchType: facts.researchType,
    })
    .from(facts)
    .where(eq(facts.researchJobId, researchJobId))
    .limit(200)

  const factsByType: Record<string, string[]> = {}
  for (const f of factRows) {
    const key = f.researchType
    if (!factsByType[key]) factsByType[key] = []
    factsByType[key].push(f.content)
  }

  return {
    companyName: companyRow?.name ?? 'Компания',
    industry: companyRow?.industry ?? '',
    description: companyRow?.description ?? null,
    website: companyRow?.website ?? null,
    intakeQuote,
    factsByType,
  }
}

// ─── Парсер ────────────────────────────────────────────────────────────────────

function extractJSON(raw: string): string {
  const fence = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (fence) return fence[1]
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1)
  return raw
}

// Tolerant JSON.parse: убирает trailing commas перед закрывающими скобками
// (типовая ошибка LLM-вывода). Если стандартный parse падает — пробуем repair-fallback.
function tolerantJsonParse(jsonStr: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>
  } catch (firstErr) {
    const repaired = jsonStr
      .replace(/,(\s*[}\]])/g, '$1') // удалить trailing commas: ,] и ,}
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // обернуть unquoted keys
    try {
      return JSON.parse(repaired) as Record<string, unknown>
    } catch {
      throw firstErr
    }
  }
}

// Прямой вызов OpenRouter с response_format=json_object. Не используем callOpenRouter
// из generator.ts, чтобы не трогать его сигнатуру (он шарится со старым brief.ts).
async function callOpenRouterForJSON(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  modelId: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://ai-strategist-bice.vercel.app',
      'X-Title': 'ai-strategist-brief-v2',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      provider: { allow_fallbacks: true, sort: 'throughput' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '<no body>')
    throw new Error(`OpenRouter ${res.status} ${res.statusText}: ${errText.slice(0, 300)}`)
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter: пустой content в ответе')
  return content
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback
}

function asStringArray(v: unknown, maxLen = 6): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((s) => asString(s))
    .filter((s) => s.length > 0)
    .slice(0, maxLen)
}

function parseAutomationBlock(input: unknown): AutomationBlockV2 {
  const o = (input ?? {}) as Record<string, unknown>
  const foundRaw = Array.isArray(o.found_points) ? o.found_points : []
  return {
    emotional_thesis: asString(o.emotional_thesis),
    found_points: foundRaw
      .slice(0, 4)
      .map((p) => {
        const pp = (p ?? {}) as Record<string, unknown>
        return {
          title: asString(pp.title),
          description: asString(pp.description),
        }
      })
      .filter((p) => p.title.length > 0 || p.description.length > 0),
    in_full: asString(o.in_full),
    implementation_l2: asString(o.implementation_l2),
  }
}

export function parseBriefV2(raw: string): BriefV2 {
  const data = tolerantJsonParse(extractJSON(raw))

  const sectionsRaw = Array.isArray(data.sections) ? data.sections : []
  // Гарантируем порядок и полноту: проходим по SECTION_ORDER_V2 и подставляем
  // соответствующий блок из ответа модели (или заглушку если модель пропустила).
  const sections: SectionV2[] = SECTION_ORDER_V2.map((spec) => {
    const found = sectionsRaw.find(
      (s): s is Record<string, unknown> =>
        typeof s === 'object' && s !== null && (s as Record<string, unknown>).id === spec.id,
    )
    const s = (found ?? {}) as Record<string, unknown>
    const unavailable = s.unavailable === true
    return {
      id: spec.id,
      title: asString(s.title) || spec.title,
      theses: unavailable ? [] : asStringArray(s.theses, 3),
      in_full: asStringArray(s.in_full, 6),
      implementation_l2: asString(s.implementation_l2) || null,
      unavailable,
    }
  })

  const aiAuto = (data.ai_automation ?? {}) as Record<string, unknown>

  return {
    intake_quote: asString(data.intake_quote),
    executive_preview: asStringArray(data.executive_preview, 4),
    sections,
    ai_automation: {
      business_process: parseAutomationBlock(aiAuto.business_process),
      marketing: parseAutomationBlock(aiAuto.marketing),
      niche_specific: parseAutomationBlock(aiAuto.niche_specific),
    },
  }
}

// ─── Главная функция ──────────────────────────────────────────────────────────

export async function generateBriefV2(args: {
  researchJobId: string
  companyId: string
}): Promise<{ raw: string; parsed: BriefV2 }> {
  const inputs = await collectInputs(args.researchJobId, args.companyId)
  const nicheId = detectNicheId(`${inputs.industry} ${inputs.description ?? ''}`)
  const nicheAutomationsPreview = getNicheAutomations(nicheId)

  const userPrompt = buildBriefV2Prompt({
    companyName: inputs.companyName,
    industry: inputs.industry,
    description: inputs.description,
    website: inputs.website,
    intakeQuote: inputs.intakeQuote,
    factsByType: inputs.factsByType,
    nicheAutomationsPreview,
  })

  const raw = await callOpenRouterForJSON(
    SYSTEM_PROMPT,
    userPrompt,
    BRIEF_V2_MAX_TOKENS,
    AI_CONFIG.strategy.synthesisModel,
  )

  const parsed = parseBriefV2(raw)
  return { raw, parsed }
}
