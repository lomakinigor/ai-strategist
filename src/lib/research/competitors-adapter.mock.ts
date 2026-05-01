import type { ResearchAdapter, ResearchQuery, RawDataPoint } from '../types'

// Mock-only placeholder. Real Perplexity prompt for competitors lives in
// src/lib/ai/providers/perplexity-research-provider.ts and should:
//   1. Take client-supplied competitors (intake `competitors` field) as starting set
//   2. Discover 3-5 additional competitors in the same niche
//   3. For each: positioning, prices (if public), strengths, weaknesses
// All facts must cite a public URL — facts without source are dropped at classify time.
export const competitorsAdapterMock: ResearchAdapter = {
  name: 'competitors-mock',
  researchType: 'competitors',

  async collect(query: ResearchQuery): Promise<RawDataPoint[]> {
    const today = new Date().toISOString().split('T')[0]

    return [
      {
        data: `Прямые конкуренты «${query.companyName}» в отрасли «${query.industry}» требуют верификации через Perplexity Sonar. Mock-режим не выполняет реальный поиск конкурентов.`,
        source: 'mock-placeholder',
        date: today,
        rs: 2,
        researchType: 'competitors',
      },
      {
        data: `Сравнительный анализ цен, продуктовых линеек и позиционирования конкурентов «${query.companyName}» возможен только при наличии RESEARCH_MODE=real.`,
        source: 'mock-placeholder',
        date: today,
        rs: 2,
        researchType: 'competitors',
      },
      {
        data: `Уязвимости конкурентов и точки входа для «${query.companyName}» (что они делают плохо, где можно их превзойти) выявляются через анализ их сайтов и отзывов.`,
        source: 'mock-placeholder',
        date: today,
        rs: 2,
        researchType: 'competitors',
      },
    ]
  },
}
