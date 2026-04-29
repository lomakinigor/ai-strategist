import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts, researchJobs, companies } from '@/db/schema'

export async function GET(
  _request: Request,
  { params }: { params: { artifactId: string } }
) {
  try {
    const db = getDb()

    const artifacts = await db
      .select()
      .from(reportArtifacts)
      .where(eq(reportArtifacts.id, params.artifactId))
      .limit(1)

    const artifact = artifacts[0]
    if (!artifact || artifact.status !== 'done' || !artifact.contentMarkdown) {
      return NextResponse.json(
        { error: 'Артефакт не найден или ещё не готов' },
        { status: 404 }
      )
    }

    let companyName = 'strategy'
    const jobs = artifact.researchJobId
      ? await db
          .select({ companyId: researchJobs.companyId })
          .from(researchJobs)
          .where(eq(researchJobs.id, artifact.researchJobId))
          .limit(1)
      : []

    if (jobs[0]) {
      const comps = await db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, jobs[0].companyId))
        .limit(1)
      if (comps[0]) companyName = comps[0].name
    }

    // Russian-friendly filename for modern browsers, ASCII fallback for legacy ones
    const utf8Filename = `Стратегия — ${companyName}.md`
    const asciiFallback = `strategy-${params.artifactId.slice(0, 8)}.md`

    return new Response(artifact.contentMarkdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
