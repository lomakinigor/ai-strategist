import type { ResearchAdapter, ResearchQuery, RawDataPoint } from '../types'

export const marketAdapterMock: ResearchAdapter = {
  name: 'market-mock',
  researchType: 'market',

  async collect(query: ResearchQuery): Promise<RawDataPoint[]> {
    const today = new Date().toISOString().split('T')[0]

    return [
      {
        data: `Рынок отрасли «${query.industry}» в РФ демонстрирует умеренную динамику. Детальные объёмы и прогнозы будут добавлены при подключении реальных источников (Perplexity Sonar).`,
        source: 'mock-placeholder (Росстат, РБК, Ведомости — запрос запланирован)',
        date: today,
        rs: 3,
        researchType: 'market',
      },
      {
        data: `Конкуренция в нише «${query.industry}» на российском рынке оценивается как средняя. Основные игроки требуют анализа через внешние источники.`,
        source: 'mock-placeholder',
        date: today,
        rs: 3,
        researchType: 'market',
      },
      {
        data: `Тренды в сегменте «${query.industry}» (РФ): цифровизация, рост e-commerce, смещение бюджетов в онлайн-каналы. Мировая аналитика — применимость к российскому рынку не гарантирована.`,
        source: 'mock-placeholder',
        date: today,
        rs: 2,
        researchType: 'market',
      },
    ]
  },
}
