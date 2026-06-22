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

  // tier из формы: 'free' (по умолчанию) | 'paid' (QR-оплата) — определяет
  // куда редиректить после создания job (на /pay или /research) и нужен ли approve.
  const tierRaw = (formData.get('tier') as string | null) ?? 'free'
  const tier: 'free' | 'paid' = tierRaw === 'paid' ? 'paid' : 'free'

  // ?version=v2 пробрасывается через скрытое поле формы — server-action иначе
  // не видит query-параметров. Сохраняем для редиректа на /research или /pay.
  const versionRaw = (formData.get('version') as string | null) ?? ''
  const versionSuffix = versionRaw === 'v2' ? '?version=v2' : ''

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

  // UTM-метки от клиента (IntakeForm читает readUtm() из sessionStorage перед submit).
  // Сохраняем как объект в intake_submissions.inputPayload для ROI-анализа по каналам.
  const utm = {
    utm_source: ((formData.get('utm_source') as string | null) ?? '').trim() || null,
    utm_medium: ((formData.get('utm_medium') as string | null) ?? '').trim() || null,
    utm_campaign: ((formData.get('utm_campaign') as string | null) ?? '').trim() || null,
    utm_term: ((formData.get('utm_term') as string | null) ?? '').trim() || null,
    utm_content: ((formData.get('utm_content') as string | null) ?? '').trim() || null,
  }
  const hasUtm = Object.values(utm).some((v) => v !== null)

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
      directions,
      adChannels,
      competitors: competitors || null,
      // Email больше не собираем — отчёт показывается на странице, не через email.
      clientEmail: null,
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
      tier,
      ...(hasUtm ? { utm } : {}),
    },
    fallbackQuestionsNeeded: false,
  })

  // paid=true сразу для free (оплата не нужна), false для paid (ждём approve).
  const [job] = await db
    .insert(researchJobs)
    .values({
      companyId: company.id,
      status: 'pending',
      tier,
      paid: tier === 'free',
    })
    .returning()

  // free → сразу на страницу прогресса research;
  // paid → на страницу оплаты QR, где будет ждать ручного approve администратором.
  if (tier === 'paid') {
    redirect(`/pay/${job.id}${versionSuffix}`)
  }
  redirect(`/research/${job.id}${versionSuffix}`)
}
