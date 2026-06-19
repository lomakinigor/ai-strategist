// SQL-агрегаты для /admin/usage. Все запросы дедуплицируют события через MIN/MAX
// чтобы одна компания, открывшая отчёт N раз, считалась один раз в воронке.

import { sql } from 'drizzle-orm'
import { getDb } from '@/db'

export interface CompanyUsageRow {
  researchJobId: string
  companyName: string | null
  industry: string | null
  tier: string | null
  intakeAt: Date
  briefFirstViewedAt: Date | null
  fullFirstViewedAt: Date | null
  pdfDownloadedAt: Date | null
  /** Δ от первого просмотра брифа до первого просмотра полного, в секундах */
  briefToFullSec: number | null
}

export interface ReturnTimeBucket {
  label: string
  /** в секундах: верхняя граница включительно */
  upperBoundSec: number | null
  count: number
}

export interface FunnelStats {
  intakeCount: number
  briefViewedCount: number
  fullViewedCount: number
  pdfDownloadedCount: number
  /** % от intake которые дошли до брифа */
  intakeToBriefPct: number
  /** % от брифа которые дошли до полного */
  briefToFullPct: number
  /** % от полного которые скачали PDF */
  fullToPdfPct: number
}

export interface IndustryStat {
  industry: string
  intakeCount: number
}

/** Воронка использования. */
export async function getFunnelStats(): Promise<FunnelStats> {
  const db = getDb()
  const rows = await db.execute<{
    intake_count: string
    brief_viewed_count: string
    full_viewed_count: string
    pdf_downloaded_count: string
  }>(sql`
    SELECT
      (SELECT COUNT(*) FROM research_jobs) AS intake_count,
      (SELECT COUNT(DISTINCT research_job_id) FROM usage_events WHERE event_type='brief_viewed' AND research_job_id IS NOT NULL) AS brief_viewed_count,
      (SELECT COUNT(DISTINCT research_job_id) FROM usage_events WHERE event_type='full_viewed' AND research_job_id IS NOT NULL) AS full_viewed_count,
      (SELECT COUNT(DISTINCT research_job_id) FROM usage_events WHERE event_type='pdf_downloaded' AND research_job_id IS NOT NULL) AS pdf_downloaded_count
  `)
  const r = rows[0]
  const intake = parseInt(r?.intake_count ?? '0', 10)
  const brief = parseInt(r?.brief_viewed_count ?? '0', 10)
  const full = parseInt(r?.full_viewed_count ?? '0', 10)
  const pdf = parseInt(r?.pdf_downloaded_count ?? '0', 10)
  return {
    intakeCount: intake,
    briefViewedCount: brief,
    fullViewedCount: full,
    pdfDownloadedCount: pdf,
    intakeToBriefPct: intake > 0 ? (brief / intake) * 100 : 0,
    briefToFullPct: brief > 0 ? (full / brief) * 100 : 0,
    fullToPdfPct: full > 0 ? (pdf / full) * 100 : 0,
  }
}

/** Гистограмма «время возврата за полным после первого просмотра брифа». */
export async function getReturnTimeBuckets(): Promise<ReturnTimeBucket[]> {
  const db = getDb()
  // Для каждой research_job — берём MIN(brief_viewed) и MIN(full_viewed),
  // считаем разницу в секундах. Группируем по корзинам.
  const rows = await db.execute<{
    diff_sec: string | null
  }>(sql`
    WITH per_job AS (
      SELECT
        research_job_id,
        MIN(CASE WHEN event_type='brief_viewed' THEN created_at END) AS brief_at,
        MIN(CASE WHEN event_type='full_viewed' THEN created_at END) AS full_at
      FROM usage_events
      WHERE research_job_id IS NOT NULL
      GROUP BY research_job_id
    )
    SELECT EXTRACT(EPOCH FROM (full_at - brief_at)) AS diff_sec
    FROM per_job
    WHERE brief_at IS NOT NULL
  `)

  const buckets: ReturnTimeBucket[] = [
    { label: '0–5 мин', upperBoundSec: 5 * 60, count: 0 },
    { label: '5–30 мин', upperBoundSec: 30 * 60, count: 0 },
    { label: '30 мин – 6 ч', upperBoundSec: 6 * 60 * 60, count: 0 },
    { label: '6–24 ч', upperBoundSec: 24 * 60 * 60, count: 0 },
    { label: '1–7 дн', upperBoundSec: 7 * 24 * 60 * 60, count: 0 },
    { label: '> 7 дн', upperBoundSec: Number.POSITIVE_INFINITY, count: 0 },
    { label: 'Не вернулись (нет full)', upperBoundSec: null, count: 0 },
  ]

  for (const r of rows) {
    if (r.diff_sec === null) {
      // brief viewed, full NOT viewed — «не вернулись»
      buckets[buckets.length - 1].count++
      continue
    }
    const diff = parseFloat(r.diff_sec)
    if (diff < 0) continue // full viewed раньше брифа? пропустим
    for (let i = 0; i < buckets.length - 1; i++) {
      const upper = buckets[i].upperBoundSec
      if (upper !== null && diff <= upper) {
        buckets[i].count++
        break
      }
    }
  }
  return buckets
}

