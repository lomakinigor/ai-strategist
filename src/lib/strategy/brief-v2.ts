// BRIEF v2 (v3 итерация) — НОВЫЙ независимый генератор краткого отчёта,
// построенный на L2-методологии (Porter 5F, PESTEL, JTBD, SWOT-TOWS,
// Blue Ocean, McKinsey 3H). Параллельно со старым brief.ts.
//
// Структура: 4 Navigator-карточки (Части A/B/C/D полного отчёта) + 3 блока
// AI-автоматизации + intake-цитата + executive preview. Без конкретных чисел —
// только обозначение тем и промис того, что раскрыто в полном.
//
// Источники данных — строго бесплатные публичные (см. SYSTEM_PROMPT). Никаких
// Ahrefs/Semrush/Similarweb/Контур.Фокус/GSC/Я.Метрики/CMS-доступов клиента.

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

export interface AutomationBlockV2 {
  emotional_thesis: string
  found_points: Array<{ title: string; description: string }>
  in_full: string
  implementation_l2: string
}

export interface BriefV2 {
  intake_quote: string
  executive_preview: string[] // 3-4 тезиса
  // Navigator-карточки (4 шт) — только динамичные theses; статичные under-lists
  // (A1-A6, B1-B3, C1-C3, D1-D3) хардкодим в компоненте, чтобы не тратить токены.
  part_a_theses: string[] // 1-2 тезиса о РФ-анализе
  part_b_theses: string[] // 1-2 о Global
  part_c_theses: string[] // 1 о сравнении РФ vs Global
  part_d_theses: string[] // 1-2 о стратегии
  // Опциональные sub-плашки Level 2 для трёх частей (B — без L2)
  implementation_l2_hints: {
    part_a?: string | null
    part_c?: string | null
    part_d?: string | null
  }
  ai_automation: {
    business_process: AutomationBlockV2 // 8.1
    marketing: AutomationBlockV2 // 8.2 ВСЕГДА
    niche_specific: AutomationBlockV2 // 8.3
  }
}

// ─── Промпт ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты — старший бизнес-стратег. Создаёшь КРАТКИЙ обзорный отчёт по L2-методологии (Porter 5F + PESTEL + JTBD + SWOT-TOWS + Blue Ocean + McKinsey 3H).

КРИТИЧНО:
- Краткий ≠ выжимка полного. Это самостоятельный обзор по 4 крупным Частям полного отчёта (A: РФ-анализ, B: Global-бенчмарк, C: сравнение РФ vs Global, D: стратегия).
- НЕ называй конкретных чисел (CPL, %, ₽, метрики, размер рынка). Полный отчёт даст их.
- Каждая карточка — ОБОЗНАЧЕНИЕ темы + 1-2 тезиса. Структурные подразделы (A1-A6 и т.п.) дописываются на фронтенде, не присылай их.
- Тезисы привязаны к бизнесу клиента (упоминай специфику ниши/запроса).
- Все стратегические выводы (executive_preview, part_d_theses) явно отталкивайся от запроса клиента из intake.

ДОСТУПНЫЕ ИСТОЧНИКИ ДАННЫХ (только бесплатные публичные):
- Wordstat API v2, Я.Тренды, Google Trends — спрос
- Jina Reader (r.jina.ai) — парсинг лендингов
- Open SERP через web search
- TGStat public stats — Telegram
- ВК публичные данные
- Lighthouse / PageSpeed Insights — техка
- Я.Карты / 2ГИС публичные отзывы
- Rusprofile открытое, archive.org
- LLM training data + web search для Global

НЕДОСТУПНО (явно отметь как «нет данных» если попадётся):
- Backlink-профили конкурентов (нет Ahrefs/Semrush)
- Точный трафик (нет Similarweb)
- Внутренняя статистика клиента (нет GSC/Я.Метрики)
- Финансовая отчётность конкурентов (нет Контур.Фокус)

