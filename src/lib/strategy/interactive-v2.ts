// INTERACTIVE v2 — интерактивный «рабочий отчёт» (дизайн innodor-report.html),
// первый экран для paid-клиента после оплаты, ДО 70–80-стр. FullV2.
//
// Это НЕ новое исследование — дистилляция уже сгенерированных FullV2 + BriefV2
// в ~10 «экранов» по методологии «Ответ на запрос клиента»: 3 критерия отбора
// контента (понимание бизнеса/клиентов · квалификация · дорожка к следующему
// шагу), честная маркировка ФАКТ/ГИПОТЕЗА/НЕДОСТАТОЧНО ДАННЫХ, деньги — в ₽.
// Один LLM-вызов (в отличие от 8 параллельных у full-v2) — дёшево, т.к. вход
// уже структурированный JSON, а не сырые research-факты.

import { AI_CONFIG } from '@/lib/ai/config'
import { recordLlmCall } from '@/lib/cost/record'
import type { FullV2 } from './full-v2'
import type { BriefV2 } from './brief-v2'

export const INTERACTIVE_V2_MAX_TOKENS = 16000

// ─── Типы (зеркало секций innodor-report.html) ─────────────────────────────

// Маркировка достоверности утверждения — тот же словарь, что в
// .claude/rules/data-reliability.md (ФАКТ / ГИПОТЕЗА / НЕДОСТАТОЧНО ДАННЫХ).
export type ClaimTag = 'FACT' | 'HYPOTHESIS' | 'INSUFFICIENT_DATA'

export interface TrustBadge {
  value: string
  label: string
}

export interface InteractiveHero {
  eyebrow: string // короткий лейбл-рубрика, например ниша или "AI-стратегия"
  title_main: string
  title_accent: string // курсивная акцентная строка под title_main
  subtitle: string
  date_label: string
  scope_label: string // масштаб компании (регионы/сегмент), кратко
  horizon_label: string // горизонт плана
  trust_badges: TrustBadge[] // ровно 4
}

export interface ThreeAction {
  step_label: string // "Шаг 01 — Фундамент"
  title: string
  body: string
  priority: 'critical' | 'high' | 'medium'
}

export interface ProfileRow {
  label: string
  value: string
}

export interface PositionScore {
  label: string
  value: number // 1-5
  tone: 'danger' | 'warning' | 'success'
}

export interface InteractiveContext {
  profile_rows: ProfileRow[] // операционный профиль компании, 4-6 строк
  competitive_position: string // 1-2 абзаца
  position_scores: PositionScore[] // 2-3 Porter-подобные полоски
  regional_risk_callout: string | null
}

export interface LossItem {
  title: string
  summary: string
  detail: string
  impact_value: string
  impact_label: string
}

export interface DiagnosisCard {
  eyebrow: string
  problem: string
  effect: string
  action: string
  severity: 'danger' | 'warning' | 'gold' | 'primary'
}

export interface JtbdCard {
  scenario: string
  job: string
  pain: string
}

export interface DigitalMetric {
  label: string
  current: number
  target: number
  unit: string
}

export interface DigitalTask {
  priority: 'crit' | 'high' | 'med' | 'low'
  title: string
  note: string
}

export interface InteractiveDigitalAudit {
  chart_note: string
  metrics: DigitalMetric[]
  tasks: DigitalTask[]
  caveat: string | null
}

export interface PhaseItem {
  title: string
  desc: string
  period_badge: string
  cost_badge: string
}

export interface KpiRow {
  metric: string
  now: string
  target_6m: string
  status: 'crit' | 'high' | 'ok'
}

export interface InteractiveRoadmap {
  horizon_labels: [string, string]
  h1: PhaseItem[]
  h2: PhaseItem[]
  kpi_table: KpiRow[]
}

export interface RoiRow {
  operation: string
  time_per_unit: string
  current_cost: string
  after_cost: string
  savings: string
}

export interface RoiAssumption {
  tag: ClaimTag
  text: string
}

export interface InteractiveRoi {
  header: { current_cost: string; savings: string; payback: string }
  rows: RoiRow[]
  total_row: RoiRow
  chart: { labels: string[]; before: number[]; after: number[] } | null
  assumptions: RoiAssumption[]
}

export interface InteractiveSwot {
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
}

export interface RiskRow {
  risk: string
  probability: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  mitigation: string
}

export interface OpenQuestion {
  question: string
  why: string
}

