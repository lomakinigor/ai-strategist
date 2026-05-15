'use server'

import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts } from '@/db/schema'
import { generateBriefReport } from '@/lib/strategy/brief'

export async function generateBriefReportAction(artifactId: string): Promise<string> {
  const db = getDb()

  const rows = await db
    .select()
    .from(reportArtifacts)
    .where(eq(reportArtifacts.id, artifactId))
    .limit(1)

  const artifact = rows[0]
  if (!artifact || !artifact.contentMarkdown) {
    throw new Error('Отчёт не найден или ещё не завершён')
  }

  return generateBriefReport(artifact.contentMarkdown)
}
