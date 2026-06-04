'use client'

import type { BriefReportBlock } from '@/lib/strategy/brief'
import {
  deriveKpis,
  statusCounts,
  growthChartData,
  lighthouseBars,
  type LighthouseScores,
} from '@/lib/strategy/brief-derive'
import { CountUp, Reveal, StatusDoughnut, GrowthBar, ScoreBar } from './briefVisuals'

const STATUS_COLOR: Record<string, string> = {
  green: '#00d4aa',
  yellow: '#f5a623',
  red: '#ff6b6b',
}
const STATUS_TAG: Record<string, string> = {
  green: 'bg-[#00d4aa]/12 text-[#00d4aa] border-[#00d4aa]/30',
  yellow: 'bg-[#f5a623]/12 text-[#f5a623] border-[#f5a623]/30',
  red: 'bg-[#ff6b6b]/12 text-[#ff6b6b] border-[#ff6b6b]/30',
}
const STATUS_WORD: Record<string, string> = { green: 'норма', yellow: 'внимание', red: 'критично' }

const PRIORITY: Record<string, { label: string; tag: string }> = {
  high: { label: 'Высокий', tag: 'bg-[#00d4aa]/12 text-[#00d4aa] border-[#00d4aa]/30' },
  medium: { label: 'Средний', tag: 'bg-[#5b9cf6]/12 text-[#5b9cf6] border-[#5b9cf6]/30' },
  low: { label: 'Низкий', tag: 'bg-white/5 text-[#8888a0] border-white/10' },
}

function SectionHeader({ n, title, badge }: { n: string; title: string; badge?: string }) {
  return (
    <div className="flex items-baseline gap-3.5 mb-7 pb-3.5 border-b border-white/10">
      <span className="font-mono text-[10px] tracking-[0.14em] text-[#00d4aa]/70">{n}</span>
      <h2 className="text-xl font-bold tracking-tight text-[#e8e8f0]">{title}</h2>
      {badge && (
        <span className="ml-auto px-2.5 py-0.5 rounded-full text-[10px] tracking-[0.07em] bg-[#00d4aa]/12 text-[#00d4aa] border border-[#00d4aa]/30">
          {badge}
        </span>
      )}
    </div>
  )
}