Возвращай ТОЛЬКО валидный JSON без markdown-обёртки.`

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

# Запрос клиента из intake (ОБЯЗАН быть процитирован дословно в intake_quote и быть основой part_d_theses + executive_preview)
"${args.intakeQuote}"

# Исходные ФАКТЫ research-стадии (по типам, только публичные источники)
${factsBlock || '(данных мало — формируй тезисы на уровне темы без конкретных утверждений)'}

# Подсказка по нишевым AI-автоматизациям (используй для ai_automation.niche_specific)
${nicheHint}

---

## Структура полного отчёта (для понимания контекста — НЕ повторяй эти списки в выводе)

🇷🇺 Часть A. РФ-анализ:
  A1. Industry Snapshot (Porter 5F + PESTEL + размер/рост)
  A2. Customer Insights (JTBD + сегменты)
  A3. Digital Footprint Map (Lighthouse-скоринг)
  A4. Competitor Profiles (top-5, 9-точечное)
  A5. SWOT-TOWS
  A6. Blue Ocean Value Curve

🌍 Часть B. Global-бенчмарк за 2 года:
  B1. Global Industry Snapshot (2-3 ведущие страны)
  B2. Global Trends & Innovations
  B3. Global Top Players

📊 Часть C. Сравнение РФ vs Global:
  C1. Comparison-таблица 8-10 параметров
  C2. Opportunity Gaps (что копировать)
  C3. Что не повторять

📋 Часть D. Стратегия и Roadmap (6-12 мес):
  D1. Roadmap по McKinsey 3H
  D2. Метрики успеха
  D3. 3-7 гипотез для тестирования

---

## Структура вывода JSON

{
  "intake_quote": "${args.intakeQuote.replace(/"/g, '\\"').replace(/\n/g, ' ')}",
  "executive_preview": [
    "3-4 тезиса от ИИ-стратега, явно отталкивающиеся от intake-запроса. Без чисел, с привязкой к бизнесу клиента."
  ],
  "part_a_theses": [
    "1-2 коротких тезиса о российском рынке и положении клиента в нём. Без чисел."
  ],
  "part_b_theses": [
    "1-2 тезиса о зарубежном опыте за 2 года, релевантных нише клиента. С пометкой 'применимость к РФ не гарантирована' где уместно."
  ],
  "part_c_theses": [
    "1 тезис о том, что российский рынок может позаимствовать у Global. Без раскрытия конкретики."
  ],
  "part_d_theses": [
    "1-2 тезиса о стратегии на 6-12 месяцев, отталкивающихся от intake-запроса."
  ],
  "implementation_l2_hints": {
    "part_a": "Одна фраза о том, что мы реализуем под ключ из РФ-инсайтов (например: посадочная под главную аудиторию). Или null.",
    "part_c": "Одна фраза о том, что мы реализуем из gap-возможностей. Или null.",
    "part_d": "Одна фраза о том, что мы реализуем из roadmap. Или null."
  },
  "ai_automation": {
    "business_process": {
      "emotional_thesis": "Увеличивайте фронт работ не нанимая — возможно, сокращая персонал. Не сделаете сейчас — проиграете конкурентам по издержкам.",
      "found_points": [
        { "title": "Точка автоматизации (название процесса)", "description": "1-2 предложения, без чисел" }
      ],
      "in_full": "Что раскрыто в полном отчёте — одна фраза",
      "implementation_l2": "Что мы реализуем под ключ — одна фраза"
    },
    "marketing": {
      "emotional_thesis": "Тезис про автопостинг + нейроагентов в рекл.каналах. ВСЕГДА присутствует, даже если pain не нашёлся.",
      "found_points": [
        { "title": "Автопостинг по соцсетям компании", "description": "..." },
        { "title": "Нейроагент в рекламных каналах для квалификации лидов", "description": "..." }
      ],
      "in_full": "Что раскрыто в полном",
      "implementation_l2": "Что мы реализуем под ключ"
    },
    "niche_specific": {
      "emotional_thesis": "Тезис про нишевые паттерны (используй nicheHint выше как ориентир)",
      "found_points": [
        { "title": "Нишевой паттерн 1", "description": "..." }
      ],
      "in_full": "Что раскрыто в полном",
      "implementation_l2": "Что мы реализуем под ключ"
    }
  }
}

## Правила
- intake_quote — точная цитата запроса из intake выше.
- executive_preview — ровно 3 или 4 пункта.
- part_a_theses / part_b_theses / part_d_theses — по 1-2 пункта.
- part_c_theses — ровно 1 пункт.
- НЕ ИСПОЛЬЗУЙ КОНКРЕТНЫЕ ЧИСЛА в тезисах/emotional_thesis/found_points.
- ai_automation.marketing присутствует ВСЕГДА (это часть 8.2 структуры).
- ai_automation.niche_specific — опирайся на nicheHint выше.
- found_points в каждом блоке AI — 2-3 пункта.
- implementation_l2_hints — короткие фразы или null, не списки.
- Если Global-источников мало — пиши общие тренды (B-часть) с пометкой про неполноту данных.
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

  // intake quote — берём оригинальный intake (не upgrade-snapshot)
  const intakeRows = await db
    .select({ payload: intakeSubmissions.inputPayload, createdAt: intakeSubmissions.createdAt })
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.companyId, companyId))
    .limit(5)

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

  const factRows = await db
    .select({ content: facts.content, researchType: facts.researchType })
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

function tolerantJsonParse(jsonStr: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>
  } catch (firstErr) {
    const repaired = jsonStr
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    try {
      return JSON.parse(repaired) as Record<string, unknown>
    } catch {
      throw firstErr
    }
  }
}

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
  const aiAuto = (data.ai_automation ?? {}) as Record<string, unknown>
  const l2hints = (data.implementation_l2_hints ?? {}) as Record<string, unknown>

  return {
    intake_quote: asString(data.intake_quote),
    executive_preview: asStringArray(data.executive_preview, 4),
    part_a_theses: asStringArray(data.part_a_theses, 3),
    part_b_theses: asStringArray(data.part_b_theses, 3),
    part_c_theses: asStringArray(data.part_c_theses, 2),
    part_d_theses: asStringArray(data.part_d_theses, 3),
    implementation_l2_hints: {
      part_a: asString(l2hints.part_a) || null,
      part_c: asString(l2hints.part_c) || null,
      part_d: asString(l2hints.part_d) || null,
    },
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
