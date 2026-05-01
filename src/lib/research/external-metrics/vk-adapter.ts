// VK API adapter — получает метрики публичной группы через
// groups.getById (название/подписчики/описание) + wall.get (последние посты).
// Использует service token из VK_SERVICE_TOKEN.

import type { RawDataPoint } from '@/lib/types'

const API_VERSION = '5.199'
const API_BASE = 'https://api.vk.com/method'

interface GroupInfo {
  id: number
  name: string
  screen_name: string
  members_count?: number
  description?: string
  activity?: string
}

interface WallPost {
  id: number
  date: number // unix seconds
  text: string
  views?: { count: number }
  likes?: { count: number }
  reposts?: { count: number }
  comments?: { count: number }
}

interface VkSnapshot {
  groupId: number
  screenName: string
  name: string
  subscribers: number | null
  description: string | null
  activity: string | null
  postsLast30Days: number
  totalPostsParsed: number
  avgViewsLast30Days: number | null
  avgLikesLast30Days: number | null
  engagementRatePct: number | null
}

async function vkApiCall<T>(method: string, params: Record<string, string>): Promise<T | null> {
  const token = process.env.VK_SERVICE_TOKEN
  if (!token) return null

  const url = new URL(`${API_BASE}/${method}`)
  url.searchParams.set('access_token', token)
  url.searchParams.set('v', API_VERSION)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const json = (await res.json()) as { response?: T; error?: { error_code: number; error_msg: string } }
    if (json.error) {
      console.warn(`[vk-adapter] ${method} error: ${json.error.error_msg}`)
      return null
    }
    return json.response ?? null
  } catch (err) {
    console.warn(`[vk-adapter] ${method} fetch failed:`, err)
    return null
  }
}

export async function fetchVkSnapshot(screenName: string): Promise<VkSnapshot | null> {
  const groups = await vkApiCall<GroupInfo[]>('groups.getById', {
    group_ids: screenName,
    fields: 'members_count,description,activity',
  })
  if (!groups || groups.length === 0) return null
  const group = groups[0]

  const wall = await vkApiCall<{ count: number; items: WallPost[] }>('wall.get', {
    owner_id: `-${group.id}`,
    count: '50',
    filter: 'owner',
  })

  const posts = wall?.items ?? []
  const cutoff = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
  const recent = posts.filter((p) => p.date >= cutoff)

  const sumViews = recent.reduce((s, p) => s + (p.views?.count ?? 0), 0)
  const sumLikes = recent.reduce((s, p) => s + (p.likes?.count ?? 0), 0)
  const avgViews = recent.length > 0 ? Math.round(sumViews / recent.length) : null
  const avgLikes = recent.length > 0 ? Math.round(sumLikes / recent.length) : null
  const subscribers = group.members_count ?? null
  const er =
    avgViews && subscribers ? Math.round((avgViews / subscribers) * 1000) / 10 : null

  return {
    groupId: group.id,
    screenName: group.screen_name,
    name: group.name,
    subscribers,
    description: group.description ?? null,
    activity: group.activity ?? null,
    postsLast30Days: recent.length,
    totalPostsParsed: posts.length,
    avgViewsLast30Days: avgViews,
    avgLikesLast30Days: avgLikes,
    engagementRatePct: er,
  }
}

export function snapshotToFact(snapshot: VkSnapshot, originalUrl: string): RawDataPoint {
  const lines = [
    `VK-сообщество «${snapshot.name}» (vk.com/${snapshot.screenName})`,
    snapshot.subscribers !== null
      ? `Подписчиков: ${snapshot.subscribers.toLocaleString('ru-RU')}`
      : 'Подписчиков: не определено',
    `Постов за 30 дней: ${snapshot.postsLast30Days}`,
    snapshot.avgViewsLast30Days !== null
      ? `Средний охват поста: ${snapshot.avgViewsLast30Days.toLocaleString('ru-RU')}`
      : 'Средний охват: данных нет',
    snapshot.avgLikesLast30Days !== null
      ? `Среднее число лайков: ${snapshot.avgLikesLast30Days}`
      : 'Лайков: данных нет',
    snapshot.engagementRatePct !== null
      ? `ER (среднее охватов / подписчиков): ${snapshot.engagementRatePct}%`
      : 'ER: не рассчитан',
    snapshot.activity ? `Тематика: ${snapshot.activity}` : '',
  ].filter(Boolean)

  return {
    data: lines.join('. '),
    source: originalUrl,
    date: new Date().toISOString().slice(0, 10),
    rs: 4, // официальный API VK
    researchType: 'channels',
  }
}
