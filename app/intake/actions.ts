'use server'

import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import { companies, intakeSubmissions, researchJobs } from '@/db/schema'

export async function createResearchJob(formData: FormData) {
  const name = ((formData.get('company_name') as string | null) ?? '').trim()
  const industry = ((formData.get('industry') as string | null) ?? '').trim()
  const description = ((formData.get('description') as string | null) ?? '').trim() || null
  const website = ((formData.get('website') as string | null) ?? '').trim() || null
  const goals = ((formData.get('research_goal') as string | null) ?? '').trim() || null
  const contextNotes = ((formData.get('context_notes') as string | null) ?? '').trim() || null
  const competitors = ((formData.get('competitors') as string | null) ?? '').trim() || null

  // Collect channel links (direct URLs)
  const channels = (formData.getAll('channel_link') as string[]).filter(Boolean)

  // Chain / network info
  const isChain = formData.get('is_chain') === '1'
  const chainScope = isChain ? ((formData.get('chain_scope') as string | null) ?? 'network') : null
  const city = (chainScope === 'location' ? ((formData.get('city') as string | null) ?? '').trim() : '') || null

  if (!name || !industry) {
    throw new Error('Название компании и отрасль обязательны')
  }

  const db = getDb()

  const [company] = await db
    .insert(companies)
    .values({
      name,
      industry,
      description,
      website,
      goals,
      channels: channels.length ? channels : null,
      region: 'RU',
      status: 'active',
    })
    .returning()

  await db.insert(intakeSubmissions).values({
    companyId: company.id,
    inputPayload: {
      company_name: name,
      industry,
      description,
      website,
      research_goal: goals,
      channels,
      competitors,
      context_notes: contextNotes,
      is_chain: isChain,
      chain_scope: chainScope,
      city,
    },
    fallbackQuestionsNeeded: false,
  })

  const [job] = await db
    .insert(researchJobs)
    .values({ companyId: company.id, status: 'pending' })
    .returning()

  redirect(`/research/${job.id}`)
}
