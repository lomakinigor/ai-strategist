'use server'

import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import { companies, intakeSubmissions, researchJobs } from '@/db/schema'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function createResearchJob(formData: FormData) {
  const name = ((formData.get('company_name') as string | null) ?? '').trim()
  const industry = ((formData.get('industry') as string | null) ?? '').trim()
  const description = ((formData.get('description') as string | null) ?? '').trim() || null
  const website = ((formData.get('website') as string | null) ?? '').trim() || null
  const goals = ((formData.get('research_goal') as string | null) ?? '').trim() || null
  const contextNotes = ((formData.get('context_notes') as string | null) ?? '').trim() || null
  const competitors = ((formData.get('competitors') as string | null) ?? '').trim() || null
  const email = ((formData.get('email') as string | null) ?? '').trim().toLowerCase() || null

  // Collect channel links (direct URLs)
  const channels = (formData.getAll('channel_link') as string[]).filter(Boolean)

  // Направления деятельности + флаг связи (independent: разные ниши / связанное предложение)
  const directionItems = (formData.getAll('direction') as string[])
    .map((d) => d.trim())
    .filter(Boolean)
  const independentRaw = formData.get('directions_independent') as string | null
  const directionsIndependent =
    independentRaw === '1' ? true : independentRaw === '0' ? false : null
  const directions =
    directionItems.length > 0 ? { items: directionItems, independent: directionsIndependent } : null

  // Используемые рекламные каналы (факт от клиента). «Не знаю» → пустой список.
  const adChannelsUnknown = formData.get('ad_channels_unknown') === '1'
  const adChannels = adChannelsUnknown
    ? null
    : (() => {
        const list = (formData.getAll('ad_channel') as string[]).map((c) => c.trim()).filter(Boolean)
        return list.length ? list : null
      })()

  // Chain / network info
  const isChain = formData.get('is_chain') === '1'
  const chainScope = isChain ? ((formData.get('chain_scope') as string | null) ?? 'network') : null
  const city = (chainScope === 'location' ? ((formData.get('city') as string | null) ?? '').trim() : '') || null

  if (!name || !industry) {
    throw new Error('Название компании и отрасль обязательны')
  }
  if (email && !EMAIL_REGEX.test(email)) {
    throw new Error('Email указан в неверном формате')
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
      directions,
      adChannels,
      competitors: competitors || null,
      clientEmail: email,
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
      directions,
      ad_channels: adChannels,
      ad_channels_unknown: adChannelsUnknown,
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
