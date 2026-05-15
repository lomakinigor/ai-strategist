import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getDb } from '@/db'
import { reportArtifacts, companies } from '@/db/schema'
import { generateBriefReport } from '@/lib/strategy/brief'
import { BriefFooter } from './BriefFooter'

export const maxDuration = 60

export const metadata = {
  title: 'Краткий отчёт — AI-Стратег',
}

function renderBriefContent(text: string) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (trimmed === '') return <div key={i} className="h-2" />

        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return (
            <h3 key={i} className="text-sm font-bold text-gray-900 mt-6 mb-1 first:mt-0 uppercase tracking-wide">
              {trimmed.slice(2, -2)}
            </h3>
          )
        }

        if (trimmed.startsWith('ВЫВОД:')) {
          return (
            <p key={i} className="text-sm font-semibold text-indigo-900 bg-indigo-50 px-3 py-2 rounded leading-relaxed">
              {trimmed}
            </p>
          )
        }

        if (trimmed.startsWith('ДЕЙСТВИЕ:')) {
          return (
            <p key={i} className="text-sm font-medium text-emerald-800 bg-emerald-50 px-3 py-2 rounded leading-relaxed mt-1">
              {trimmed}
            </p>
          )
        }

        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          return (
            <p key={i} className="text-sm text-gray-700 pl-3 leading-relaxed">
              {'• '}{trimmed.replace(/^[•\-]\s*/, '')}
            </p>
          )
        }

        return (
          <p key={i} className="text-sm text-gray-800 leading-relaxed">
            {line}
          </p>
        )
      })}
    </div>
  )
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
    })
    .from(reportArtifacts)
    .leftJoin(companies, eq(reportArtifacts.companyId, companies.id))
    .where(eq(reportArtifacts.id, params.artifactId))
    .limit(1)

  const artifact = rows[0]
  if (!artifact || !artifact.contentMarkdown || artifact.status !== 'done') {
    notFound()
  }

  const brief = await generateBriefReport(artifact.contentMarkdown)

  const dateStr = artifact.createdAt.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-8 pb-6 border-b border-gray-100">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">
            Краткий отчёт · AI-Стратег
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            {artifact.companyName ?? 'Компания'}
          </h1>
          {artifact.industry && (
            <p className="mt-1 text-sm text-gray-500">{artifact.industry}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Исследование от {dateStr} · методология Minto · McKinsey · Knaflic
          </p>
        </div>

        <div className="prose-sm">
          {renderBriefContent(brief)}
        </div>

        <BriefFooter />

      </div>
    </main>
  )
}
