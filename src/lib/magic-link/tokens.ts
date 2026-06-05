// Magic-link токены: генерация, создание записи в БД, верификация.
//
// Дизайн:
// - Токен = 32 байта crypto.randomBytes, в base64url (URL-safe, без =).
// - TTL = 30 дней (auth-токен; артефакт по UUID-URL — бессрочно).
// - Один email может иметь несколько активных токенов на разные артефакты
//   (новый artifact → новый токен; старые ссылки продолжают работать пока
//   не истекут).

import { randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { getDb } from '@/db'
import { magicLinks, reportArtifacts } from '@/db/schema'

const TOKEN_BYTES = 32
const TTL_DAYS = 30

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export interface CreateMagicLinkInput {
  email: string
  artifactId: string
}

export interface MagicLinkRecord {
  token: string
  expiresAt: Date
  url: string
}

/**
 * Создаёт magic-link для пары (email, artifactId), вставляет в БД,
 * возвращает токен + готовый URL вида ${siteUrl}/access?token=${token}.
 */
export async function createMagicLink({
  email,
  artifactId,
}: CreateMagicLinkInput): Promise<MagicLinkRecord> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000)

  const db = getDb()
  await db.insert(magicLinks).values({
    token,
    email: email.trim().toLowerCase(),
    artifactId,
    expiresAt,
  })

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    'https://ai-strategist-bice.vercel.app'

  return {
    token,
    expiresAt,
    url: `${siteUrl}/access?token=${encodeURIComponent(token)}`,
  }
}

export type VerifyResult =
  | { ok: true; artifactId: string; tier: 'free' | 'paid' | 'retainer' }
  | { ok: false; reason: 'not_found' | 'expired' }

/**
 * Проверяет токен: жив ли, не протух ли. Возвращает artifactId + tier
 * для маршрутизации в /free-report/[id] или /brief/[id].
 */
export async function verifyMagicLink(token: string): Promise<VerifyResult> {
  if (!token) return { ok: false, reason: 'not_found' }

  const db = getDb()
  const rows = await db
    .select({
      artifactId: magicLinks.artifactId,
      expiresAt: magicLinks.expiresAt,
      tier: reportArtifacts.tier,
    })
    .from(magicLinks)
    .leftJoin(reportArtifacts, eq(reportArtifacts.id, magicLinks.artifactId))
    .where(eq(magicLinks.token, token))
    .limit(1)

  const row = rows[0]
  if (!row) return { ok: false, reason: 'not_found' }
  if (row.expiresAt < new Date()) return { ok: false, reason: 'expired' }

  return { ok: true, artifactId: row.artifactId, tier: row.tier ?? 'paid' }
}

/**
 * Найти активные (не истёкшие) magic-links по email. Используется для
 * UI «список ваших отчётов», когда пользователь возвращается на /access
 * без токена (например, по новой ссылке от модератора).
 */
export async function listActiveLinksByEmail(email: string) {
  const db = getDb()
  return db
    .select({
      artifactId: magicLinks.artifactId,
      token: magicLinks.token,
      expiresAt: magicLinks.expiresAt,
    })
    .from(magicLinks)
    .where(
      and(
        eq(magicLinks.email, email.trim().toLowerCase()),
        gt(magicLinks.expiresAt, new Date()),
      ),
    )
}
