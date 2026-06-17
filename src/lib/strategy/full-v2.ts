// FULL REPORT v2 — НОВЫЙ генератор полного отчёта, зеркалит утверждённый
// краткий v2 по структуре L2-методологии (Porter 5F, PESTEL, JTBD, SWOT-TOWS,
// Blue Ocean, McKinsey 3H). Параллельно со старым полным (не трогаем).
//
// АРХИТЕКТУРА СОГЛАСОВАННОСТИ (вариант C — incremental):
// 1. При генерации полного v2 СНАЧАЛА вызываем generateBriefV2 → получаем
//    BriefV2 JSON с baseline-фактами.
// 2. BriefV2 JSON передаётся в SYSTEM_PROMPT полного v2 как «утверждённый
//    краткий — подтвердить и расширить, НЕ противоречить».
// 3. Полный v2 LLM-вызов получает: facts из БД + intake-цитата + BriefV2 JSON.
// Это in-memory вариант incremental подхода без миграции БД (spec запрещает).
// Стоимость = 2 LLM-вызова (~$0.20-0.40), цена консистентности.

import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { facts, intakeSubmissions, companies, researchJobs } from '@/db/schema'
import { AI_CONFIG } from '@/lib/ai/config'
import {
  detectNicheId,
  getNicheAutomations,
  type NicheAutomationPattern,
} from './niche-automations'
import { generateBriefV2, type BriefV2 } from './brief-v2'

export const FULL_V2_MAX_TOKENS = 16000

// ─── Типы (зеркало 9 Частей структуры краткого v2) ────────────────────────────

export interface RsItem<T = string> {
  value: T
  rs: 'green' | 'yellow' | 'orange' | 'red' // RS-маркировка 🟢🟡🟠🔴
  source?: string
}

// Часть 0 — Executive Summary
export interface Part0Executive {
  intake_quote: string
  ru_position: string
  rf_vs_global: string
  top_3_actions: string[]
  key_risks: string[]
}

// Часть A — РФ-анализ (6 подразделов A1–A6)
export interface PorterForce {
  name: string // например «Рыночная власть покупателей»
  score: number // 1-5
  rationale: string
}

export interface PestelAxis {
  axis: string // Political / Economic / Social / Tech / Env / Legal
  factors: string[]
}

export interface PartA1Industry {
  market_size_rub: string
  cagr: string
  lifecycle_stage: string
  porter_forces: PorterForce[]
  pestel: PestelAxis[]
  top_regulatory_risks: string[]
}

export interface JtbdItem {
  job: string
  priority: 'high' | 'medium' | 'low'
}

export interface PartA2Customer {
  jtbd_top: JtbdItem[]
  pains_top: string[]
  gains_top: string[]
  voice_of_customer: string[]
  segmentation: string[]
}

export interface LighthouseScore {
  url: string
  performance: string
  seo: string
  notes: string
}

export interface PartA3Digital {
  client_lighthouse: LighthouseScore
  competitors_lighthouse: LighthouseScore[]
  content_coverage: string
  serp_observation: string
  data_limitation_note: string
}

export interface CompetitorProfile {
  name: string
  positioning: string
  segments: string
  pricing: string
  channels: string
  content_strategy: string
  tech_stack: string
  team_finance: string
  reviews_tonality: string
  recent_moves: string
  scoring: {
    offer: number
    audience: number
    proof: number
    creative: number
    landing: number
  }
  strengths: string[] // 3
  weaknesses: string[] // 3
  forecast_6m: string
}

export interface PartA4Competitors {
  profiles: CompetitorProfile[] // top-5
  summary_matrix_note: string
}

export interface PartA5SwotTows {
  swot: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  tows: {
    so: string[] // силы × возможности
    st: string[] // силы × угрозы
    wo: string[] // слабости × возможности
    wt: string[] // слабости × угрозы
  }
}

export interface PartA6BlueOcean {
  client_value_curve: string
  competitors_value_curves: string
  four_actions: {
    eliminate: string[]
    reduce: string[]
    raise: string[]
    create: string[]
  }
}

export interface PartA {
  a1: PartA1Industry
  a2: PartA2Customer
  a3: PartA3Digital
  a4: PartA4Competitors
  a5: PartA5SwotTows
  a6: PartA6BlueOcean
}

// Часть B — Global
export interface PartB {
  b1_global_snapshot: {
    leading_countries: string[]
    market_size_usd: string
    top_players: string[]
    consolidation_level: string
  }
  b2_trends: Array<{
    trend: string
    rf_arrival: 'already_here' | 'in_12m' | 'not_coming'
    note: string
  }>
  b3_top_global_players: Array<{
    name: string
    why_different_from_rf: string
  }>
}

