import type { ResearchAdapter, ResearchQuery, RawDataPoint } from '../types'

export const audienceAdapterMock: ResearchAdapter = {
  name: 'audience-mock',
  researchType: 'audience',

  async collect(query: ResearchQuery): Promise<RawDataPoint[]> {
    const today = new Date().toISOString().split('T')[0]

    return [
      {
        data: `Целевая аудитория компании «${query.companyName}» в отрасли «${query.industry}» предположительно включает B2B и/или B2C сегменты — уточняется по вакансиям и рекламным сигналам.`,
        source: 'Косвенные сигналы (вакансии, реклама) — mock-placeholder',
        date: today,
        rs: 2,
        researchType: 'audience',
      },
      {
        data: `Потенциальные потребности аудитории «${query.companyName}»: решение задач в области «${query.industry}», снижение издержек, повышение эффективности. Требует верификации через интервью и аналитику.`,
        source: 'mock-placeholder',
        date: today,
        rs: 2,
        researchType: 'audience',
      },
      {
        data: `Поведенческие паттерны и «боли» аудитории в нише «${query.industry}» будут добавлены после анализа отзывов, форумов и социальных сигналов (Perplexity Sonar в T-006+).`,
        source: 'mock-placeholder',
        date: today,
        rs: 2,
        researchType: 'audience',
      },
    ]
  },
}
