'use client'

// FullV2View — НОВЫЙ компонент ПОЛНОГО отчёта v2 (тестовая версия).
// Доступен через /research/[jobId]/report?version=v2.
// Зеркалит структуру утверждённого краткого v2: те же Части A/B/C/D
// с детальным раскрытием каждого подраздела (A1-A6, B1-B3, C1-C3, D1-D3),
// плюс Часть 0 Executive Summary, Часть E AI-автоматизация (E1-E3),
// статичные Части F (реализация под ключ), G (источники с RS),
// H (compliance disclaimer).
//
// Старый полный отчёт (decision-driven §0-8) продолжает работать по дефолту.

import { useEffect, useState } from 'react'
import Link from 'next/link'

type RsLevel = 'green' | 'yellow' | 'orange' | 'red'

interface FullV2 {
  part_0: {
    intake_quote: string
    ru_position: string
    rf_vs_global: string
    top_3_actions: string[]
    key_risks: string[]
  }
  part_a: {
    a1: {
      market_size_rub: string
      cagr: string
      lifecycle_stage: string
      porter_forces: Array<{ name: string; score: number; rationale: string }>
      pestel: Array<{ axis: string; factors: string[] }>
      top_regulatory_risks: string[]
    }
    a2: {
      jtbd_top: Array<{ job: string; priority: 'high' | 'medium' | 'low' }>
      pains_top: string[]
      gains_top: string[]
      voice_of_customer: string[]
      segmentation: string[]
    }
    a3: {
      client_lighthouse: { url: string; performance: string; seo: string; notes: string }
      competitors_lighthouse: Array<{ url: string; performance: string; seo: string; notes: string }>
      content_coverage: string
      serp_observation: string
      data_limitation_note: string
    }
    a4: {
      profiles: Array<{
        name: string
        positioning: string
        segments: string
        pricing: string
        channels: string
        content_strategy: string
        tech_stack: string
        team_finance: string
        reviews_tonality: string
        recent_moves: string
        scoring: { offer: number; audience: number; proof: number; creative: number; landing: number }
        strengths: string[]
        weaknesses: string[]
        forecast_6m: string
      }>
      summary_matrix_note: string
    }
    a5: {
      swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }
      tows: { so: string[]; st: string[]; wo: string[]; wt: string[] }
    }
    a6: {
      client_value_curve: string
      competitors_value_curves: string
      four_actions: { eliminate: string[]; reduce: string[]; raise: string[]; create: string[] }
    }
  }
  part_b: {
    b1_global_snapshot: {
      leading_countries: string[]
      market_size_usd: string
      top_players: string[]
      consolidation_level: string
    }
    b2_trends: Array<{ trend: string; rf_arrival: string; note: string }>
    b3_top_global_players: Array<{ name: string; why_different_from_rf: string }>
  }
  part_c: {
    c1_comparison_table: Array<{
      parameter: string
      rf: string
      global: string
      delta: string
      implication: string
    }>
    c2_opportunity_gaps: Array<{ gap: string; client_scenario: string; complexity: string }>
    c3_what_not_to_repeat: Array<{ attempt: string; why_failed: string; lesson: string }>
  }
  part_d: {
    d1_roadmap: {
      h1: Array<{ action: string; why: string; metric: string; timeline: string }>
      h2: Array<{ action: string; why: string; metric: string; timeline: string }>
      h3: Array<{ action: string; why: string; metric: string; timeline: string }>
    }
    d2_kpis: Array<{ name: string; target_6m: string }>
    d3_hypotheses: Array<{
      statement: string
      test_method: string
      success_signal: string
      budget_range: string
    }>
  }
  part_e: {
    e1_business_process: {
      title: string
      detailed_roadmap: string[]
      roi_estimate: string
      emotional_argument: string
      implementation_l2: string
    }
    e2_marketing: {
      title: string
      detailed_roadmap: string[]
      roi_estimate: string
      emotional_argument: string
      implementation_l2: string
    }
    e3_niche_specific: {
      title: string
      detailed_roadmap: string[]
      roi_estimate: string
      emotional_argument: string
      implementation_l2: string
    }
  }
  part_g: {
    g1_sources: Array<{ description: string; rs: RsLevel; url?: string }>
    g2_unverified: string[]
    g3_open_questions: string[]
  }
}

interface Props {
  jobId: string
  companyName: string
  industry: string
}

const CACHE_KEY = (jobId: string) => `full_v2_v1_${jobId}`

function readCache(jobId: string): FullV2 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY(jobId))
    if (!raw) return null
    return JSON.parse(raw) as FullV2
  } catch {
    return null
  }
}