// Часть C — Сравнение РФ vs Global
export interface PartC {
  c1_comparison_table: Array<{
    parameter: string
    rf: string
    global: string
    delta: string
    implication: string
  }>
  c2_opportunity_gaps: Array<{
    gap: string
    client_scenario: string
    complexity: 'low' | 'medium' | 'high'
  }>
  c3_what_not_to_repeat: Array<{
    attempt: string
    why_failed: string
    lesson: string
  }>
}

// Часть D — Стратегия и Roadmap
export interface RoadmapItem {
  action: string
  why: string
  metric: string
  timeline: string
}

export interface Kpi {
  name: string
  target_6m: string
}

export interface Hypothesis {
  statement: string
  test_method: string
  success_signal: string
  budget_range: string
}

export interface PartD {
  d1_roadmap: {
    h1: RoadmapItem[]
    h2: RoadmapItem[]
    h3: RoadmapItem[]
  }
  d2_kpis: Kpi[]
  d3_hypotheses: Hypothesis[]
}

// Часть E — AI-автоматизация
export interface EAutomation {
  title: string
  detailed_roadmap: string[]
  roi_estimate: string
  emotional_argument: string
  implementation_l2: string
}

export interface PartE {
  e1_business_process: EAutomation
  e2_marketing: EAutomation
  e3_niche_specific: EAutomation
}

// Часть G — Достоверность
export interface Source {
  description: string
  rs: 'green' | 'yellow' | 'orange' | 'red'
  url?: string
}

export interface PartG {
  g1_sources: Source[]
  g2_unverified: string[]
  g3_open_questions: string[]
}

// Полный отчёт v2
export interface FullV2 {
  part_0: Part0Executive
  part_a: PartA
  part_b: PartB
  part_c: PartC
  part_d: PartD
  part_e: PartE
  part_g: PartG
}

// ─── Промпт ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты — старший бизнес-стратег. Создаёшь ПОЛНЫЙ отчёт по L2-методологии (Porter 5F + PESTEL + JTBD + SWOT-TOWS + Blue Ocean + McKinsey 3H).

КРИТИЧНО:
- На входе ты получишь УТВЕРЖДЁННЫЙ КРАТКИЙ ОТЧЁТ v2 (BriefV2 JSON). Полный отчёт ОБЯЗАН подтверждать его факты и тезисы. НЕ ПРОТИВОРЕЧИТЬ кратком.
- Полный = глубокое раскрытие каждой темы краткого. Если в кратком было «у клиента сильная позиция», полный детализирует чем именно (с конкретными цифрами/фактами).
- Все стратегические выводы отталкивайся от intake-запроса клиента (он есть в BriefV2.intake_quote).
- Конкретные числа разрешены (в отличие от краткого) — это полный отчёт, клиент платит за детали.

МЕТОДОЛОГИЯ ПО ЧАСТЯМ:
- Часть A1: Porter 5 Forces (оценка 1-5 по каждой) + PESTEL (6 осей)
- Часть A2: JTBD (jobs-to-be-done) + Top-10 pains/gains + voice-of-customer цитаты из публичных отзывов
- Часть A3: Lighthouse-скоринг сайта клиента и top-5 конкурентов; контент-покрытие через Wordstat
- Часть A4: 9-точечные карточки top-5 конкурентов + scoring 0-10 по 5 параметрам + 3 силы + 3 слабости + прогноз 6 мес
- Часть A5: SWOT таблица + TOWS-матрица (SO, ST, WO, WT — каждая ячейка с конкретными действиями)
- Часть A6: Blue Ocean Value Curve + 4 действия (eliminate / reduce / raise / create)
- Часть B: Global-бенчмарк через web search и LLM training data (с пометкой «применимость к РФ не гарантирована»)
- Часть C: Comparison-таблица 8-10 параметров + 3-5 opportunity gaps + 3-5 «не повторять»
- Часть D: Roadmap McKinsey 3H (H1 0-6 мес, H2 6-18 мес, H3 18-36 мес) + 5-8 KPI + 3-7 testable hypotheses
- Часть E: AI-автоматизация — детальный roadmap + ROI-оценка + эмоциональный аргумент + sub-плашка реализации

ИСТОЧНИКИ ДАННЫХ (только бесплатные публичные):
- Jina Reader (r.jina.ai) — парсинг лендингов
- Wordstat API v2, Я.Тренды, Google Trends
- TGStat public stats, ВК публичные данные
- Lighthouse / PageSpeed Insights
- Wappalyzer публично (тех-стек конкурентов)
- Открытые отзывы Я.Карт / 2ГИС
- Rusprofile открытое
- archive.org Wayback Machine
- Web search для Global-части

