'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/db'
import { reportArtifacts } from '@/db/schema'

export async function deleteReportArtifactAction(artifactId: string): Promise<void> {
  if (!artifactId) throw new Error('artifactId обязателен')
  const db = getDb()
  await db.delete(reportArtifacts).where(eq(reportArtifacts.id, artifactId))
  revalidatePath('/archive')
}
