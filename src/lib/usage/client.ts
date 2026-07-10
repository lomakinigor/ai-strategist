// Тоненький fire-and-forget хелпер для фронта. Используется из BriefV2View,
// FullV2View, PrintButton. Не блокирует UI и не валит компонент при ошибке.

export type UsageEventType = 'brief_viewed' | 'full_viewed' | 'interactive_viewed' | 'pdf_downloaded'

export interface TrackUsageParams {
  eventType: UsageEventType
  researchJobId?: string
  artifactId?: string
  metadata?: Record<string, unknown>
}

export function trackUsage(params: TrackUsageParams): void {
  if (typeof window === 'undefined') return
  // Не ждём ответа, не показываем ошибки — пользователю это не нужно знать.
  void fetch('/api/usage-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    keepalive: true, // позволяет запросу долететь даже при unload
  }).catch(() => {
    // тихо
  })
}
