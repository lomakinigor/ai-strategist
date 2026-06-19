import { desc, eq, notInArray } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import { reportArtifacts, companies } from '@/db/schema'
import { ArchiveList } from './ArchiveList'
import { AdminNav } from '../admin/AdminNav'

export const metadata = {
  title: 'Архив отчётов — AI-Стратег',
  robots: { index: false, follow: false },
}

function checkAuth(): boolean {
  const expected = process.env.ADMIN_ARCHIVE_PASSWORD
  if (!expected) return false
  const cookieVal = cookies().get('archive_auth')?.value
  if (!cookieVal || cookieVal.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < cookieVal.length; i++) {
    diff |= cookieVal.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

export default async function ArchivePage() {
  if (!checkAuth()) {
    redirect('/archive/login')
  }

  const db = getDb()

  // All artifacts (except pending/generating) ordered newest-first for display,
  // but seq numbers are assigned oldest-first (ascending global counter).
  const rows = await db
    .select({
      id: reportArtifacts.id,
      status: reportArtifacts.status,
      createdAt: reportArtifacts.createdAt,
      researchJobId: reportArtifacts.researchJobId,
      companyName: companies.name,
      industry: companies.industry,
    })
    .from(reportArtifacts)
    .leftJoin(companies, eq(reportArtifacts.companyId, companies.id))
    .where(notInArray(reportArtifacts.status, ['pending', 'generating']))
    .orderBy(desc(reportArtifacts.createdAt))

  const filtered = rows

  // Assign global seq numbers in ascending order (oldest = #1)
  const ascending = [...filtered].reverse()
  const reports = filtered.map((r) => {
    const seqIdx = ascending.findIndex((a) => a.id === r.id)
    const seq = seqIdx + 1
    const dateStr = r.createdAt.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const label = `${(r.companyName ?? 'Компания').slice(0, 30)} — ${dateStr}`
    return {
      id: r.id,
      seq,
      companyName: r.companyName ?? 'Компания',
      industry: r.industry ?? '',
      status: r.status,
      createdAt: r.createdAt,
      researchJobId: r.researchJobId,
      label,
    }
  })

  const total = reports.length
  const doneCount = reports.filter((r) => r.status === 'done').length

  return (
    <main className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Архив отчётов</h1>
            <p className="mt-1 text-sm text-gray-500">
              Все итерации исследований — каждая запись соответствует одному запуску анализа
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-400">
              {total === 1 ? 'запись' : total >= 2 && total <= 4 ? 'записи' : 'записей'}
              {total > 0 && ` · ${doneCount} готов${doneCount === 1 ? '' : doneCount >= 2 && doneCount <= 4 ? 'ы' : 'о'}`}
            </p>
          </div>
        </div>

        {/* Cleanup hint */}
        {total >= 10 && (
          <div className="mb-6 border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 text-xs text-amber-800">
            В архиве {total} записей — рекомендуем удалить старые итерации, которые уже не нужны.
          </div>
        )}

        {/* List */}
        <ArchiveList reports={reports} />

        {/* Nav */}
        <div className="mt-8 flex gap-4">
          <a href="/intake" className="text-sm text-blue-600 hover:underline">
            + Новое исследование
          </a>
          <a href="/" className="text-sm text-gray-400 hover:underline ml-auto">
            ← Главная
          </a>
        </div>
      </div>
    </main>
  )
}
