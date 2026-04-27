import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Lazy initialization — db connection is created on first call to getDb().
// This allows the build to succeed without DATABASE_URL being set at build time.
let _db: PostgresJsDatabase<typeof schema> | undefined

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL environment variable is not set')
  _db = drizzle(postgres(connectionString, { max: 1 }), { schema })
  return _db
}

export type DB = PostgresJsDatabase<typeof schema>
