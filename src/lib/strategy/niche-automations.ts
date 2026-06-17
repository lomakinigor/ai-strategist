// Реестр нишевых AI-автоматизаций — общий для нового краткого отчёта (v2)
// и будущего полного. Используется блоком 5.3 (нишевые автоматизации).
//
// Структура: { niche, patterns: [{ title, description }] }. Ниша определяется
// эвристикой по строке industry/description; если не сопоставлена — возвращается
// generic-набор (универсальные паттерны, применимые к любому SMB).

export interface NicheAutomationPattern {
  title: string
  description: string
}

export interface NicheAutomationEntry {
  niche: string
  matchers: string[] // подстроки в industry/description для эвристики
  patterns: NicheAutomationPattern[]
}

export const NICHE_AUTOMATIONS: NicheAutomationEntry[] = [
  {
    niche: 'legal_services',
    matchers: ['юрид', 'юрист', 'адвокат', 'судебн', 'банкротств', 'legal', 'правов'],
    patterns: [
      {
        title: 'Автоматическое оповещение клиентов по ходу дел',
        description:
          'Бот мониторит изменения по делам в КАД/ГАС «Правосудие» и автоматически шлёт клиенту обновления в Telegram/WhatsApp/Email — без нагрузки на ассистента.',
      },
      {
        title: 'Генерация постов из реальных дел + автопостинг',
        description:
          'AI забирает анонимизированную фабулу выигранного дела, превращает в кейс-пост для соцсетей и автоматически публикует в ВКонтакте/Telegram/MAX/Дзен — контент-маркетинг без копирайтера.',
      },
    ],
  },
  {
    niche: 'generic',
    matchers: [], // fallback
    patterns: [
      {
        title: 'AI-агент квалификации лидов 24/7',
        description:
          'Бот на сайте и в соцсетях принимает обращения круглосуточно, классифицирует по сегментам, передаёт менеджеру только горячие лиды. Снижает CPL, разгружает отдел продаж.',
      },
      {
        title: 'Авто-генерация контент-плана из ключевых событий',
        description:
          'AI еженедельно собирает поводы (новости отрасли, кейсы компании, сезонные триггеры) и формирует контент-план на 5–10 постов с черновиками текстов.',
      },
    ],
  },
]

export function detectNicheId(industryAndDescription: string): string {
  const lower = industryAndDescription.toLowerCase()
  for (const entry of NICHE_AUTOMATIONS) {
    if (entry.matchers.some((m) => lower.includes(m))) {
      return entry.niche
    }
  }
  return 'generic'
}

export function getNicheAutomations(nicheId: string): NicheAutomationPattern[] {
  const entry = NICHE_AUTOMATIONS.find((e) => e.niche === nicheId)
  return entry?.patterns ?? NICHE_AUTOMATIONS[NICHE_AUTOMATIONS.length - 1].patterns
}
