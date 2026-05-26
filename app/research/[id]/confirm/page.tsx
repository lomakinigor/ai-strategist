import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getDb } from '@/db'
import { researchJobs, companies } from '@/db/schema'
import { ConfirmForm } from './ConfirmForm'

// Генерация (single-pass) запускается из server action этого сегмента — нужен полный бюджет.
export const maxDuration = 300

export const metadata = { title: 'Подтверждение данных — AI-Стратег' }

export default async function ConfirmPage({ params }: { params: { id: string } }) {
  const db = getDb()
  const [job] = await db
    .select({ id: researchJobs.id, status: researchJobs.status, companyId: researchJobs.companyId })
    .from(researchJobs)
    .where(eq(researchJobs.id, params.id))
    .limit(1)

  if (!job || job.status !== 'done') notFound()

  const [company] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, job.companyId))
    .limit(1)

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-6">
        <div className="mb-6">
          <a
            href={`/research/${params.id}`}
            className="inline-flex items-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Назад
          </a>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Подтвердите данные перед анализом</h1>
          <p className="text-sm text-gray-500 mt-1">
            {company?.name ?? 'Компания'} — проверьте, что приложение поняло верно. Это убирает домыслы
            из отчёта. Поля помечены источником; «предположение AI» обязательно проверьте.
          </p>
        </div>
        <ConfirmForm jobId={params.id} />
      </div>
    </main>
  )
}
