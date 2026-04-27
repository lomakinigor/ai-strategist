'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/db'
import { facts } from '@/db/schema'
import { setFactActive } from '@/lib/reporting/validation'

export async function updateFactActiveAction(formData: FormData) {
  const factId = (formData.get('factId') as string | null)?.trim()
  const jobId = (formData.get('jobId') as string | null)?.trim()
  const isActiveStr = formData.get('isActive') as string | null

  if (!factId || !jobId || isActiveStr === null) return

  const isActive = isActiveStr === '1'

  // Verify this fact belongs to the given research job (security guard)
  const db = getDb()
  const rows = await db
    .select({ id: facts.id })
    .from(facts)
    .where(and(eq(facts.id, factId), eq(facts.researchJobId, jobId)))
    .limit(1)

  if (!rows[0]) return

  await setFactActive(factId, isActive)
  revalidatePath(`/research/${jobId}/validation`)
}