НЕДОСТУПНО (если попадётся — явно в part_g.g2_unverified):
- Backlink-профили (нет Ahrefs/Semrush)
- Точный трафик (нет Similarweb)
- GSC / Я.Метрика / Я.Вебмастер клиента
- Финансовая отчётность конкурентов (нет Контур.Фокус)

RS-МАРКИРОВКА для Part G:
🟢 green — Официальный (ФНС/Росстат/официальный сайт компании)
🟡 yellow — Оценочный (косвенные сигналы, аналитика)
🟠 orange — Экспертный (мнение, без верификации)
🔴 red — Неверифицируемый (слухи, неподтверждённое)

Возвращай ТОЛЬКО валидный JSON без markdown-обёртки.`

export function buildFullV2Prompt(args: {
  companyName: string
  industry: string
  description: string | null
  website: string | null
  intakeQuote: string
  briefV2: BriefV2 // утверждённый краткий — основа для согласованности
  factsByType: Record<string, string[]>
  nicheAutomationsPreview: NicheAutomationPattern[]
}): string {
  const factsBlock = Object.entries(args.factsByType)
    .filter(([, items]) => items.length > 0)
    .map(([type, items]) => `### ${type}\n${items.slice(0, 30).map((f) => `- ${f}`).join('\n')}`)
    .join('\n\n')

  const nicheHint = args.nicheAutomationsPreview
    .map((p) => `- "${p.title}" — ${p.description}`)
    .join('\n')

  return `# Компания
${args.companyName}${args.website ? ` · ${args.website}` : ''}${args.industry ? ` · ${args.industry}` : ''}
${args.description ? `Описание: ${args.description}` : ''}

# Запрос клиента из intake (определяет угол всех выводов)
"${args.intakeQuote}"

# Утверждённый краткий отчёт v2 (BriefV2 JSON — это твоя основа; полный раскрывает его детали и НЕ противоречит)
\`\`\`json
${JSON.stringify(args.briefV2, null, 2)}
\`\`\`

# Исходные ФАКТЫ research-стадии (по типам)
${factsBlock || '(данных мало — отметь это в part_g.g2_unverified)'}

# Подсказка по нишевым AI-автоматизациям (для part_e.e3_niche_specific)
${nicheHint}

---

## Структура вывода JSON (9 Частей)

{
  "part_0": {
    "intake_quote": "точная цитата из intake",
    "ru_position": "1 параграф о позиции клиента в РФ",
    "rf_vs_global": "1 параграф о том где РФ относительно Global",
    "top_3_actions": ["3 приоритетных действия"],
    "key_risks": ["3-5 ключевых рисков"]
  },
  "part_a": {
    "a1": {
      "market_size_rub": "размер рынка в ₽ (диапазон если нет точного)",
      "cagr": "темп роста, %",
      "lifecycle_stage": "стадия (рост/зрелость/упадок)",
      "porter_forces": [
        { "name": "Угроза новых игроков", "score": 3, "rationale": "обоснование" },
        { "name": "Рыночная власть поставщиков", "score": 2, "rationale": "..." },
        { "name": "Рыночная власть покупателей", "score": 4, "rationale": "..." },
        { "name": "Угроза заменителей", "score": 3, "rationale": "..." },
        { "name": "Конкуренция в отрасли", "score": 4, "rationale": "..." }
      ],
      "pestel": [
        { "axis": "Political", "factors": ["фактор 1", "фактор 2"] },
        { "axis": "Economic", "factors": [...] },
        { "axis": "Social", "factors": [...] },
        { "axis": "Technological", "factors": [...] },
        { "axis": "Environmental", "factors": [...] },
        { "axis": "Legal", "factors": [...] }
      ],
      "top_regulatory_risks": ["риск 1", "риск 2", "..."]
    },
    "a2": {
      "jtbd_top": [{ "job": "...", "priority": "high|medium|low" }],
      "pains_top": ["top 10 болей по убыванию частоты × силы"],
      "gains_top": ["top 10 выгод"],
      "voice_of_customer": ["цитаты из публичных отзывов (5-10)"],
      "segmentation": ["сегменты по поведению (3-5)"]
    },
    "a3": {
      "client_lighthouse": { "url": "...", "performance": "...", "seo": "...", "notes": "..." },
      "competitors_lighthouse": [{ "url": "...", "performance": "...", "seo": "...", "notes": "..." }],
      "content_coverage": "оценка покрытия топ-50 запросов ниши",
      "serp_observation": "кто где в открытом SERP-наблюдении",
      "data_limitation_note": "нет доступа к GSC/Я.Метрике"
    },
    "a4": {
      "profiles": [
        {
          "name": "Имя конкурента",
          "positioning": "value-prop одной фразой",
          "segments": "целевые сегменты",
          "pricing": "модель ценообразования",
          "channels": "каналы привлечения",
          "content_strategy": "оценка через Jina Reader / TGStat",
          "tech_stack": "Wappalyzer-наблюдение",
          "team_finance": "Rusprofile открытое",
          "reviews_tonality": "тональность отзывов Я.Карт/2ГИС",
          "recent_moves": "последние 3-6 мес",
          "scoring": { "offer": 7, "audience": 6, "proof": 5, "creative": 4, "landing": 6 },
          "strengths": ["сила 1", "сила 2", "сила 3"],
          "weaknesses": ["слабость 1", "слабость 2", "слабость 3"],
          "forecast_6m": "что сделают в 6 мес"
        }
      ],
      "summary_matrix_note": "краткая сводная заметка по всей матрице"
    },
    "a5": {
      "swot": {
        "strengths": ["..."],
        "weaknesses": ["..."],
        "opportunities": ["..."],
        "threats": ["..."]
      },
      "tows": {
        "so": ["силы × возможности — 2-3 действия с приоритетом и сроком"],
        "st": ["силы × угрозы — действия"],
        "wo": ["слабости × возможности — действия"],
        "wt": ["слабости × угрозы — действия"]
      }
    },
    "a6": {
      "client_value_curve": "описание кривой ценности клиента",
      "competitors_value_curves": "сравнение с top-5 кривыми",
      "four_actions": {
        "eliminate": ["что убрать"],
        "reduce": ["что снизить"],
        "raise": ["что усилить"],
        "create": ["что создать новое"]
      }
    }
  },
  "part_b": {
    "b1_global_snapshot": {
      "leading_countries": ["США", "Германия", "..."],
      "market_size_usd": "...",
      "top_players": ["игрок 1", "..."],
      "consolidation_level": "степень консолидации"
    },
    "b2_trends": [
      { "trend": "тренд", "rf_arrival": "already_here|in_12m|not_coming", "note": "..." }
    ],
    "b3_top_global_players": [
      { "name": "...", "why_different_from_rf": "..." }
    ]
  },
  "part_c": {
    "c1_comparison_table": [
      { "parameter": "Размер рынка", "rf": "...", "global": "...", "delta": "...", "implication": "..." }
    ],
    "c2_opportunity_gaps": [
      { "gap": "...", "client_scenario": "...", "complexity": "low|medium|high" }
    ],
    "c3_what_not_to_repeat": [
      { "attempt": "...", "why_failed": "...", "lesson": "..." }
    ]
  },
  "part_d": {
    "d1_roadmap": {
      "h1": [{ "action": "...", "why": "...", "metric": "...", "timeline": "0-6 мес" }],
      "h2": [{ "action": "...", "why": "...", "metric": "...", "timeline": "6-18 мес" }],
      "h3": [{ "action": "...", "why": "...", "metric": "...", "timeline": "18-36 мес" }]
    },
    "d2_kpis": [
      { "name": "...", "target_6m": "..." }
    ],
    "d3_hypotheses": [
      { "statement": "...", "test_method": "...", "success_signal": "...", "budget_range": "..." }
    ]
  },
  "part_e": {
    "e1_business_process": {
      "title": "Автоматизация бизнес-процессов",
      "detailed_roadmap": ["этап 1", "этап 2", "..."],
      "roi_estimate": "ROI оценка",
      "emotional_argument": "развёрнутый аргумент про издержки",
      "implementation_l2": "что делаем под ключ"
    },
    "e2_marketing": {
      "title": "Автоматизация маркетинга (ВСЕГДА)",
      "detailed_roadmap": ["..."],
      "roi_estimate": "...",
      "emotional_argument": "...",
      "implementation_l2": "..."
    },
    "e3_niche_specific": {
      "title": "Нишевые автоматизации",
      "detailed_roadmap": ["..."],
      "roi_estimate": "...",
      "emotional_argument": "...",
      "implementation_l2": "..."
    }
  },
  "part_g": {
    "g1_sources": [
      { "description": "описание источника", "rs": "green|yellow|orange|red", "url": "опц." }
    ],
    "g2_unverified": ["факт, который не удалось верифицировать"],
    "g3_open_questions": ["вопрос для контрольной точки 3 мес"]
  }
}

## Правила
- part_a.a1.porter_forces — ровно 5 элементов (5 сил Портера).
- part_a.a1.pestel — ровно 6 элементов (6 осей).
- part_a.a2.pains_top — 5-10 элементов; gains_top — 5-10.
- part_a.a4.profiles — 2-5 элементов (по факту наличия конкурентов в краткий v2).
- part_b.b2_trends — 5-10 элементов.
- part_c.c1_comparison_table — 8-10 строк.
- part_c.c2_opportunity_gaps — 3-5.
- part_d.d1_roadmap.h1 — 3-5; h2 — 3-5; h3 — 2-3.
- part_d.d3_hypotheses — 3-7.
- part_e.e2_marketing присутствует ВСЕГДА, даже если pain не нашёлся.
- part_g.g1_sources — все ключевые факты помечены rs.
- Часть F (Реализация под ключ) и Часть H (Compliance) — статичные блоки, в JSON НЕ присылай, они хардкодятся в компоненте.
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
  researchJobId: string
  companyId: string
}

async function collectInputs(artifactId: string): Promise<CollectedInputs | null> {
  const db = getDb()

  // Находим researchJobId и companyId через artifact → researchJob
  const [job] = await db
    .select({
      researchJobId: researchJobs.id,
      companyId: researchJobs.companyId,
    })
    .from(researchJobs)
    .where(eq(researchJobs.id, artifactId)) // на случай если передали jobId напрямую
    .limit(1)

  if (!job) return null

  const [companyRow] = await db
    .select({
      name: companies.name,
      industry: companies.industry,
      description: companies.description,
      website: companies.website,
    })
    .from(companies)
    .where(eq(companies.id, job.companyId))
    .limit(1)

  const intakeRows = await db
    .select({ payload: intakeSubmissions.inputPayload })
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.companyId, job.companyId))
    .limit(5)

  const original =
    intakeRows.find(
      (r) => !(r.payload as Record<string, unknown>)?._upgrade_from_artifact,
    ) ?? intakeRows[0]
  const payload = (original?.payload ?? {}) as Record<string, unknown>
  const intakeQuote =
    (payload.research_goal as string | undefined) ||
    (payload.goals as string | undefined) ||
    (payload.request as string | undefined) ||
    'Главный запрос не указан в intake'

  const factRows = await db
    .select({ content: facts.content, researchType: facts.researchType })
    .from(facts)
    .where(eq(facts.researchJobId, job.researchJobId))
    .limit(400)

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
    researchJobId: job.researchJobId,
    companyId: job.companyId,
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
      'X-Title': 'ai-strategist-full-v2',
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

// Парсер. Жёстко не валидируем — если поля отсутствуют, оставляем пустыми.
// Это позволяет UI рендериться даже на неполных JSON-ответах.
export function parseFullV2(raw: string): FullV2 {
  const data = tolerantJsonParse(extractJSON(raw))
  return data as unknown as FullV2 // doверяем форматтированию через response_format=json_object
}

// ─── Главная функция ──────────────────────────────────────────────────────────

export async function generateFullV2(args: {
  artifactIdOrJobId: string
}): Promise<{ raw: string; parsed: FullV2; brief: BriefV2 }> {
  const inputs = await collectInputs(args.artifactIdOrJobId)
  if (!inputs) {
    throw new Error(`Не найден research job для ${args.artifactIdOrJobId}`)
  }

  // 1. Сначала генерим краткий v2 — это входной фундамент для полного
  const briefResult = await generateBriefV2({
    researchJobId: inputs.researchJobId,
    companyId: inputs.companyId,
  })

  // 2. Генерим полный с brief v2 как контекстом
  const nicheId = detectNicheId(`${inputs.industry} ${inputs.description ?? ''}`)
  const nicheAutomationsPreview = getNicheAutomations(nicheId)

  const userPrompt = buildFullV2Prompt({
    companyName: inputs.companyName,
    industry: inputs.industry,
    description: inputs.description,
    website: inputs.website,
    intakeQuote: inputs.intakeQuote,
    briefV2: briefResult.parsed,
    factsByType: inputs.factsByType,
    nicheAutomationsPreview,
  })

  const raw = await callOpenRouterForJSON(
    SYSTEM_PROMPT,
    userPrompt,
    FULL_V2_MAX_TOKENS,
    AI_CONFIG.strategy.synthesisModel,
  )

  const parsed = parseFullV2(raw)
  return { raw, parsed, brief: briefResult.parsed }
}
