// Внешние метрики для каналов клиента и (в перспективе) конкурентов.
// Принимает список URL → классифицирует через url-router → дёргает адаптеры
// параллельно через Promise.allSettled. Любой сбой в адаптере не валит остальные.

import type { RawDataPoint } from '@/lib/types'
import { detectChannels, type ChannelInfo } from './url-router'
import {
  fetchTelegramSnapshot,
  snapshotToFact as telegramFact,
  buildSkippedFact,
} from './telegram-adapter'
import { fetchVkSnapshot, snapshotToFact as vkFact } from './vk-adapter'
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
    case 'telegram-channel': {
      const snap = await fetchTelegramSnapshot(c.identifier)
      if (!snap) return [buildSkippedFact(c.originalUrl, 'превью Telegram недоступно')]
      return [telegramFact(snap, c.originalUrl)]
    }
    case 'vk': {
      const snap = await fetchVkSnapshot(c.identifier)
      if (!snap) return [buildSkippedFact(c.originalUrl, 'VK API не вернул данные')]
      return [vkFact(snap, c.originalUrl)]
    }
    case 'site': {
      const snap = await fetchPageSpeedSnapshot(c.identifier)
      if (!snap) return [buildSkippedFact(c.originalUrl, 'PageSpeed Insights не доступен')]
      return [pageSpeedFact(snap)]
    }
    case 'telegram-bot':
      return [buildSkippedFact(c.originalUrl, 'Telegram-бот: публичных метрик нет')]
    case 'skip':
      return [buildSkippedFact(c.originalUrl, 'агрегатор/приватная ссылка — пропуск')]
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
