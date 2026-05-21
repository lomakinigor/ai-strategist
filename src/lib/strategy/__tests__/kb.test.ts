import { describe, it, expect } from 'vitest'
import {
  detectNiche,
  loadReportRequirements,
  loadRequirementsForText,
} from '../kb'

describe('detectNiche', () => {
  it('определяет legal_services по ключевым словам', async () => {
    expect(await detectNiche('Юридическая фирма, банкротство и корпоративные споры')).toBe(
      'legal_services',
    )
    expect(await detectNiche('адвокат по налогам')).toBe('legal_services')
  })

  it('определяет ecommerce по упоминанию маркетплейсов', async () => {
    expect(await detectNiche('интернет-магазин на Wildberries и Ozon')).toBe('ecommerce')
  })

  it('определяет b2b_saas', async () => {
    expect(await detectNiche('SaaS-платформа по подписке для автоматизации CRM')).toBe('b2b_saas')
  })

  it('возвращает null, если совпадений нет', async () => {
    expect(await detectNiche('пекарня с доставкой круассанов')).toBeNull()
  })

  it('не зависит от регистра', async () => {
    expect(await detectNiche('ЮРИСТ по корпоративным спорам')).toBe('legal_services')
  })
})

describe('loadReportRequirements', () => {
  it('для legal_services объединяет universal + файл ниши', async () => {
    const reqs = await loadReportRequirements('legal_services')
    expect(reqs.niche?.id).toBe('legal_services')
    expect(reqs.niche?.displayName).toBe('Юридические услуги')
    expect(reqs.universalMarkdown).toContain('Универсальные требования')
    expect(reqs.nicheMarkdown).toContain('Юридические услуги')
    // combined содержит оба источника
    expect(reqs.combinedMarkdown).toContain('Универсальные требования')
    expect(reqs.combinedMarkdown).toContain('Репутационный аудит')
  })

  it('graceful fallback: ниша есть в map, но .md отсутствует → только universal', async () => {
    // marketing.md ещё не создан — не должно падать
    const reqs = await loadReportRequirements('marketing')
    expect(reqs.niche?.id).toBe('marketing')
    expect(reqs.nicheMarkdown).toBe('')
    expect(reqs.combinedMarkdown).toBe(reqs.universalMarkdown)
    expect(reqs.combinedMarkdown).toContain('Универсальные требования')
  })

  it('nicheId = null → только universal', async () => {
    const reqs = await loadReportRequirements(null)
    expect(reqs.niche).toBeNull()
    expect(reqs.combinedMarkdown).toBe(reqs.universalMarkdown)
  })
})

describe('loadRequirementsForText', () => {
  it('определяет нишу и грузит требования за один вызов', async () => {
    const reqs = await loadRequirementsForText('Адвокатское бюро, защита репутации в суде')
    expect(reqs.niche?.id).toBe('legal_services')
    expect(reqs.combinedMarkdown).toContain('Репутационный аудит')
  })

  it('текст без ниши → universal-only', async () => {
    const reqs = await loadRequirementsForText('частная пекарня')
    expect(reqs.niche).toBeNull()
    expect(reqs.combinedMarkdown).toBe(reqs.universalMarkdown)
  })
})
