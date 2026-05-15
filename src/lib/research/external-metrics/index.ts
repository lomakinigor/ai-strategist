// Внешние метрики сайта клиента — только PageSpeed Insights.
// VK и Telegram исключены: скрапинг не давал достоверных данных.
// Принимает URL сайта → запускает PageSpeed адаптер.

import type { RawDataPoint } from '@/lib/types'
import { detectChannels, type ChannelInfo } from './url-router'
import { buildSkippedFact } from './telegram-adapter'
import {
  fetchPageSpeedSnapshot,
  snapshotToFact as pageSpeedFact,
} from './pagespeed-adapter'

export interface ExternalMetricsResult {
  points: RawDataPoint[]
  stats: {
    requested: number
    succeeded: number
    skipped: number
    failed: number
  }
}

async function processChannel(c: ChannelInfo): Promise<RawDataPoint[]> {
  switch (c.type) {
    case 'site': {
      const snap = await fetchPageSpeedSnapshot(c.identifier)
      if (!snap) return [buildSkippedFact(c.originalUrl, 'PageSpeed Insights не доступен')]
      return [pageSpeedFact(snap)]
    }
    // VK и Telegram исключены из пайплайна — данные не использовались
    case 'telegram-channel':
    case 'telegram-bot':
    case 'vk':
      return []
    case 'skip':
      return []
    default:
      return []
  }
}

export async function collectExternalMetrics(
  urls: Array<string | null | undefined>,
): Promise<ExternalMetricsResult> {
  const channels = detectChannels(urls)
  if (channels.length === 0) {
    return { points: [], stats: { requested: 0, succeeded: 0, skipped: 0, failed: 0 } }
  }

  const settled = await Promise.allSettled(channels.map(processChannel))

  const points: RawDataPoint[] = []
  let succeeded = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < settled.length; i++) {
    const r = settled[i]
    const c = channels[i]
    if (r.status === 'fulfilled') {
      points.push(...r.value)
      // Считаем успешными только те, у кого rs >= 4 (реальный snapshot, не skip)
      const success = r.value.some((p) => p.rs >= 4)
      if (success) succeeded++
      else skipped++
    } else {
      failed++
      points.push(
        buildSkippedFact(c.originalUrl, `сбой адаптера: ${String(r.reason).slice(0, 100)}`),
      )
    }
  }

  return {
    points,
    stats: {
      requested: channels.length,
      succeeded,
      skipped,
      failed,
    },
  }
}