/** Таблица: компания / времена событий / Δ. */
export async function getCompanyUsageRows(limit = 50): Promise<CompanyUsageRow[]> {
  const db = getDb()
  const rows = await db.execute<{
    research_job_id: string
    company_name: string | null
    industry: string | null
    tier: string | null
    intake_at: string
    brief_first_viewed_at: string | null
    full_first_viewed_at: string | null
    pdf_downloaded_at: string | null
    brief_to_full_sec: string | null
  }>(sql`
    SELECT
      rj.id AS research_job_id,
      c.name AS company_name,
      c.industry AS industry,
      rj.tier AS tier,
      rj.created_at AS intake_at,
      brief_view.first_at AS brief_first_viewed_at,
      full_view.first_at AS full_first_viewed_at,
      pdf.first_at AS pdf_downloaded_at,
      EXTRACT(EPOCH FROM (full_view.first_at - brief_view.first_at)) AS brief_to_full_sec
    FROM research_jobs rj
    LEFT JOIN companies c ON c.id = rj.company_id
    LEFT JOIN LATERAL (
      SELECT MIN(created_at) AS first_at FROM usage_events
      WHERE research_job_id = rj.id AND event_type='brief_viewed'
    ) brief_view ON true
    LEFT JOIN LATERAL (
      SELECT MIN(created_at) AS first_at FROM usage_events
      WHERE research_job_id = rj.id AND event_type='full_viewed'
    ) full_view ON true
    LEFT JOIN LATERAL (
      SELECT MIN(created_at) AS first_at FROM usage_events
      WHERE research_job_id = rj.id AND event_type='pdf_downloaded'
    ) pdf ON true
    ORDER BY rj.created_at DESC
    LIMIT ${sql.raw(String(limit))}
  `)

  return rows.map((r) => ({
    researchJobId: r.research_job_id,
    companyName: r.company_name,
    industry: r.industry,
    tier: r.tier,
    intakeAt: new Date(r.intake_at),
    briefFirstViewedAt: r.brief_first_viewed_at ? new Date(r.brief_first_viewed_at) : null,
    fullFirstViewedAt: r.full_first_viewed_at ? new Date(r.full_first_viewed_at) : null,
    pdfDownloadedAt: r.pdf_downloaded_at ? new Date(r.pdf_downloaded_at) : null,
    briefToFullSec: r.brief_to_full_sec !== null ? parseFloat(r.brief_to_full_sec) : null,
  }))
}

/** Топ ниш по числу intake. */
export async function getTopIndustries(limit = 10): Promise<IndustryStat[]> {
  const db = getDb()
  const rows = await db.execute<{
    industry: string
    intake_count: string
  }>(sql`
    SELECT
      c.industry,
      COUNT(DISTINCT rj.id) AS intake_count
    FROM research_jobs rj
    JOIN companies c ON c.id = rj.company_id
    WHERE c.industry IS NOT NULL AND c.industry <> ''
    GROUP BY c.industry
    ORDER BY COUNT(DISTINCT rj.id) DESC
    LIMIT ${sql.raw(String(limit))}
  `)
  return rows.map((r) => ({
    industry: r.industry,
    intakeCount: parseInt(r.intake_count, 10),
  }))
}