function writeCache(jobId: string, full: FullV2): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY(jobId), JSON.stringify(full))
  } catch {
    // переполнение sessionStorage — не критично
  }
}

const RS_BADGE: Record<RsLevel, { emoji: string; label: string; classes: string }> = {
  green: { emoji: '🟢', label: 'Официальный', classes: 'bg-green-50 text-green-800 border-green-200' },
  yellow: { emoji: '🟡', label: 'Оценочный', classes: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  orange: { emoji: '🟠', label: 'Экспертный', classes: 'bg-orange-50 text-orange-800 border-orange-200' },
  red: { emoji: '🔴', label: 'Неверифицируемый', classes: 'bg-red-50 text-red-800 border-red-200' },
}

export function FullV2View({ jobId, companyName, industry }: Props) {
  const [full, setFull] = useState<FullV2 | null>(() => readCache(jobId))
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    console.log('Full report version: v2')
  }, [])

  useEffect(() => {
    if (full) return

    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000)
    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch(`/api/full-v2/${jobId}`, { method: 'POST' })
        const data = (await res.json().catch(() => ({}))) as { full?: FullV2; error?: string }
        if (cancelled) return
        if (!res.ok || !data.full) {
          setError(data.error ?? `HTTP ${res.status}`)
          return
        }
        setFull(data.full)
        writeCache(jobId, data.full)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Сетевая ошибка')
      } finally {
        clearInterval(timer)
      }
    }

    void run()
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [jobId, full])

  if (error) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Ошибка генерации полного v2</p>
        <h2 className="text-2xl font-bold mb-3 tracking-[-0.02em]">
          Не удалось сформировать полный отчёт v2
        </h2>
        <p className="text-base text-[#525252] max-w-md mx-auto leading-[1.6] mb-2">{error}</p>
        <p className="text-xs text-[#737373] mt-4">
          Это тестовая версия. Уберите <code>?version=v2</code> чтобы увидеть рабочий старый полный отчёт.
        </p>
      </section>
    )
  }

  if (!full) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="lp-eyebrow mb-4">Полный v2 — тестовая версия</p>
        <div className="flex items-center justify-center mb-6">
          <span
            aria-hidden
            className="inline-block w-8 h-8 rounded-full border-2 border-[#e5e5e5] border-t-[#0a0a0a] animate-spin"
          />
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-[-0.02em]">Формируем полный отчёт…</h2>
        <p className="text-base text-[#525252] max-w-md mx-auto leading-[1.6]">
          На этом уровне идёт двойной LLM-вызов (краткий → полный), занимает 60–120 секунд.
          Прошло {elapsed} сек.
        </p>
      </section>
    )
  }

  return (
    <>
      <FullV2PrintStyles />

      <main className="max-w-4xl mx-auto px-6 py-10 sm:py-14 bg-white text-[#0a0a0a]">
        {/* HEADER */}
        <header className="mb-12 page-break-after-avoid">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <p className="lp-eyebrow lp-eyebrow-warm">Полный стратегический отчёт</p>
            <div className="flex items-center gap-2 no-print">
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-1 rounded bg-[#fef3c7] text-[#92400e]">
                v2 · тестовая версия
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="lp-btn-ghost text-sm"
              >
                Скачать PDF
              </button>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
            {companyName} — стратегический анализ
          </h1>
          <p className="text-sm text-[#525252] leading-[1.6]">
            {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}
            {' · '}Методология RS 1–5 (🟢🟡🟠🔴)
            {industry ? ` · ${industry}` : ''}
          </p>
        </header>

        {/* TABLE OF CONTENTS — only print */}
        <nav className="print-only mb-8 border-t border-b border-[#e5e5e5] py-4">
          <p className="text-xs uppercase tracking-wider font-bold mb-2">Содержание</p>
          <ol className="text-sm space-y-1 list-decimal pl-5">
            <li>Часть 0 — Executive Summary</li>
            <li>Часть A — Российский рынок (A1–A6)</li>
            <li>Часть B — Зарубежный опыт (B1–B3)</li>
            <li>Часть C — Сравнение РФ vs Global</li>
            <li>Часть D — Стратегия и Roadmap</li>
            <li>Часть E — AI-автоматизация</li>
            <li>Часть F — Реализация под ключ</li>
            <li>Часть G — Источники и достоверность</li>
            <li>Часть H — Compliance disclaimer</li>
          </ol>
        </nav>

        {/* PART 0 — Executive Summary */}
        {full.part_0 && (
          <Part title="Часть 0 — Executive Summary" badge="📋" id="part-0">
            {full.part_0.intake_quote && (
              <>
                <p className="lp-eyebrow mb-3">Запрос клиента</p>
                <blockquote className="border-l-4 border-[#1e3a8a] pl-6 py-2 mb-6">
                  <p className="text-lg font-medium leading-[1.5] italic">«{full.part_0.intake_quote}»</p>
                </blockquote>
              </>
            )}
            {full.part_0.ru_position && (
              <SubSection title="Позиция в РФ">
                <p className="text-base leading-[1.6]">{full.part_0.ru_position}</p>
              </SubSection>
            )}
            {full.part_0.rf_vs_global && (
              <SubSection title="Где РФ относительно Global">
                <p className="text-base leading-[1.6]">{full.part_0.rf_vs_global}</p>
              </SubSection>
            )}
            <SubSection title="Top-3 действия">
              <BulletList items={full.part_0.top_3_actions} />
            </SubSection>
            <SubSection title="Ключевые риски">
              <BulletList items={full.part_0.key_risks} />
            </SubSection>
          </Part>
        )}

        {/* PART A — РФ-анализ */}
        <Part title="Часть A — Анализ российского рынка" badge="🇷🇺" id="part-a">
          <SubSection title="A1. Industry Snapshot — Porter 5F + PESTEL">
            <KV>
              <KVRow label="Размер рынка">{full.part_a.a1.market_size_rub}</KVRow>
              <KVRow label="Темп роста (CAGR)">{full.part_a.a1.cagr}</KVRow>
              <KVRow label="Стадия жизненного цикла">{full.part_a.a1.lifecycle_stage}</KVRow>
            </KV>

            <p className="lp-eyebrow mt-6 mb-3">5 сил Портера (оценка 1–5)</p>
            <div className="space-y-3 mb-6">
              {(full.part_a.a1.porter_forces ?? []).map((f, i) => (
                <div key={i} className="border border-[#e5e5e5] rounded p-4">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-semibold text-[15px]">{f.name}</span>
                    <span className="text-sm font-bold text-[#1e3a8a]">
                      {f.score}/5
                    </span>
                  </div>
                  <p className="text-sm text-[#525252] leading-[1.5]">{f.rationale}</p>
                </div>
              ))}
            </div>

            <p className="lp-eyebrow mb-3">PESTEL — 6 осей</p>
            <div className="grid gap-3 md:grid-cols-2 mb-6">
              {(full.part_a.a1.pestel ?? []).map((p, i) => (
                <div key={i} className="border border-[#e5e5e5] rounded p-4">
                  <p className="text-xs uppercase tracking-wider font-bold text-[#1e3a8a] mb-2">
                    {p.axis}
                  </p>
                  <BulletList items={p.factors ?? []} compact />
                </div>
              ))}
            </div>

            <SubSection title="Топ-5 регуляторных рисков на 12 месяцев">
              <BulletList items={full.part_a.a1.top_regulatory_risks} />
            </SubSection>
          </SubSection>

          <SubSection title="A2. Customer Insights — JTBD + Voice of Customer">
            <p className="lp-eyebrow mb-2">JTBD (jobs-to-be-done)</p>
            <ul className="space-y-1.5 mb-5">
              {(full.part_a.a2.jtbd_top ?? []).map((j, i) => (
                <li key={i} className="text-sm leading-[1.55] flex gap-2">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded shrink-0 ${
                      j.priority === 'high'
                        ? 'bg-red-50 text-red-800'
                        : j.priority === 'medium'
                          ? 'bg-yellow-50 text-yellow-800'
                          : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {j.priority}
                  </span>
                  <span>{j.job}</span>
                </li>
              ))}
            </ul>

            <div className="grid gap-5 md:grid-cols-2 mb-5">
              <div>
                <p className="lp-eyebrow lp-eyebrow-warm mb-2">Top pains</p>
                <BulletList items={full.part_a.a2.pains_top} compact />
              </div>
              <div>
                <p className="lp-eyebrow mb-2" style={{ color: '#15803d' }}>
                  Top gains
                </p>
                <BulletList items={full.part_a.a2.gains_top} compact />
              </div>
            </div>

            <SubSection title="Voice of customer (публичные отзывы)">
              <div className="space-y-2">
                {(full.part_a.a2.voice_of_customer ?? []).map((v, i) => (
                  <blockquote
                    key={i}
                    className="border-l-2 border-[#a3a3a3] pl-3 text-sm italic text-[#525252] leading-[1.55]"
                  >
                    «{v}»
                  </blockquote>
                ))}
              </div>
            </SubSection>

            <SubSection title="Сегментация по поведению">
              <BulletList items={full.part_a.a2.segmentation} />
            </SubSection>
          </SubSection>

          <SubSection title="A3. Digital Footprint Map — Lighthouse + SERP">
            <p className="lp-eyebrow mb-2">Сайт клиента</p>
            <KV>
              <KVRow label="URL">{full.part_a.a3.client_lighthouse?.url}</KVRow>
              <KVRow label="Performance">{full.part_a.a3.client_lighthouse?.performance}</KVRow>
              <KVRow label="SEO">{full.part_a.a3.client_lighthouse?.seo}</KVRow>
              <KVRow label="Заметки">{full.part_a.a3.client_lighthouse?.notes}</KVRow>
            </KV>

            <p className="lp-eyebrow mt-5 mb-2">Top-5 конкурентов</p>
            <div className="space-y-3 mb-5">
              {(full.part_a.a3.competitors_lighthouse ?? []).map((c, i) => (
                <div key={i} className="border border-[#e5e5e5] rounded p-3 text-sm">
                  <p className="font-semibold mb-1">{c.url}</p>
                  <p className="text-[#525252]">
                    Performance: {c.performance} · SEO: {c.seo}
                  </p>
                  {c.notes && <p className="text-[#737373] text-xs mt-1">{c.notes}</p>}
                </div>
              ))}
            </div>

            <SubSection title="Покрытие контента ниши">
              <p className="text-sm leading-[1.6]">{full.part_a.a3.content_coverage}</p>
            </SubSection>
            <SubSection title="Открытое наблюдение SERP">
              <p className="text-sm leading-[1.6]">{full.part_a.a3.serp_observation}</p>
            </SubSection>
            <p className="text-xs text-[#737373] italic mt-3">
              {full.part_a.a3.data_limitation_note}
            </p>
          </SubSection>

          <SubSection title="A4. Competitor Profiles — top-5">
            <div className="space-y-6 mb-4">
              {(full.part_a.a4.profiles ?? []).map((p, i) => (
                <CompetitorCard key={i} profile={p} index={i + 1} />
              ))}
            </div>
            {full.part_a.a4.summary_matrix_note && (
              <p className="text-sm text-[#525252] italic">
                {full.part_a.a4.summary_matrix_note}
              </p>
            )}
          </SubSection>

          <SubSection title="A5. SWOT-TOWS клиента">
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <SwotQuadrant title="Сильные стороны" items={full.part_a.a5.swot?.strengths} color="green" />
              <SwotQuadrant title="Слабые стороны" items={full.part_a.a5.swot?.weaknesses} color="red" />
              <SwotQuadrant title="Возможности" items={full.part_a.a5.swot?.opportunities} color="blue" />
              <SwotQuadrant title="Угрозы" items={full.part_a.a5.swot?.threats} color="amber" />
            </div>

            <p className="lp-eyebrow mb-3">TOWS-матрица — конкретные действия</p>
            <div className="grid gap-4 md:grid-cols-2">
              <SwotQuadrant title="SO — силы × возможности" items={full.part_a.a5.tows?.so} color="green" />
              <SwotQuadrant title="ST — силы × угрозы" items={full.part_a.a5.tows?.st} color="blue" />
              <SwotQuadrant title="WO — слабости × возможности" items={full.part_a.a5.tows?.wo} color="amber" />
              <SwotQuadrant title="WT — слабости × угрозы" items={full.part_a.a5.tows?.wt} color="red" />
            </div>
          </SubSection>

          <SubSection title="A6. Blue Ocean Value Curve">
            <SubSection title="Кривая ценности клиента">
              <p className="text-sm leading-[1.6]">{full.part_a.a6.client_value_curve}</p>
            </SubSection>
            <SubSection title="Сравнение с top-5 конкурентов">
              <p className="text-sm leading-[1.6]">{full.part_a.a6.competitors_value_curves}</p>
            </SubSection>
            <p className="lp-eyebrow mt-5 mb-3">4 действия Blue Ocean</p>
            <div className="grid gap-3 md:grid-cols-2">
              <BlueOceanAction label="Eliminate" items={full.part_a.a6.four_actions?.eliminate} />
              <BlueOceanAction label="Reduce" items={full.part_a.a6.four_actions?.reduce} />
              <BlueOceanAction label="Raise" items={full.part_a.a6.four_actions?.raise} />
              <BlueOceanAction label="Create" items={full.part_a.a6.four_actions?.create} />
            </div>
          </SubSection>
        </Part>

        {/* PART B — Global */}
        <Part title="Часть B — Зарубежный опыт за 2 года" badge="🌍" id="part-b">
          <SubSection title="B1. Global Industry Snapshot">
            <KV>
              <KVRow label="Ведущие страны">
                {(full.part_b.b1_global_snapshot?.leading_countries ?? []).join(' · ')}
              </KVRow>
              <KVRow label="Размер рынка (USD)">{full.part_b.b1_global_snapshot?.market_size_usd}</KVRow>
              <KVRow label="Степень консолидации">
                {full.part_b.b1_global_snapshot?.consolidation_level}
              </KVRow>
            </KV>
            <SubSection title="Top игроки Global">
              <BulletList items={full.part_b.b1_global_snapshot?.top_players} />
            </SubSection>
          </SubSection>

          <SubSection title="B2. Global Trends & Innovations">
            <div className="space-y-3">
              {(full.part_b.b2_trends ?? []).map((t, i) => (
                <div key={i} className="border border-[#e5e5e5] rounded p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold flex-1">{t.trend}</p>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shrink-0 ${
                        t.rf_arrival === 'already_here'
                          ? 'bg-green-50 text-green-800'
                          : t.rf_arrival === 'in_12m'
                            ? 'bg-yellow-50 text-yellow-800'
                            : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {t.rf_arrival === 'already_here'
                        ? 'уже в РФ'
                        : t.rf_arrival === 'in_12m'
                          ? '12 мес'
                          : 'не придёт'}
                    </span>
                  </div>
                  <p className="text-sm text-[#525252] leading-[1.55]">{t.note}</p>
                </div>
              ))}
            </div>
          </SubSection>

          <SubSection title="B3. Global Top Players (не дублируя РФ)">
            <div className="space-y-3">
              {(full.part_b.b3_top_global_players ?? []).map((p, i) => (
                <div key={i} className="border border-[#e5e5e5] rounded p-3">
                  <p className="text-sm font-semibold mb-1">{p.name}</p>
                  <p className="text-sm text-[#525252] leading-[1.55]">{p.why_different_from_rf}</p>
                </div>
              ))}
            </div>
          </SubSection>
        </Part>

        {/* PART C — Сравнение РФ vs Global */}
        <Part title="Часть C — РФ vs Global Comparison" badge="📊" id="part-c">
          <SubSection title="C1. Сравнительная таблица 8–10 параметров">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-[#e5e5e5]">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Параметр</th>
                    <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">РФ</th>
                    <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Global</th>
                    <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Разница</th>
                    <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Следствие</th>
                  </tr>
                </thead>
                <tbody>
                  {(full.part_c.c1_comparison_table ?? []).map((row, i) => (
                    <tr key={i} className="border-b border-[#e5e5e5]">
                      <td className="px-3 py-2 font-medium align-top">{row.parameter}</td>
                      <td className="px-3 py-2 align-top">{row.rf}</td>
                      <td className="px-3 py-2 align-top">{row.global}</td>
                      <td className="px-3 py-2 align-top text-[#525252]">{row.delta}</td>
                      <td className="px-3 py-2 align-top">{row.implication}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SubSection>

          <SubSection title="C2. Opportunity Gaps — что копировать из Global">
            <div className="space-y-3">
              {(full.part_c.c2_opportunity_gaps ?? []).map((g, i) => (
                <div key={i} className="border border-green-200 bg-green-50 rounded p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold flex-1">{g.gap}</p>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shrink-0 ${
                        g.complexity === 'low'
                          ? 'bg-white text-green-800'
                          : g.complexity === 'medium'
                            ? 'bg-yellow-50 text-yellow-800'
                            : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {g.complexity}
                    </span>
                  </div>
                  <p className="text-sm text-[#525252] leading-[1.55]">{g.client_scenario}</p>
                </div>
              ))}
            </div>
          </SubSection>

          <SubSection title="C3. Что НЕ повторять из Global">
            <div className="space-y-3">
              {(full.part_c.c3_what_not_to_repeat ?? []).map((l, i) => (
                <div key={i} className="border border-red-200 bg-red-50 rounded p-4">
                  <p className="text-sm font-semibold mb-1">{l.attempt}</p>
                  <p className="text-sm text-[#525252] leading-[1.55] mb-1">
                    <strong>Почему провалили:</strong> {l.why_failed}
                  </p>
                  <p className="text-sm text-[#0a0a0a] leading-[1.55]">
                    <strong>Урок:</strong> {l.lesson}
                  </p>
                </div>
              ))}
            </div>
          </SubSection>
        </Part>

        {/* PART D — Strategy & Roadmap */}
        <Part title="Часть D — Стратегия и Roadmap" badge="📋" id="part-d">
          <SubSection title="D1. Roadmap McKinsey 3H">
            <HorizonBlock title="H1 (0–6 мес) · Защита + fast wins" items={full.part_d.d1_roadmap?.h1} color="rose" />
            <HorizonBlock title="H2 (6–18 мес) · Новые опции" items={full.part_d.d1_roadmap?.h2} color="amber" />
            <HorizonBlock title="H3 (18–36 мес) · Прорывные эксперименты" items={full.part_d.d1_roadmap?.h3} color="green" />
          </SubSection>

          <SubSection title="D2. KPI и метрики успеха (6 мес)">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-[#e5e5e5]">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Метрика</th>
                    <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Цель через 6 мес</th>
                  </tr>
                </thead>
                <tbody>
                  {(full.part_d.d2_kpis ?? []).map((k, i) => (
                    <tr key={i} className="border-b border-[#e5e5e5]">
                      <td className="px-3 py-2 font-medium">{k.name}</td>
                      <td className="px-3 py-2">{k.target_6m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SubSection>

          <SubSection title="D3. Гипотезы для тестирования">
            <div className="space-y-3">
              {(full.part_d.d3_hypotheses ?? []).map((h, i) => (
                <div key={i} className="border border-[#e5e5e5] rounded p-4">
                  <p className="text-sm font-semibold mb-2">{h.statement}</p>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Как тестируем:</strong> {h.test_method}
                    </p>
                    <p>
                      <strong>Сигнал успеха:</strong> {h.success_signal}
                    </p>
                    <p className="text-[#525252]">
                      <strong>Бюджет:</strong> {h.budget_range}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SubSection>
        </Part>

        {/* PART E — AI-автоматизация */}
        <Part title="Часть E — AI-автоматизация" badge="🤖" id="part-e">
          <AutomationBlock label="E1" data={full.part_e.e1_business_process} />
          <AutomationBlock label="E2" data={full.part_e.e2_marketing} />
          <AutomationBlock label="E3" data={full.part_e.e3_niche_specific} />
        </Part>

        {/* PART F — Реализация под ключ (static) */}
        <Part title="Часть F — Реализация под ключ" badge="🛠" id="part-f">
          <p className="text-base leading-[1.65] mb-6">
            Аналитический отчёт даёт стратегию. Если в команде клиента некому исполнять —
            мы закрываем ключевые блоки реализации сами, используя{' '}
            <strong>всю глубину анализа</strong> независимо от того, какой уровень отчёта
            клиент купил. Полный набор УТП, сильных сторон и AI-возможностей применяется
            к работе автоматически.
          </p>
          <div className="grid gap-5 md:grid-cols-2 mb-8">
            <article className="lp-card p-7 page-break-inside-avoid">
              <p className="lp-eyebrow mb-3">F1</p>
              <h3 className="text-lg font-bold mb-3 tracking-[-0.01em]">
                Разработка сайта по критериям отчёта
              </h3>
              <p className="text-sm text-[#525252] leading-[1.6]">
                Лендинг или одностраничник, реализующий бренд-стратегию из Части A6
                (Blue Ocean) и AI-инсайты из Части E — первый экран с УТП, посадочные
                под каналы, формы захвата.
              </p>
            </article>
            <article className="lp-card p-7 page-break-inside-avoid">
              <p className="lp-eyebrow mb-3">F2</p>
              <h3 className="text-lg font-bold mb-3 tracking-[-0.01em]">
                AI-автоматизация под ключ
              </h3>
              <p className="text-sm text-[#525252] leading-[1.6]">
                Чат-боты квалификации, автопостинг по каналам, нишевые автоматизации —
                реализуем roadmap из E1–E3 с привязкой к KPI из D2.
              </p>
            </article>
          </div>
          <Link href="/lead/retainer" className="lp-btn-primary no-print">
            Обсудить ваш проект
            <span aria-hidden>→</span>
          </Link>
        </Part>

        {/* PART G — Sources */}
        <Part title="Часть G — Достоверность и открытые вопросы" badge="📚" id="part-g">
          <SubSection title="G1. Источники с RS-маркировкой">
            <div className="space-y-2">
              {(full.part_g.g1_sources ?? []).map((s, i) => {
                const badge = RS_BADGE[s.rs] ?? RS_BADGE.yellow
                return (
                  <div
                    key={i}
                    className={`border rounded px-3 py-2 text-sm flex gap-3 items-start ${badge.classes}`}
                  >
                    <span className="font-bold text-base shrink-0">{badge.emoji}</span>
                    <div className="flex-1">
                      <p className="leading-[1.5]">{s.description}</p>
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline opacity-75 mt-1 inline-block"
                        >
                          {s.url}
                        </a>
                      )}
                      <p className="text-[10px] uppercase tracking-wider opacity-60 mt-1">
                        {badge.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SubSection>

          <SubSection title="G2. UNVERIFIED — не удалось подтвердить">
            {(full.part_g.g2_unverified ?? []).length > 0 ? (
              <BulletList items={full.part_g.g2_unverified} />
            ) : (
              <p className="text-sm text-[#525252] italic">Все факты cross-source подтверждены.</p>
            )}
          </SubSection>

          <SubSection title="G3. Open questions — на контрольную точку (3 мес)">
            <BulletList items={full.part_g.g3_open_questions} />
          </SubSection>
        </Part>

        {/* PART H — Compliance (static) */}
        <Part title="Часть H — Compliance Disclaimer" badge="⚖️" id="part-h">
          <ul className="space-y-3 text-sm leading-[1.65]">
            <li>
              <strong>152-ФЗ (персональные данные):</strong> в отчёте использованы только
              открытые публичные данные. Персональные данные клиента и сотрудников
              конкурентов не собирались.
            </li>
            <li>
              <strong>149-ФЗ + ГК РФ Art. 1259:</strong> отчёт оперирует фактами (не
              охраняемыми авторским правом), а не воспроизведением текстов конкурентов.
            </li>
            <li>
              <strong>Иноагенты и экстремистские организации:</strong> если упомянуты в
              отчёте — обязательная пометка по требованию РФ-законодательства.
            </li>
            <li>
              <strong>Маркировка рекламы:</strong> рекомендации каналов в Части D2 при
              запуске рекламных кампаний требуют маркировки в ЕРИР.
            </li>
            <li>
              <strong>Об источниках:</strong> анализ построен на бесплатных публичных
              источниках (Wordstat, Я.Тренды, Lighthouse, PageSpeed, открытые отзывы
              Я.Карт/2ГИС, Rusprofile, archive.org) + AI через OpenAI и OpenRouter.
              Платные SaaS-аналитики (Ahrefs, Semrush, Similarweb, Контур.Фокус подписка)
              не использовались. Доступы клиента (GSC, Я.Метрика, CMS) не запрашивались.
            </li>
          </ul>
        </Part>
      </main>
    </>
  )
}

// ─── Helper Components ───────────────────────────────────────────────────────

function Part({
  title,
  badge,
  id,
  children,
}: {
  title: string
  badge: string
  id: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-16 page-break-before">
      <div className="flex items-center gap-3 mb-8 page-break-after-avoid">
        <span className="text-2xl">{badge}</span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] leading-[1.15]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7 page-break-inside-avoid">
      <h3 className="text-lg font-bold mb-3 tracking-[-0.01em]">{title}</h3>
      {children}
    </div>
  )
}

function BulletList({ items, compact = false }: { items?: string[]; compact?: boolean }) {
  if (!items || items.length === 0)
    return <p className="text-sm text-[#737373] italic">—</p>
  return (
    <ul className={compact ? 'space-y-1' : 'space-y-2'}>
      {items.map((item, i) => (
        <li key={i} className={`flex gap-2 ${compact ? 'text-sm' : 'text-[15px]'} leading-[1.55]`}>
          <span className="text-[#1e3a8a] shrink-0 font-bold">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function KV({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid gap-1.5 text-sm border border-[#e5e5e5] rounded p-3 bg-[#fafafa]">
      {children}
    </dl>
  )
}

function KVRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-[#737373] shrink-0 min-w-[140px]">{label}:</dt>
      <dd className="flex-1">{children}</dd>
    </div>
  )
}

function CompetitorCard({
  profile,
  index,
}: {
  profile: FullV2['part_a']['a4']['profiles'][number]
  index: number
}) {
  return (
    <article className="border border-[#e5e5e5] rounded-lg p-5 page-break-inside-avoid">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-[#1e3a8a] font-bold text-xl">{String(index).padStart(2, '0')}</span>
        <h4 className="text-lg font-bold tracking-[-0.01em] flex-1">{profile.name}</h4>
      </div>
      <KV>
        <KVRow label="Позиционирование">{profile.positioning}</KVRow>
        <KVRow label="Сегменты">{profile.segments}</KVRow>
        <KVRow label="Ценообразование">{profile.pricing}</KVRow>
        <KVRow label="Каналы">{profile.channels}</KVRow>
        <KVRow label="Контент-стратегия">{profile.content_strategy}</KVRow>
        <KVRow label="Тех-стек">{profile.tech_stack}</KVRow>
        <KVRow label="Команда и финансы">{profile.team_finance}</KVRow>
        <KVRow label="Тональность отзывов">{profile.reviews_tonality}</KVRow>
        <KVRow label="Recent moves">{profile.recent_moves}</KVRow>
      </KV>

      {profile.scoring && (
        <div className="mt-4">
          <p className="lp-eyebrow mb-2">Скоринг 0–10</p>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {(['offer', 'audience', 'proof', 'creative', 'landing'] as const).map((k) => (
              <div key={k} className="border border-[#e5e5e5] rounded py-2">
                <p className="font-bold text-base">{profile.scoring?.[k] ?? '—'}</p>
                <p className="text-[#737373] uppercase tracking-wider text-[10px]">{k}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 mt-4">
        <div>
          <p className="lp-eyebrow mb-1" style={{ color: '#15803d' }}>
            3 силы
          </p>
          <BulletList items={profile.strengths} compact />
        </div>
        <div>
          <p className="lp-eyebrow lp-eyebrow-warm mb-1">3 слабости</p>
          <BulletList items={profile.weaknesses} compact />
        </div>
      </div>

      {profile.forecast_6m && (
        <p className="text-sm leading-[1.55] mt-3 italic text-[#525252]">
          <strong>Прогноз 6 мес:</strong> {profile.forecast_6m}
        </p>
      )}
    </article>
  )
}

function SwotQuadrant({
  title,
  items,
  color,
}: {
  title: string
  items?: string[]
  color: 'green' | 'red' | 'blue' | 'amber'
}) {
  const colorClasses = {
    green: 'border-green-200 bg-green-50',
    red: 'border-red-200 bg-red-50',
    blue: 'border-blue-200 bg-blue-50',
    amber: 'border-amber-200 bg-amber-50',
  }
  return (
    <div className={`border rounded p-4 page-break-inside-avoid ${colorClasses[color]}`}>
      <p className="text-xs uppercase tracking-wider font-bold mb-2">{title}</p>
      <BulletList items={items} compact />
    </div>
  )
}

function BlueOceanAction({ label, items }: { label: string; items?: string[] }) {
  return (
    <div className="border border-[#1e3a8a]/30 bg-blue-50 rounded p-4 page-break-inside-avoid">
      <p className="text-xs uppercase tracking-wider font-bold text-[#1e3a8a] mb-2">{label}</p>
      <BulletList items={items} compact />
    </div>
  )
}

function HorizonBlock({
  title,
  items,
  color,
}: {
  title: string
  items?: Array<{ action: string; why: string; metric: string; timeline: string }>
  color: 'rose' | 'amber' | 'green'
}) {
  const colorClasses = {
    rose: 'border-rose-200 bg-rose-50',
    amber: 'border-amber-200 bg-amber-50',
    green: 'border-green-200 bg-green-50',
  }
  return (
    <div className={`border rounded-lg p-4 mb-4 page-break-inside-avoid ${colorClasses[color]}`}>
      <h4 className="text-sm font-bold uppercase tracking-wider mb-3">{title}</h4>
      <div className="space-y-3">
        {(items ?? []).map((item, i) => (
          <div key={i} className="bg-white border border-[#e5e5e5] rounded p-3">
            <p className="font-semibold text-sm mb-1">{item.action}</p>
            <p className="text-sm text-[#525252] leading-[1.55] mb-1">
              <strong>Зачем:</strong> {item.why}
            </p>
            <p className="text-sm text-[#525252] leading-[1.55]">
              <strong>Метрика:</strong> {item.metric} · <strong>Сроки:</strong> {item.timeline}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AutomationBlock({
  label,
  data,
}: {
  label: string
  data: FullV2['part_e']['e1_business_process']
}) {
  return (
    <article className="bg-white border border-[#bbf7d0] rounded-lg p-6 mb-6 page-break-inside-avoid">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#15803d] bg-[#dcfce7] rounded px-2 py-1">
          {label}
        </span>
        <h3 className="text-lg font-bold tracking-[-0.01em] flex-1">{data?.title}</h3>
      </div>

      {data?.emotional_argument && (
        <p className="text-[15px] leading-[1.6] italic mb-4">{data.emotional_argument}</p>
      )}

      <SubSection title="Детальный roadmap">
        <BulletList items={data?.detailed_roadmap} />
      </SubSection>

      {data?.roi_estimate && (
        <p className="text-sm leading-[1.55] mb-4">
          <strong>ROI оценка:</strong> {data.roi_estimate}
        </p>
      )}

      {data?.implementation_l2 && (
        <div className="rounded-md border border-[#fbbf24]/40 bg-[#fef3c7]/40 px-4 py-3 mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#92400e] mb-1">
            Реализация под ключ
          </p>
          <p className="text-sm leading-[1.55]">{data.implementation_l2}</p>
        </div>
      )}
    </article>
  )
}

function FullV2PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        .no-print {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
        .page-break-before {
          page-break-before: always;
        }
        .page-break-after-avoid {
          page-break-after: avoid;
        }
        .page-break-inside-avoid {
          page-break-inside: avoid;
        }
        body {
          background: white !important;
        }
        a[href]:after {
          content: '';
        }
      }
      @media screen {
        .print-only {
          display: none;
        }
      }
    `}</style>
  )
}
