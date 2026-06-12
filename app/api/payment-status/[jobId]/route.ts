import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { researchJobs } from '@/db/schema'

export const dynamic = 'force-dynamic'

// Простой polling-endpoint для страницы /pay/[jobId]. Возвращает paid: boolean.
// Без авторизации — статус не приватный (любой со ссылкой может проверить).
export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  const db = getDb()
  const rows = await db
    .select({ paid: researchJobs.paid })
    .from(researchJobs)
    .where(eq(researchJobs.id, params.jobId))
    .limit(1)
  const row = rows[0]
  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({ paid: row.paid })
}