export interface InteractiveV2 {
  hero: InteractiveHero
  three_actions: ThreeAction[] // ровно 3
  context: InteractiveContext
  losses: LossItem[] // 3-5
  diagnosis: DiagnosisCard[] // 4
  jtbd: JtbdCard[] // 4-6
  digital_audit: InteractiveDigitalAudit | null
  roadmap: InteractiveRoadmap
  roi: InteractiveRoi | null
  swot: InteractiveSwot
  risks: RiskRow[] // 3-5
  open_questions: OpenQuestion[] // 3-5
  next_step: { title: string; body: string }
}

// ─── Промпт ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты — старший консультант, который переупаковывает уже готовый 70–80-страничный
стратегический отчёт (FullV2 + BriefV2, оба на входе как JSON) в короткий
интерактивный «рабочий отчёт» для первого прочтения владельцем бизнеса.

ЦЕЛЬ (методология «Ответ на запрос клиента»): этот экран должен (1) показать,
что мы поняли бизнес и его клиентов, (2) показать квалификацию — умеем
поставить диагноз и дать реалистичный план, (3) дать простую дорожку к
следующему шагу. Всё, что не работает на этих трёх целях, — не включай.

КРИТИЧНО — ТЫ НЕ ПРИДУМЫВАЕШЬ НОВЫЕ ФАКТЫ:
- Источник контента — ТОЛЬКО то, что уже есть в переданных FullV2 и BriefV2.
  Ты редактируешь и переупаковываешь (сокращаешь, ранжируешь, переписываешь
  языком для собственника бизнеса), а не исследуешь заново.
- Каждое число (₽, %, часы, дни) должно быть взято из входного JSON, а не
  выдумано. Если подходящего числа нет — используй диапазон/оценку из входа
  или не включай числовую метрику вовсе.
- Поле "tag" (ClaimTag) у допущений/оценок: "FACT" — подтверждено RS≥3 в
  исходных данных, "HYPOTHESIS" — разумное предположение из входного JSON,
  "INSUFFICIENT_DATA" — данных не хватает, нужно уточнить у клиента.
- Все суммы — в рублях (₽). Язык — русский.

ЧТО МОЖЕТ БЫТЬ NULL:
- "digital_audit": null, если у клиента нет пригодных для графика метрик сайта
  (part_a.a3.client_lighthouse пустой/generic — не выдумывай Lighthouse-цифры).
- "roi": null, если ни один из part_e.e1/e2/e3.roi_estimate не содержит
  достаточно конкретики для таблицы «до/после» в рублях.

СТРУКТУРА ВЫХОДА (строго этот JSON, без markdown-обёртки, без комментариев):
{
  "hero": {
    "eyebrow": "короткая рубрика (ниша/фокус)",
    "title_main": "название компании + суть (например 'Стратегия роста')",
    "title_accent": "курсивная акцентная строка-подзаголовок",
    "subtitle": "1-2 предложения — что за отчёт и какую задачу решает",
    "date_label": "Месяц Год",
    "scope_label": "масштаб компании коротко (регионы/сегмент/объём)",
    "horizon_label": "Горизонт плана: 12 месяцев",
    "trust_badges": [ровно 4: { "value": "число/строка", "label": "подпись" } — например точки потерь, экономия/мес, срок окупаемости, число приоритетных действий]
  },
  "three_actions": [ровно 3: { "step_label": "Шаг 0N — тема", "title", "body", "priority": "critical|high|medium" }] — бери из part_0.top_3_actions,
  "context": {
    "profile_rows": [4-6: { "label", "value" }] — операционный профиль компании из part_a.a1/intake,
    "competitive_position": "1-2 абзаца — конкурентная позиция, из part_a.a1.porter_forces",
    "position_scores": [2-3: { "label", "value" (1-5), "tone": "danger|warning|success" }] — из porter_forces с наибольшим влиянием,
    "regional_risk_callout": "строка или null — ключевой региональный/отраслевой риск из top_regulatory_risks"
  },
  "losses": [3-5: { "title", "summary", "detail" (подробное объяснение с рекомендацией), "impact_value" (число/срок), "impact_label" }] — из part_a.a2.pains_top + part_a.a5.swot.weaknesses,
  "diagnosis": [ровно 4: { "eyebrow", "problem", "effect", "action", "severity": "danger|warning|gold|primary" }] — синтез слабостей + roadmap-действий,
  "jtbd": [4-6: { "scenario", "job", "pain" }] — из part_a.a2.jtbd_top + pains_top,
  "digital_audit": null ИЛИ {
    "chart_note": "1 строка о происхождении данных",
    "metrics": [2-4: { "label", "current" (число), "target" (число), "unit" }] — из client_lighthouse,
    "tasks": [3-6: { "priority": "crit|high|med|low", "title", "note" }],
    "caveat": "строка или null — что не входит в аудит"
  },
  "roadmap": {
    "horizon_labels": ["H1 — 0-6 мес: суть", "H2 — 6-12 мес: суть"],
    "h1": [3-5: { "title", "desc", "period_badge", "cost_badge" }] — из part_d.d1_roadmap.h1,
    "h2": [2-4: { "title", "desc", "period_badge", "cost_badge" }] — из part_d.d1_roadmap.h2,
    "kpi_table": [4-6: { "metric", "now", "target_6m", "status": "crit|high|ok" }] — из part_d.d2_kpis
  },
  "roi": null ИЛИ {
    "header": { "current_cost", "savings", "payback" },
    "rows": [3-5: { "operation", "time_per_unit", "current_cost", "after_cost", "savings" }],
    "total_row": { "operation": "Итого", "time_per_unit": "", "current_cost", "after_cost", "savings" },
    "chart": null ИЛИ { "labels": [строки], "before": [числа], "after": [числа] },
    "assumptions": [2-4: { "tag": "FACT|HYPOTHESIS|INSUFFICIENT_DATA", "text" }]
  },
  "swot": { "strengths": [3-5], "weaknesses": [3-5], "opportunities": [3-5], "threats": [3-5] } — из part_a.a5.swot,
  "risks": [3-5: { "risk", "probability": "high|medium|low", "impact": "high|medium|low", "mitigation" }] — из part_0.key_risks + part_g,
  "open_questions": [3-5: { "question", "why" }] — из part_g.g3_open_questions,
  "next_step": { "title": "Следующий шаг", "body": "конкретное предложение (встреча/пилот/уточнение) на основе part_a4/summary — простым языком для собственника, БЕЗ внутреннего жаргона отчёта (не писать 'H1', 'H2', 'Горизонт 1/2', названия частей отчёта)" }
}

