import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getDb } from '@/db'
import { reportArtifacts, companies } from '@/db/schema'
import { generateBriefReport } from '@/lib/strategy/brief'
import { parseBriefMarkdown } from './parser'
import { extractAiProposals } from './ai-extract'
import { SectionCard } from './SectionCard'
import { AiBlock } from './AiBlock'
import { PrintButton } from './PrintButton'
import { BriefFooter } from './BriefFooter'

export const maxDuration = 60

export const metadata = {
  title: 'Краткий отчёт — AI-Стратег',
}

export default async function BriefPage({ params }: { params: { artifactId: string } }) {
  const db = getDb()
  const rows = await db
    .select({
      contentMarkdown: reportArtifacts.contentMarkdown,
      status: reportArtifacts.status,
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
  if (!artifact || !artifact.contentMarkdown || artifact.status !== 'done') {
    notFound()
  }

  const briefMarkdown = await generateBriefReport(artifact.contentMarkdown)
  const sections = parseBriefMarkdown(briefMarkdown)
  const aiProposals = extractAiProposals(artifact.contentMarkdown, 3)

  // Split sections per visualization methodology:
  //   V7 — Executive Snapshot is rendered first as "10-second read"
  //   V5 — main sections share identical small-multiples layout
  //   strategy is rendered last (after AI block) for narrative closure
  const snapshotSection = sections.find((s) => s.id === 'snapshot')
  const mainSections = sections.filter((s) => s.id !== 'snapshot' && s.id !== 'strategy' && s.id !== 'other')
  const strategySection = sections.find((s) => s.id === 'strategy')
  const otherSections = sections.filter((s) => s.id === 'other')

  const dateStr = artifact.createdAt.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">

        {/* ── Top toolbar (hidden in print) ─────────────────────────── */}
        <div className="no-print flex items-center justify-between mb-10 -mt-4">
          <a
            href={`/research/${artifact.researchJobId}/report`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            К полному отчёту
          </a>
          <PrintButton />
        </div>

        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="brief-header mb-12">
          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.25em] mb-3">
            Краткий отчёт · AI-Стратег
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
            {artifact.companyName ?? 'Компания'}
          </h1>
          {artifact.industry && (
            <p className="mt-2 text-base text-gray-600">{artifact.industry}</p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Исследование от {dateStr} · методология Minto · Knaflic · Duarte
          </p>
        </header>

        {/* ── Executive Snapshot — V7, first screen, "10-second read" ── */}
        {snapshotSection && (
          <div className="mb-8">
            <SectionCard section={snapshotSection} index={0} />
          </div>
        )}

        {/* ── Main sections (V5 small multiples) ───────────────────── */}
        {mainSections.length > 0 && (
          <div className="space-y-5 mb-8">
            {mainSections.map((section, i) => (
              <SectionCard key={section.id + i} section={section} index={i + 1} />
            ))}
          </div>
        )}

        {/* ── AI automation block ───────────────────────────────────── */}
        {aiProposals.length > 0 && (
          <div className="mb-8">
            <AiBlock proposals={aiProposals} />
          </div>
        )}

        {/* ── Strategy section (last, visual emphasis) ──────────────── */}
        {strategySection && (
          <div className="mb-8">
            <SectionCard section={strategySection} index={mainSections.length + 1} />
          </div>
        )}

        {/* ── Other unclassified sections ───────────────────────────── */}
        {otherSections.length > 0 && (
          <div className="space-y-5 mb-8">
            {otherSections.map((section, i) => (
              <SectionCard key={'other-' + i} section={section} index={mainSections.length + (strategySection ? 1 : 0) + i + 1} />
            ))}
          </div>
        )}

        <BriefFooter />
      </div>
    </main>
  )
}
