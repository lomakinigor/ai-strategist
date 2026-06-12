import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getDb } from '@/db'
import { reportArtifacts, companies, researchJobs } from '@/db/schema'
import type { BriefReportBlock } from '@/lib/strategy/brief'
import type { LighthouseScores } from '@/lib/strategy/brief-derive'
import { BriefClient } from './BriefClient'
import { PrintButton } from './PrintButton'
import { BriefFooter } from './BriefFooter'

// L3-pitch для paid view — кратко, чтобы не отвлекать от собственно отчёта.
// Полная версия с тремя сервисами идёт на /free-report, тут — короткий мостик.
function BriefExecutionPitch() {
  return (
    <section className="mt-16 mb-2 rounded-2xl border border-[#fbbf24]/30 bg-[#fbbf24]/5 p-7 sm:p-8">
      <p className="text-[11px] tracking-[0.16em] uppercase text-[#fbbf24] font-bold mb-3">
        Кроме разбора мы делаем
      </p>
      <h3 className="text-xl sm:text-2xl font-bold text-[#e8e8f0] mb-5 leading-snug">
        Если в команде некому исполнять — закрываем три ключевых блока сами
      </h3>
      <ul className="space-y-2.5 text-sm text-[#a8a8c0] leading-[1.6]">
        <li>
          <span className="text-[#fbbf24] font-bold mr-2">→</span>
          <span><strong className="text-[#e8e8f0]">Правильный сайт</strong> под стратегию отчёта (УТП на первом экране, формы захвата, посадочные под каналы)</span>
        </li>
        <li>
          <span className="text-[#fbbf24] font-bold mr-2">→</span>
          <span><strong className="text-[#e8e8f0]">AI-боты в рекламные каналы</strong> (сайт + ВКонтакте + MAX + Telegram) — квалификация лидов 24/7, снижение CPL</span>
        </li>
        <li>
          <span className="text-[#fbbf24] font-bold mr-2">→</span>
          <span><strong className="text-[#e8e8f0]">Автопостинг по соцсетям</strong> — AI-генерация контента + публикация по 4–5 каналам без найма SMM-щика</span>
        </li>
      </ul>
      <p className="text-xs text-[#8888a0] mt-5 leading-[1.6]">
        Сметы и сроки обсуждаем после отчёта — когда понятно, что именно вам нужно из плана.
        Свяжитесь с нами для разговора без обязательств.
      </p>
    </section>
  )
}

export const metadata = {
  title: 'Краткий отчёт — AI-Стратег',
}

export default async function BriefPage({ params }: { params: { artifactId: string } }) {
  const db = getDb()
  const rows = await db
    .select({
      status: reportArtifacts.status,
      briefJson: reportArtifacts.briefJson,
      createdAt: reportArtifacts.createdAt,
      companyName: companies.name,
      industry: companies.industry,
      researchJobId: reportArtifacts.researchJobId,
    })
    .from(reportArtifacts)
    .leftJoin(companies, eq(reportArtifacts.companyId, companies.id))
    .where(eq(reportArtifacts.id, params.artifactId))
    .limit(1)

  const artifact = rows[0]
  if (!artifact || artifact.status !== 'done') {
    notFound()
  }

  // Кеш: если brief уже сгенерирован — отдаём из БД; иначе клиент сгенерирует по кнопке.
  const initialBrief = (artifact.briefJson as BriefReportBlock | null) ?? null

  // Lighthouse сайта клиента из research_jobs.metrics_json (структурный RS4-факт).
  let lighthouse: LighthouseScores | null = null
  if (artifact.researchJobId) {
    const jobRows = await db
      .select({ metricsJson: researchJobs.metricsJson })
      .from(researchJobs)
      .where(eq(researchJobs.id, artifact.researchJobId))
      .limit(1)
    const m = jobRows[0]?.metricsJson as { pagespeed?: LighthouseScores[] } | null
    lighthouse = m?.pagespeed?.[0] ?? null
  }

  const dateStr = artifact.createdAt.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="neon-report relative min-h-screen bg-[#0d0d0f] text-[#e8e8f0]">
      <div className="nr-bg-grid no-print" aria-hidden />
      <div className="nr-scanline no-print" aria-hidden />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 sm:py-14">
        {/* ── Top toolbar (hidden in print) ─────────────────────────── */}
        <div className="no-print flex items-center justify-between mb-10">
          <a
            href={`/research/${artifact.researchJobId}/report`}
            className="inline-flex items-center gap-1.5 text-sm text-[#8888a0] hover:text-[#00d4aa] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            К полному отчёту
          </a>
          <PrintButton />
        </div>

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <header className="brief-header mb-14">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] tracking-[0.07em] text-[#00d4aa] bg-[#00d4aa]/12 border border-[#00d4aa]/30 mb-6">
            <span className="nr-dot" /> СТРАТЕГИЧЕСКИЙ АНАЛИЗ · AI-СТРАТЕГ
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight">
            <span className="nr-grad">{artifact.companyName ?? 'Компания'}</span>
          </h1>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
            {artifact.industry && (
              <div className="text-[11px] tracking-[0.06em] text-[#44445a]">
                <span className="block text-xs text-[#8888a0]">{artifact.industry}</span>
                Ниша
              </div>
            )}
            <div className="text-[11px] tracking-[0.06em] text-[#44445a]">
              <span className="block text-xs text-[#8888a0]">{dateStr}</span>
              Дата исследования
            </div>
            <div className="text-[11px] tracking-[0.06em] text-[#44445a]">
              <span className="block text-xs text-[#8888a0]">Дистилляция полного отчёта</span>
              Формат
            </div>
          </div>
        </header>

        {/* ── Блоки BRIEF_REPORT (кеш / генерация по кнопке) ────────── */}
        <BriefClient
          artifactId={params.artifactId}
          initialBrief={initialBrief}
          lighthouse={lighthouse}
        />

        {/* ── L3-pitch: исполнение (сайт + боты + автопостинг) ───── */}
        <BriefExecutionPitch />

        <BriefFooter />
      </div>
    </main>
  )
}
