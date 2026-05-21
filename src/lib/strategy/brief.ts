// BRIEF_REPORT (Этап 2 двухэтапной методологии) — дистилляция полного отчёта
// в 6 структурированных блоков. Модель возвращает JSON (без response_format —
// только промпт-инструкция + устойчивый парсер, см. brief-parser.ts), что обходит
// несовместимость OpenRouter json_schema с throughput-роутингом.

import { callOpenRouter } from './generator'
import { AI_CONFIG } from '@/lib/ai/config'
import { detectNiche, loadReportRequirements } from './kb'
import { parseBriefReport } from './brief-parser'

export const BRIEF_REPORT_MAX_TOKENS = 4096

// ─── Типы 6 блоков ────────────────────────────────────────────────────────────

export interface MarketPositionRow {
  metric: string
  value: string
  norm: string
  status: 'red' | 'yellow' | 'green'
}

export interface MarketPositionTable {
  rows: MarketPositionRow[]
}

export interface Bottleneck {
  problem: string
  metric: string
  consequence: string
}

export interface GrowthPotentialRow {
  direction: string
  potential_pct: string
  deadline: string
  priority: 'high' | 'medium' | 'low'
}

export interface GrowthPotentialTable {
  rows: GrowthPotentialRow[]
}

export interface AILever {
  tool: string
  automates: string
  effect: string
  launch_deadline: string
}

export interface NextAction {
  action: string
  deadline: string
  owner: string
  kpi: string
}

export interface ABHypothesis {
  id: string
  hypothesis: string
  metric: string
  test_method: string
  deadline: string
}

export interface BriefReportBlock {
  market_position: MarketPositionTable
  critical_bottlenecks: Bottleneck[]
  growth_potential: GrowthPotentialTable
  ai_levers: AILever[]
  next_actions: NextAction[]
  ab_hypotheses: ABHypothesis[]
}

// ─── Промпт Этапа 2 ────────────────────────────────────────────────────────────

export function buildBriefReportPrompt(
  companyName: string,
  niche: string,
  fullReport: string,
  kbRequirements: string,
): string {
  return `# Задача: Краткий стратегический отчёт (Этап 2)

## Компания: ${companyName}
## Ниша: ${niche}

## Требования базы знаний (краткий формат)
${kbRequirements}

## Полный отчёт для дистилляции
${fullReport}

---

## Правила дистилляции
- Используй ТОЛЬКО факты с маркировкой [ФАКТ] из полного отчёта.
- Каждое утверждение содержит конкретную цифру.
- Нет вводных фраз: «таким образом», «следует отметить», «необходимо учитывать».
- Объём — строго 600–900 слов суммарно по всем блокам.
- Тест: можно ли прочитать за 3 минуты? Если нет — сократи.
- Суммы — только в рублях (₽). Весь текст — на русском.

## Обязательная структура вывода (JSON)
Верни результат ТОЛЬКО как валидный JSON без markdown-обёртки и комментариев:

{
  "market_position": {
    "rows": [
      { "metric": "название метрики", "value": "фактическое значение", "norm": "норма отрасли", "status": "red|yellow|green" }
    ]
  },
  "critical_bottlenecks": [
    { "problem": "конкретная проблема", "metric": "цифра, подтверждающая проблему", "consequence": "что произойдёт, если не исправить" }
  ],
  "growth_potential": {
    "rows": [
      { "direction": "направление роста", "potential_pct": "+XX%", "deadline": "срок", "priority": "high|medium|low" }
    ]
  },
  "ai_levers": [
    { "tool": "название инструмента", "automates": "что автоматизирует", "effect": "измеримый эффект", "launch_deadline": "срок запуска" }
  ],
  "next_actions": [
    { "action": "конкретное действие", "deadline": "дедлайн", "owner": "ответственный", "kpi": "измеримый результат" }
  ],
  "ab_hypotheses": [
    { "id": "H1", "hypothesis": "формулировка гипотезы", "metric": "метрика проверки", "test_method": "способ проверки", "deadline": "срок" }
  ]
}

## Требования к количеству элементов
- market_position: 5–7 строк
- critical_bottlenecks: ровно 3
- growth_potential: 4–6 строк
- ai_levers: ровно 3
- next_actions: ровно 3
- ab_hypotheses: 2–3 гипотезы (H1, H2, H3)

## Статусы светофора
- "red"    — значение хуже нормы более чем на 30%
- "yellow" — значение отличается от нормы на 10–30%
- "green"  — значение в норме или лучше`
}

const BRIEF_SYSTEM_PROMPT = `Ты — профессиональный бизнес-аналитик. Твоя задача — дистиллировать полный стратегический отчёт в краткую версию для клиента.
Возвращай ТОЛЬКО валидный JSON без комментариев и markdown-блоков. Все значения — на русском языке, суммы — в рублях.`

// ─── Генерация ───────────────────────────────────────────────────────────────

export async function generateBriefReport(
  companyName: string,
  companyIndustry: string,
  fullReportText: string,
): Promise<{ raw: string; parsed: BriefReportBlock }> {
  const nicheId = await detectNiche(`${companyIndustry} ${companyName} ${fullReportText}`)
  const reqs = await loadReportRequirements(nicheId)
  const nicheName = reqs.niche?.displayName ?? companyIndustry ?? 'не определена'

  const userPrompt = buildBriefReportPrompt(
    companyName,
    nicheName,
    fullReportText,
    reqs.combinedMarkdown,
  )

  const { content: raw } = await callOpenRouter(
    BRIEF_SYSTEM_PROMPT,
    userPrompt,
    BRIEF_REPORT_MAX_TOKENS,
    AI_CONFIG.strategy.synthesisModel,
  )

  const parsed = parseBriefReport(raw)
  return { raw, parsed }
}
