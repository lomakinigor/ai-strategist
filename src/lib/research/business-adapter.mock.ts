import type { ResearchAdapter, ResearchQuery, RawDataPoint } from '../types'

export const businessAdapterMock: ResearchAdapter = {
  name: 'business-mock',
  researchType: 'business',

  async collect(query: ResearchQuery): Promise<RawDataPoint[]> {
    const today = new Date().toISOString().split('T')[0]

    return [
      {
        data: `Компания «${query.companyName}» работает в отрасли «${query.industry}».${query.description ? ` ${query.description}` : ''}`,
        source: 'Данные intake-формы клиента',
        date: today,
        rs: 3,
        researchType: 'business',
      },
      {
        data: query.website
          ? `Официальный сайт компании «${query.companyName}»: ${query.website}.`
          : `Компания «${query.companyName}» не указала официальный сайт в анкете.`,
        source: query.website ?? 'Данные intake-формы клиента',
        date: today,
        rs: query.website ? 4 : 2,
        researchType: 'business',
      },
      {
        data: `Позиционирование и конкурентный ландшафт «${query.companyName}» в отрасли «${query.industry}» требует верификации через внешние источники (Perplexity Sonar в T-006+).`,
        source: 'mock-placeholder',
        date: today,
        rs: 2,
        researchType: 'business',
      },
    ]
  },
}
