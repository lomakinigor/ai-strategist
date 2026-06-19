// SQL-агрегаты для /admin/costs. Все запросы возвращают суммы по выбранным
// измерениям (день / неделя / месяц / по этапу / по job'у).

import { sql } from 'drizzle-orm'
import { getDb } from '@/db'

export interface PeriodTotals {
  totalUsd: number
  totalRub: number
  callsCount: number
  totalPromptTokens: number
  totalCompletionTokens: number
}

export interface StageBreakdown {
  stage: string
  callsCount: number
  totalUsd: number
  totalRub: number
  totalPromptTokens: number
  totalCompletionTokens: number
}

export interface JobBreakdown {
  researchJobId: string
  companyName: string | null
  industry: string | null
  tier: string | null
  callsCount: number
  totalUsd: number
  totalRub: number
  firstCallAt: Date
  lastCallAt: Date
}

/** Агрегаты за период (today / 7d / 30d / all-time). */
export async function getTotalsForPeriod(sinceDays: number | null): Promise<PeriodTotals> {
  const db = getDb()
  const sinceClause =
    sinceDays !== null ? sql`WHERE created_at >= now() - interval '${sql.raw(String(sinceDays))} days'` : sql``

  const rows = await db.execute<{
    total_usd: string | null
    total_rub: string | null
    calls_count: string
    total_prompt_tokens: string | null
    total_completion_tokens: string | null
  }>(sql`
    SELECT
      COALESCE(SUM(cost_usd), 0) AS total_usd,
      COALESCE(SUM(cost_rub), 0) AS total_rub,
      COUNT(*) AS calls_count,
      COALESCE(SUM(prompt_tokens), 0) AS total_prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) AS total_completion_tokens
    FROM llm_calls
    ${sinceClause}
  `)

  const r = rows[0]
  return {
    totalUsd: parseFloat(r?.total_usd ?? '0'),
    totalRub: parseFloat(r?.total_rub ?? '0'),
    callsCount: parseInt(r?.calls_count ?? '0', 10),
    totalPromptTokens: parseInt(r?.total_prompt_tokens ?? '0', 10),
    totalCompletionTokens: parseInt(r?.total_completion_tokens ?? '0', 10),
  }
}

/** Разбивка по этапам за период. */
export async function getStageBreakdown(sinceDays: number | null): Promise<StageBreakdown[]> {
  const db = getDb()
  const sinceClause =
    sinceDays !== null ? sql`WHERE created_at >= now() - interval '${sql.raw(String(sinceDays))} days'` : sql``

  const rows = await db.execute<{
    stage: string
    calls_count: string
    total_usd: string | null
    total_rub: string | null
    total_prompt_tokens: string | null
    total_completion_tokens: string | null
  }>(sql`
    SELECT
      stage,
      COUNT(*) AS calls_count,
      COALESCE(SUM(cost_usd), 0) AS total_usd,
      COALESCE(SUM(cost_rub), 0) AS total_rub,
      COALESCE(SUM(prompt_tokens), 0) AS total_prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) AS total_completion_tokens
    FROM llm_calls
    ${sinceClause}
    GROUP BY stage
    ORDER BY total_usd DESC
  `)

  return rows.map((r) => ({
    stage: r.stage,
    callsCount: parseInt(r.calls_count, 10),
    totalUsd: parseFloat(r.total_usd ?? '0'),
    totalRub: parseFloat(r.total_rub ?? '0'),
    totalPromptTokens: parseInt(r.total_prompt_tokens ?? '0', 10),
    totalCompletionTokens: parseInt(r.total_completion_tokens ?? '0', 10),
  }))
}

/** Разбивка по research_job — последние N. */
export async function getJobsBreakdown(limit = 30): Promise<JobBreakdown[]> {
  const db = getDb()
  const rows = await db.execute<{
    research_job_id: string
    company_name: string | null
    industry: string | null
    tier: string | null
    calls_count: string
    total_usd: string | null
    total_rub: string | null
    first_call_at: string
    last_call_at: string
  }>(sql`
    SELECT
      lc.research_job_id,
      c.name AS company_name,
      c.industry AS industry,
      rj.tier AS tier,
      COUNT(*) AS calls_count,
      COALESCE(SUM(lc.cost_usd), 0) AS total_usd,
      COALESCE(SUM(lc.cost_rub), 0) AS total_rub,
      MIN(lc.created_at) AS first_call_at,
      MAX(lc.created_at) AS last_call_at
    FROM llm_calls lc
    LEFT JOIN research_jobs rj ON rj.id = lc.research_job_id
    LEFT JOIN companies c ON c.id = rj.company_id
    WHERE lc.research_job_id IS NOT NULL
    GROUP BY lc.research_job_id, c.name, c.industry, rj.tier
    ORDER BY MAX(lc.created_at) DESC
    LIMIT ${sql.raw(String(limit))}
  `)

  return rows.map((r) => ({
    researchJobId: r.research_job_id,
    companyName: r.company_name,
    industry: r.industry,
    tier: r.tier,
    callsCount: parseInt(r.calls_count, 10),
    totalUsd: parseFloat(r.total_usd ?? '0'),
    totalRub: parseFloat(r.total_rub ?? '0'),
    firstCallAt: new Date(r.first_call_at),
    lastCallAt: new Date(r.last_call_at),
  }))
}

export interface ProviderUsage {
  provider: string
  totalUsd: number
  totalRub: number
  callsCount: number
  todayUsd: number
  weekUsd: number
  monthUsd: number
}

/** Разбивка расходов по провайдеру за разные периоды (для виджетов вверху страницы). */
export async function getProviderUsage(): Promise<ProviderUsage[]> {
  const db = getDb()
  const rows = await db.execute<{
    provider: string
    total_usd: string | null
    total_rub: string | null
    calls_count: string
    today_usd: string | null
    week_usd: string | null
    month_usd: string | null
  }>(sql`
    SELECT
      provider,
      COALESCE(SUM(cost_usd), 0) AS total_usd,
      COALESCE(SUM(cost_rub), 0) AS total_rub,
      COUNT(*) AS calls_count,
      COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= now() - interval '1 day'), 0) AS today_usd,
      COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= now() - interval '7 days'), 0) AS week_usd,
      COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= now() - interval '30 days'), 0) AS month_usd
    FROM llm_calls
    GROUP BY provider
    ORDER BY total_usd DESC
  `)

  return rows.map((r) => ({
    provider: r.provider,
    totalUsd: parseFloat(r.total_usd ?? '0'),
    totalRub: parseFloat(r.total_rub ?? '0'),
    callsCount: parseInt(r.calls_count, 10),
    todayUsd: parseFloat(r.today_usd ?? '0'),
    weekUsd: parseFloat(r.week_usd ?? '0'),
    monthUsd: parseFloat(r.month_usd ?? '0'),
  }))
}

/** Получить баланс OpenRouter через /api/v1/credits. */
export async function getOpenRouterBalance(): Promise<{
  totalCredits: number
  totalUsage: number
  remaining: number
} | null> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return null

  try {
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { data?: { total_credits?: number; total_usage?: number } }
    const totalCredits = data.data?.total_credits ?? 0
    const totalUsage = data.data?.total_usage ?? 0
    return {
      totalCredits,
      totalUsage,
      remaining: totalCredits - totalUsage,
    }
  } catch (err) {
    console.warn('[cost/queries] OpenRouter balance fetch failed:', err instanceof Error ? err.message : err)
    return null
  }
}
