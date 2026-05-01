import postgres from 'postgres'
import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false })

try {
  const enumValues = await sql`
    SELECT unnest(enum_range(NULL::research_type))::text AS v
  `
  console.log('research_type enum values:', enumValues.map(r => r.v))

  const cols = await sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'research_jobs' AND column_name LIKE '%status%'
    ORDER BY ordinal_position
  `
  console.log('research_jobs status columns:')
  cols.forEach(c => console.log('  -', c.column_name, c.data_type, 'default:', c.column_default, 'null:', c.is_nullable))

  const counts = await sql`
    SELECT competitors_status, COUNT(*) AS n
    FROM research_jobs
    GROUP BY competitors_status
  `
  console.log('research_jobs.competitors_status distribution:')
  counts.forEach(c => console.log('  -', c.competitors_status, ':', c.n))
} finally {
  await sql.end()
}
