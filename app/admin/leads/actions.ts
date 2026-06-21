'use server'

// Server actions для /admin/leads.
// updateLeadStatus и updateLeadNotes — обе требуют admin auth (проверено
// родительским app/admin/layout.tsx).

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/db'
import { leads } from '@/db/schema'

const ALLOWED_STATUSES = ['new', 'in_progress', 'closed'] as const
type LeadStatus = (typeof ALLOWED_STATUSES)[number]

export async function updateLeadStatus(leadId: string, status: string): Promise<{ ok: true } | { error: string }> {
  if (!ALLOWED_STATUSES.includes(status as LeadStatus)) {
    return { error: 'invalid_status' }
  }
  try {
    const db = getDb()
    await db
      .update(leads)
      .set({ status: status as LeadStatus, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
    revalidatePath('/admin/leads')
    return { ok: true }
  } catch (err) {
    console.error('[admin/leads] updateLeadStatus failed:', err)
    return { error: 'db_error' }
  }
}

export async function updateLeadNotes(leadId: string, notes: string): Promise<{ ok: true } | { error: string }> {
  try {
    const db = getDb()
    await db
      .update(leads)
      .set({ adminNotes: notes.trim() || null, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
    revalidatePath('/admin/leads')
    return { ok: true }
  } catch (err) {
    console.error('[admin/leads] updateLeadNotes failed:', err)
    return { error: 'db_error' }
  }
}
