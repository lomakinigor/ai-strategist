// Привести произвольное название канала (из AI-парсера) к канонической опции чеклиста.
// Возвращает null, если канал не из стандартного списка (тогда уйдёт в «Другое»).
// Канонический список должен совпадать с AD_CHANNEL_OPTIONS в IntakeForm.
export function normalizeAdChannel(raw: string): string | null {
  const s = raw.toLowerCase().replace(/[.\s_-]/g, '')
  if (s.includes('директ') || s.includes('yandexdirect') || s.includes('яндексдирект')) return 'Яндекс.Директ'
  if (s.includes('авито') || s.includes('avito')) return 'Авито'
  if (s === 'seo' || s.includes('сео') || s.includes('поисковаяоптимизац')) return 'SEO'
  if (s.includes('вконтакте') || s === 'вк' || s.includes('vk')) return 'ВКонтакте'
  if (s.includes('telegram') || s.includes('телеграм')) return 'Telegram'
  if (s.includes('2gis') || s.includes('2гис') || s.includes('карты') || s.includes('maps')) return '2ГИС/Карты'
  if (s.includes('email') || s.includes('почт') || s.includes('рассыл')) return 'Email-рассылка'
  if (s.includes('выставк') || s.includes('тендер')) return 'Выставки/тендеры'
  return null
}
