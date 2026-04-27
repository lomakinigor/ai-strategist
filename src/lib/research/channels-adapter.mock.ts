import type { ResearchAdapter, ResearchQuery, RawDataPoint } from '../types'

export const channelsAdapterMock: ResearchAdapter = {
  name: 'channels-mock',
  researchType: 'channels',

  async collect(query: ResearchQuery): Promise<RawDataPoint[]> {
    const today = new Date().toISOString().split('T')[0]
    const knownChannels = query.channels?.length ? query.channels.join(', ') : null

    return [
      {
        data: knownChannels
          ? `Компания «${query.companyName}» указала следующие каналы присутствия: ${knownChannels}.`
          : `Каналы присутствия компании «${query.companyName}» не указаны в анкете. Анализ будет проведён через внешние источники.`,
        source: knownChannels ? 'Данные intake-формы клиента' : 'mock-placeholder',
        date: today,
        rs: knownChannels ? 3 : 2,
        researchType: 'channels',
      },
      {
        data: `Рекомендуемые каналы для отрасли «${query.industry}» в РФ: ВКонтакте, Telegram, SEO, контекстная реклама (Яндекс.Директ). Актуальность каналов уточняется под конкретную аудиторию.`,
        source: 'mock-placeholder (анализ РФ-рынка запланирован)',
        date: today,
        rs: 2,
        researchType: 'channels',
      },
      {
        data: `Активность и охват конкурентов «${query.companyName}» в каналах требует верификации через внешние источники (Perplexity Sonar в T-006+).`,
        source: 'mock-placeholder',
        date: today,
        rs: 2,
        researchType: 'channels',
      },
    ]
  },
}
