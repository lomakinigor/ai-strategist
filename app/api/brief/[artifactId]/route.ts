import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts, companies } from '@/db/schema'
import { generateBriefReport } from '@/lib/strategy/brief'
import { BriefParseError } from '@/lib/strategy/brief-parser'

// Краткий отчёт на Claude Sonnet может занять десятки секунд.
export const maxDuration = 300

// POST /api/brief/[artifactId] — генерирует краткий отчёт из полного, сохраняет
// в report_artifacts.brief_json (кеш) и возвращает структуру 6 блоков.
export async function POST(_req: Request, { params }: { params: { artifactId: string } }) {
  const { artifactId } = params
  const db = getDb()

  const rows = await db
    .select({
      contentMarkdown: reportArtifacts.contentMarkdown,
      status: reportArtifacts.status,
      companyName: companies.name,
      industry: companies.industry,
    })
    .from(reportArtifacts)
    .leftJoin(companies, eq(reportArtifacts.companyId, companies.id))
    .where(eq(reportArtifacts.id, artifactId))
    .limit(1)

  const artifact = rows[0]
  if (!artifact || !artifact.contentMarkdown || artifact.status !== 'done') {
    return NextResponse.json(
      { error: 'Полный отчёт не найден или ещё не завершён' },
      { status: 404 },
    )
  }

  try {
    const { parsed } = await generateBriefReport(
      artifact.companyName ?? 'Компания',
      artifact.industry ?? '',
      artifact.contentMarkdown,
    )

    await db
      .update(reportArtifacts)
      .set({ briefJson: parsed, updatedAt: new Date() })
      .where(eq(reportArtifacts.id, artifactId))

    return NextResponse.json({ brief: parsed })
  } catch (err) {
    // Мягкая обработка: модель вернула невалидный JSON — не роняем в 500.
    if (err instanceof BriefParseError) {
      return NextResponse.json(
        { error: 'Модель вернула некорректный формат. Попробуйте сгенерировать ещё раз.' },
        { status: 422 },
      )
    }
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
