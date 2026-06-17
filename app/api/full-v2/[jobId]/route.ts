// POST /api/full-v2/[jobId] — синхронно генерирует ПОЛНЫЙ ОТЧЁТ v2
// (L2-методология) на основе research-фактов + утверждённого краткого v2.
// Возвращает JSON FullV2. Кеширование — на клиенте через sessionStorage.

import { NextResponse } from 'next/server'
import { generateFullV2 } from '@/lib/strategy/full-v2'

export const maxDuration = 300 // Vercel Hobby Fluid Compute
export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  try {
    const result = await generateFullV2({ artifactIdOrJobId: jobId })
    return NextResponse.json({ full: result.parsed, brief: result.brief })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/full-v2] generation failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