export function BriefReport({
  brief,
  lighthouse,
}: {
  brief: BriefReportBlock
  lighthouse?: LighthouseScores | null
}) {
  const kpis = deriveKpis(brief.market_position)
  const counts = statusCounts(brief.market_position)
  const growth = growthChartData(brief.growth_potential)
  const totalMetrics = counts.green + counts.yellow + counts.red
  const lhBars = lighthouseBars(lighthouse)

  return (
    <div className="space-y-16">
      {/* ── 1. Позиция на рынке: KPI + doughnut ─────────────────────────────── */}
      {kpis.length > 0 && (
        <Reveal>
          <section className="nr-sec">
            <SectionHeader n="01" title="Позиция на рынке" badge={`${totalMetrics} метрик`} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* doughnut «здоровье» */}
              <div className="nr-card p-5 flex flex-col">
                <p className="nr-eyebrow mb-1">Здоровье позиции</p>
                <StatusDoughnut counts={counts} />
                <p className="text-center text-xs text-[#8888a0] mt-2">
                  <span className="text-[#00d4aa] font-semibold">{counts.green}</span> из {totalMetrics} в
                  норме
                </p>
              </div>
              {/* KPI-карточки */}
              {kpis.map((k, i) => (
                <div
                  key={i}
                  className="nr-card nr-kpi p-5"
                  style={{ ['--ac' as string]: STATUS_COLOR[k.status] }}
                >
                  <p className="nr-eyebrow mb-2.5">{k.label}</p>
                  <div
                    className="text-4xl font-extrabold leading-none tracking-tight tabular-nums"
                    style={{ color: STATUS_COLOR[k.status] }}
                  >
                    <CountUp value={k.value} prefix={k.prefix} suffix={k.suffix} raw={k.rawValue} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-[#8888a0]">норма: {k.norm}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_TAG[k.status]}`}
                    >
                      {STATUS_WORD[k.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Lighthouse сайта клиента — 4 шкалы (PageSpeed, RS4-факт) */}
            {lhBars.length > 0 && (
              <div className="nr-card p-5 mt-4">
                <p className="nr-eyebrow mb-4 text-[#8888a0]">
                  Lighthouse — техническое качество сайта
                </p>
                <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
                  {lhBars.map((b) => (
                    <ScoreBar key={b.label} label={b.label} value={b.value} color={b.color} />
                  ))}
                </div>
                <p className="text-xs text-[#8888a0] mt-5 leading-relaxed">
                  Оценка Google PageSpeed (0–100): 90+ — хорошо, 50–89 — средне, ниже 50 — требует
                  доработки.
                </p>
              </div>
            )}
          </section>
        </Reveal>
      )}

      {/* ── 2. Критические узкие места ──────────────────────────────────────── */}
      {brief.critical_bottlenecks.length > 0 && (
        <Reveal>
          <section className="nr-sec">
            <SectionHeader
              n="02"
              title="Критические узкие места"
              badge={`${brief.critical_bottlenecks.length} шт.`}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brief.critical_bottlenecks.map((b, i) => (
                <div key={i} className="nr-card p-5">
                  <div className="text-2xl mb-2.5">⚠️</div>
                  <h3 className="text-sm font-bold text-[#e8e8f0] leading-snug mb-2">{b.problem}</h3>
                  <div className="nr-mono inline-block px-2.5 py-1 rounded-md bg-[#ff6b6b]/12 text-[#ff6b6b] text-[11px] mb-2.5">
                    {b.metric}
                  </div>
                  <p className="text-xs text-[#8888a0] leading-relaxed">→ {b.consequence}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* ── 3. Конкурентная картина: компактные профили + паттерны + белые пятна ── */}
      {brief.competitor_landscape.competitors.length > 0 && (
        <Reveal>
          <section className="nr-sec">
            <SectionHeader
              n="03"
              title="Конкурентная картина"
              badge={`${brief.competitor_landscape.competitors.length} конкурента`}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brief.competitor_landscape.competitors.map((c, i) => (
                <div key={i} className="nr-card p-5">
                  <h3 className="text-sm font-bold text-[#e8e8f0] leading-snug mb-2.5">{c.name}</h3>
                  <p className="text-xs text-[#8888a0] leading-relaxed mb-3">{c.focus}</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="nr-mono px-2 py-0.5 rounded bg-[#00d4aa]/12 text-[#00d4aa] border border-[#00d4aa]/30 text-[10px] shrink-0">
                        сила
                      </span>
                      <p className="text-xs text-[#e8e8f0] leading-snug">{c.strength}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="nr-mono px-2 py-0.5 rounded bg-[#ff6b6b]/12 text-[#ff6b6b] border border-[#ff6b6b]/25 text-[10px] shrink-0">
                        слабость
                      </span>
                      <p className="text-xs text-[#e8e8f0] leading-snug">{c.weakness}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(brief.competitor_landscape.patterns.length > 0 ||
              brief.competitor_landscape.white_spots.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                {brief.competitor_landscape.patterns.length > 0 && (
                  <div className="nr-card p-5">
                    <p className="nr-eyebrow mb-3 text-[#5b9cf6]">Общие паттерны</p>
                    <ul className="space-y-2">
                      {brief.competitor_landscape.patterns.map((p, i) => (
                        <li key={i} className="text-xs text-[#e8e8f0] leading-relaxed flex gap-2">
                          <span className="text-[#5b9cf6] shrink-0">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {brief.competitor_landscape.white_spots.length > 0 && (
                  <div className="nr-card p-5">
                    <p className="nr-eyebrow mb-3" style={{ color: '#c084fc' }}>
                      Белые пятна — зона отстройки
                    </p>
                    <ul className="space-y-2">
                      {brief.competitor_landscape.white_spots.map((w, i) => (
                        <li key={i} className="text-xs text-[#e8e8f0] leading-relaxed flex gap-2">
                          <span style={{ color: '#c084fc' }} className="shrink-0">★</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </Reveal>
      )}

      {/* ── 4. Потенциал роста: bar + список ────────────────────────────────── */}
      {brief.growth_potential.rows.length > 0 && (
        <Reveal>
          <section className="nr-sec">
            <SectionHeader n="04" title="Потенциал роста" />
            <div className="grid gap-5 lg:grid-cols-2">
              {growth.length > 0 && (
                <div className="nr-card p-5">
                  <p className="nr-eyebrow mb-4">Потенциал по направлениям</p>
                  <GrowthBar points={growth} />
                </div>
              )}
              <div className="nr-card overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="nr-th">Направление</th>
                      <th className="nr-th">Потенциал</th>
                      <th className="nr-th">Срок</th>
                      <th className="nr-th">Приоритет</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brief.growth_potential.rows.map((r, i) => (
                      <tr key={i} className="nr-tr">
                        <td className="nr-td text-[#e8e8f0]">{r.direction}</td>
                        <td className="nr-td nr-mono text-[#00d4aa] font-bold">{r.potential_pct}</td>
                        <td className="nr-td text-[#8888a0]">{r.deadline}</td>
                        <td className="nr-td">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${PRIORITY[r.priority]?.tag ?? PRIORITY.low.tag}`}
                          >
                            {PRIORITY[r.priority]?.label ?? r.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-[#8888a0] mt-3 leading-relaxed">
              «Срок» — ориентировочное время, за которое направление можно внедрить и получить
              указанный прирост. Например, «30 дней» — результат примерно через месяц после старта
              работ, «14 дней» — через две недели.
            </p>
          </section>
        </Reveal>
      )}

      {/* ── 5. AI-автоматизация: before → after ─────────────────────────────── */}
      {brief.ai_levers.length > 0 && (
        <Reveal>
          <section className="nr-sec">
            <SectionHeader n="05" title="AI-автоматизация" badge="рычаги роста" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brief.ai_levers.map((lever, i) => (
                <div key={i} className="nr-card nr-aic p-6">
                  <span className="nr-ghost-num">{i + 1}</span>
                  <p className="nr-eyebrow mb-3" style={{ color: '#c084fc' }}>
                    AI-рычаг
                  </p>
                  <h3 className="text-base font-bold text-[#e8e8f0] mb-3">{lever.tool}</h3>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="nr-mono px-2.5 py-1 rounded-md bg-[#ff6b6b]/12 text-[#ff6b6b] border border-[#ff6b6b]/25 text-[11px]">
                      вручную
                    </span>
                    <span className="text-[#44445a]">→</span>
                    <span className="nr-mono px-2.5 py-1 rounded-md bg-[#00d4aa]/12 text-[#00d4aa] border border-[#00d4aa]/30 text-[11px]">
                      авто
                    </span>
                  </div>
                  <p className="text-xs text-[#8888a0] leading-relaxed mb-3">{lever.automates}</p>
                  <div className="nr-savings text-xs text-[#8888a0]">
                    Эффект: <b className="text-[#00d4aa] font-semibold">{lever.effect}</b>
                  </div>
                  <p className="text-[11px] text-[#44445a] mt-3">Запуск: {lever.launch_deadline}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* ── 6. Следующие 3 действия: timeline ───────────────────────────────── */}
      {brief.next_actions.length > 0 && (
        <Reveal>
          <section className="nr-sec">
            <SectionHeader n="06" title="Следующие действия" badge="дорожная карта" />
            <div className="nr-timeline">
              {brief.next_actions.map((a, i) => (
                <div key={i} className="nr-ti">
                  <span className="nr-tdot" />
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#00d4aa] mb-1.5">
                    Шаг {i + 1} · {a.deadline}
                  </p>
                  <h3 className="text-[15px] font-bold text-[#e8e8f0] mb-2.5">{a.action}</h3>
                  <div className="flex gap-x-5 gap-y-1.5 flex-wrap text-xs text-[#8888a0]">
                    <span>👤 {a.owner}</span>
                    <span>📊 {a.kpi}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}
    </div>
  )
}