Возвращай ТОЛЬКО валидный JSON, без markdown-обёртки.`

export function buildInteractiveV2Prompt(args: {
  companyName: string
  industry: string
  intakeQuote?: string | null
  full: FullV2
  brief: BriefV2
}): string {
  return `# Компания
${args.companyName}${args.industry ? ` · ниша: ${args.industry}` : ''}
${args.intakeQuote ? `Запрос клиента: «${args.intakeQuote}»` : ''}

# Полный отчёт (FullV2) — источник всего контента
${JSON.stringify(args.full)}

# Краткий отчёт (BriefV2) — для сверки тона и приоритетов
${JSON.stringify(args.brief)}

Собери InteractiveV2 JSON строго по структуре из системного промпта, используя
только факты из переданных отчётов выше.`
}

// ─── Парсинг / нормализация ────────────────────────────────────────────────

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
  costContext?: { researchJobId?: string | null; stage: string },
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured')

  const requestBody = {
    model: modelId,
    max_tokens: maxTokens,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    provider: { allow_fallbacks: true, order: ['Anthropic'] },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }

  const MAX_ATTEMPTS = 3
  let lastError = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://ai-strategist-bice.vercel.app',
        'X-Title': 'ai-strategist-interactive-v2',
      },
      body: JSON.stringify(requestBody),
    })

    if (res.ok) {
      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string; finish_reason?: string } }>
        usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
      }
      const choice = body.choices?.[0]
      const content = choice?.message?.content
      const promptTokens = body.usage?.prompt_tokens
      const completionTokens = body.usage?.completion_tokens
      const usageCost = body.usage?.cost

      if (costContext) {
        void recordLlmCall({
          researchJobId: costContext.researchJobId,
          stage: costContext.stage,
          provider: 'openrouter',
          model: modelId,
          promptTokens,
          completionTokens,
          costUsd: typeof usageCost === 'number' ? usageCost : null,
          metadata: { finish_reason: choice?.message?.finish_reason, attempt },
        })
      }

      if (!content) throw new Error('OpenRouter: пустой content в ответе')
      return content
    }

    const errText = await res.text().catch(() => '<no body>')
    lastError = `OpenRouter ${res.status} ${res.statusText}: ${errText.slice(0, 300)}`

    if ((res.status === 429 || res.status === 503) && attempt < MAX_ATTEMPTS) {
      const backoffMs = 2000 * Math.pow(2, attempt - 1)
      console.warn(`[interactive-v2] OpenRouter ${res.status} on attempt ${attempt}, retry in ${backoffMs}ms`)
      await new Promise((r) => setTimeout(r, backoffMs))
      continue
    }
    throw new Error(lastError)
  }
  throw new Error(lastError)
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function asArray<T>(v: unknown, mapItem: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map(mapItem)
    .filter((x): x is T => x !== null)
}

// Дефолт-заполняющий парсер: LLM почти всегда даёт валидный JSON (response_format
// json_object), но отдельные вложенные поля могут отсутствовать — не роняем
// рендер, а подставляем безопасные дефолты (пустые массивы/строки).
export function normalizeInteractiveV2(raw: Record<string, unknown>): InteractiveV2 {
  const hero = (raw.hero ?? {}) as Record<string, unknown>
  const context = (raw.context ?? {}) as Record<string, unknown>
  const roadmap = (raw.roadmap ?? {}) as Record<string, unknown>
  const swot = (raw.swot ?? {}) as Record<string, unknown>
  const nextStep = (raw.next_step ?? {}) as Record<string, unknown>

  const digitalAuditRaw = raw.digital_audit
  const digital_audit: InteractiveDigitalAudit | null =
    digitalAuditRaw && typeof digitalAuditRaw === 'object'
      ? (() => {
          const d = digitalAuditRaw as Record<string, unknown>
          return {
            chart_note: asString(d.chart_note),
            metrics: asArray(d.metrics, (m) => ({
              label: asString(m.label),
              current: asNumber(m.current),
              target: asNumber(m.target),
              unit: asString(m.unit),
            })),
            tasks: asArray(d.tasks, (t) => ({
              priority: (['crit', 'high', 'med', 'low'].includes(asString(t.priority))
                ? asString(t.priority)
                : 'med') as DigitalTask['priority'],
              title: asString(t.title),
              note: asString(t.note),
            })),
            caveat: typeof d.caveat === 'string' ? d.caveat : null,
          }
        })()
      : null

  const roiRaw = raw.roi
  const roi: InteractiveRoi | null =
    roiRaw && typeof roiRaw === 'object'
      ? (() => {
          const r = roiRaw as Record<string, unknown>
          const header = (r.header ?? {}) as Record<string, unknown>
          const totalRow = (r.total_row ?? {}) as Record<string, unknown>
          const chartRaw = r.chart
          return {
            header: {
              current_cost: asString(header.current_cost),
              savings: asString(header.savings),
              payback: asString(header.payback),
            },
            rows: asArray(r.rows, (row) => ({
              operation: asString(row.operation),
              time_per_unit: asString(row.time_per_unit),
              current_cost: asString(row.current_cost),
              after_cost: asString(row.after_cost),
              savings: asString(row.savings),
            })),
            total_row: {
              operation: asString(totalRow.operation, 'Итого'),
              time_per_unit: asString(totalRow.time_per_unit),
              current_cost: asString(totalRow.current_cost),
              after_cost: asString(totalRow.after_cost),
              savings: asString(totalRow.savings),
            },
            chart:
              chartRaw && typeof chartRaw === 'object'
                ? {
                    labels: asStringArray((chartRaw as Record<string, unknown>).labels),
                    before: (Array.isArray((chartRaw as Record<string, unknown>).before)
                      ? ((chartRaw as Record<string, unknown>).before as unknown[])
                      : []
                    ).map((x) => asNumber(x)),
                    after: (Array.isArray((chartRaw as Record<string, unknown>).after)
                      ? ((chartRaw as Record<string, unknown>).after as unknown[])
                      : []
                    ).map((x) => asNumber(x)),
                  }
                : null,
            assumptions: asArray(r.assumptions, (a) => ({
              tag: (['FACT', 'HYPOTHESIS', 'INSUFFICIENT_DATA'].includes(asString(a.tag))
                ? asString(a.tag)
                : 'HYPOTHESIS') as ClaimTag,
              text: asString(a.text),
            })),
          }
        })()
      : null

  return {
    hero: {
      eyebrow: asString(hero.eyebrow),
      title_main: asString(hero.title_main),
      title_accent: asString(hero.title_accent),
      subtitle: asString(hero.subtitle),
      date_label: asString(hero.date_label),
      scope_label: asString(hero.scope_label),
      horizon_label: asString(hero.horizon_label),
      trust_badges: asArray(hero.trust_badges, (b) => ({
        value: asString(b.value),
        label: asString(b.label),
      })),
    },
    three_actions: asArray(raw.three_actions, (a) => ({
      step_label: asString(a.step_label),
      title: asString(a.title),
      body: asString(a.body),
      priority: (['critical', 'high', 'medium'].includes(asString(a.priority))
        ? asString(a.priority)
        : 'medium') as ThreeAction['priority'],
    })),
    context: {
      profile_rows: asArray(context.profile_rows, (r) => ({
        label: asString(r.label),
        value: asString(r.value),
      })),
      competitive_position: asString(context.competitive_position),
      position_scores: asArray(context.position_scores, (s) => ({
        label: asString(s.label),
        value: asNumber(s.value, 3),
        tone: (['danger', 'warning', 'success'].includes(asString(s.tone))
          ? asString(s.tone)
          : 'warning') as PositionScore['tone'],
      })),
      regional_risk_callout: typeof context.regional_risk_callout === 'string' ? context.regional_risk_callout : null,
    },
    losses: asArray(raw.losses, (l) => ({
      title: asString(l.title),
      summary: asString(l.summary),
      detail: asString(l.detail),
      impact_value: asString(l.impact_value),
      impact_label: asString(l.impact_label),
    })),
    diagnosis: asArray(raw.diagnosis, (d) => ({
      eyebrow: asString(d.eyebrow),
      problem: asString(d.problem),
      effect: asString(d.effect),
      action: asString(d.action),
      severity: (['danger', 'warning', 'gold', 'primary'].includes(asString(d.severity))
        ? asString(d.severity)
        : 'primary') as DiagnosisCard['severity'],
    })),
    jtbd: asArray(raw.jtbd, (j) => ({
      scenario: asString(j.scenario),
      job: asString(j.job),
      pain: asString(j.pain),
    })),
    digital_audit,
    roadmap: {
      horizon_labels: [
        asString((roadmap.horizon_labels as unknown[] | undefined)?.[0], 'H1 — 0–6 мес'),
        asString((roadmap.horizon_labels as unknown[] | undefined)?.[1], 'H2 — 6–12 мес'),
      ],
      h1: asArray(roadmap.h1, (p) => ({
        title: asString(p.title),
        desc: asString(p.desc),
        period_badge: asString(p.period_badge),
        cost_badge: asString(p.cost_badge),
      })),
      h2: asArray(roadmap.h2, (p) => ({
        title: asString(p.title),
        desc: asString(p.desc),
        period_badge: asString(p.period_badge),
        cost_badge: asString(p.cost_badge),
      })),
      kpi_table: asArray(roadmap.kpi_table, (k) => ({
        metric: asString(k.metric),
        now: asString(k.now),
        target_6m: asString(k.target_6m),
        status: (['crit', 'high', 'ok'].includes(asString(k.status)) ? asString(k.status) : 'high') as KpiRow['status'],
      })),
    },
    roi,
    swot: {
      strengths: asStringArray(swot.strengths),
      weaknesses: asStringArray(swot.weaknesses),
      opportunities: asStringArray(swot.opportunities),
      threats: asStringArray(swot.threats),
    },
    risks: asArray(raw.risks, (r) => ({
      risk: asString(r.risk),
      probability: (['high', 'medium', 'low'].includes(asString(r.probability))
        ? asString(r.probability)
        : 'medium') as RiskRow['probability'],
      impact: (['high', 'medium', 'low'].includes(asString(r.impact)) ? asString(r.impact) : 'medium') as RiskRow['impact'],
      mitigation: asString(r.mitigation),
    })),
    open_questions: asArray(raw.open_questions, (q) => ({
      question: asString(q.question),
      why: asString(q.why),
    })),
    next_step: {
      title: asString(nextStep.title, 'Следующий шаг'),
      body: asString(nextStep.body),
    },
  }
}

// ─── Главная функция ──────────────────────────────────────────────────────────

export async function generateInteractiveV2(args: {
  researchJobId: string
  companyName: string
  industry: string
  intakeQuote?: string | null
  full: FullV2
  brief: BriefV2
}): Promise<{ raw: string; parsed: InteractiveV2 }> {
  const userPrompt = buildInteractiveV2Prompt({
    companyName: args.companyName,
    industry: args.industry,
    intakeQuote: args.intakeQuote,
    full: args.full,
    brief: args.brief,
  })

  const raw = await callOpenRouterForJSON(
    SYSTEM_PROMPT,
    userPrompt,
    INTERACTIVE_V2_MAX_TOKENS,
    AI_CONFIG.strategy.synthesisModel,
    { researchJobId: args.researchJobId, stage: 'interactive_v2' },
  )

  const parsed = normalizeInteractiveV2(tolerantJsonParse(extractJSON(raw)))
  return { raw, parsed }
}
