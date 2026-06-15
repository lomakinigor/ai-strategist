// Upgrade endpoint: free-tier клиент посмотрел краткий отчёт, нажал «Открыть
// полный отчёт за 9 999 ₽» → попадает сюда. Мы создаём НОВЫЙ research-job
// tier=paid + paid=false с теми же данными о компании, и редиректим на /pay/[newJobId].
//
// Клиенту не нужно заполнять анкету заново. После оплаты pipeline пройдёт
// заново на полный режим (FULL_REPORT с Global benchmark + все 4–6 конкурентов).

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { reportArtifacts, researchJobs, companies, intakeSubmissions } from '@/db/schema'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const artifactId = url.searchParams.get('artifactId')?.trim()
  if (!artifactId) {
    return new NextResponse('artifactId is required', { status: 400 })
  }

  const db = getDb()

  const rows = await db
    .select({
      companyId: reportArtifacts.companyId,
      researchJobId: reportArtifacts.researchJobId,
    })
    .from(reportArtifacts)
    .where(eq(reportArtifacts.id, artifactId))
    .limit(1)

  const artifact = rows[0]
  if (!artifact) {
    return new NextResponse('artifact not found', { status: 404 })
  }

  // Идемпотентность: если для этой компании уже есть paid-job в ожидании оплаты —
  // переиспользуем его, не плодим дубли. Сценарий: клиент вернулся по URL отчёта
  // через час, снова нажал «Открыть полный отчёт» — должна открыться та же
  // страница оплаты, что и в первый раз.
  const existingPaidJobs = await db
    .select({ id: researchJobs.id, paid: researchJobs.paid })
    .from(researchJobs)
    .where(eq(researchJobs.companyId, artifact.companyId))
    .limit(10)

  const pendingPaidJob = existingPaidJobs.find(
    (j) => j.id !== artifact.researchJobId && !j.paid,
  )
  if (pendingPaidJob) {
    return NextResponse.redirect(new URL(`/pay/${pendingPaidJob.id}`, req.url))
  }

  // Получаем оригинальную intake-запись, чтобы скопировать в новый job
  // (через intakeSubmissions хранится input_payload, у researchJobs прямой ссылки нет —
  // данные о компании уже распарсены в companies). Достаточно сослаться на companyId.
  const [originalIntake] = await db
    .select({ inputPayload: intakeSubmissions.inputPayload })
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.companyId, artifact.companyId))
    .limit(1)

  // Создаём новый paid-job на ту же компанию
  const [newJob] = await db
    .insert(researchJobs)
    .values({
      companyId: artifact.companyId,
      status: 'pending',
      tier: 'paid',
      paid: false,
    })
    .returning()

  // Дублируем intake-snapshot с пометкой upgrade — для трейса в аналитике
  await db.insert(intakeSubmissions).values({
    companyId: artifact.companyId,
    inputPayload: {
      ...(originalIntake?.inputPayload as Record<string, unknown> | null ?? {}),
      _upgrade_from_artifact: artifactId,
      _upgrade_at: new Date().toISOString(),
      tier: 'paid',
    },
    fallbackQuestionsNeeded: false,
  })

  return NextResponse.redirect(new URL(`/pay/${newJob.id}`, req.url))
}
