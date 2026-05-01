/**
 * One-shot migration runner.
 * Reads SQL file and applies to DATABASE_URL.
 *
 * Usage: node scripts/apply-migration.mjs drizzle/0001_competitors_stream.sql
 */

import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/apply-migration.mjs <path-to-sql>')
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const sql = readFileSync(file, 'utf8')
console.log(`[migrate] applying ${file} (${sql.length} bytes)`)

const client = postgres(url, { max: 1, prepare: false })

try {
  // postgres-js exec supports multi-statement as raw text via .unsafe()
  await client.unsafe(sql)
  console.log('[migrate] OK')
} catch (err) {
  console.error('[migrate] FAILED:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
