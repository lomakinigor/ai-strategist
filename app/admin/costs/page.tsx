// /admin/costs — дашборд стоимости pipeline.
// Шапка: 4 KPI (за сегодня / 7д / 30д / всё) в ₽ + USD.
// Виджет баланса OpenRouter с алертом при остатке < $5.
// Таблица: разбивка по этапам (всё время).
// Таблица: последние 30 jobs с разбивкой.

import Link from 'next/link'
import {
  getTotalsForPeriod,
  getStageBreakdown,
  getJobsBreakdown,
  getOpenRouterBalance,
  type PeriodTotals,
  type StageBreakdown,
  type JobBreakdown,
} from '@/lib/cost/queries'
import { getUsdRubRate } from '@/lib/cost/rates'

export const dynamic = 'force-dynamic'

const STAGE_LABEL: Record<string, string> = {
  intake_parse: 'Парсинг intake',
  intake_scanner: 'Сканер intake (OCR)',
  research_business: 'Research · Бизнес',
  research_market: 'Research · Рынок',
  research_audience: 'Research · Аудитория',
  research_channels: 'Research · Каналы',
  research_competitors: 'Research · Конкуренты',
  research_site_marketing: 'Research · Маркетинг сайта',
  research_competitor_single: 'Research · Глубокий по 1 конкуренту',
  brief_v1: 'Краткий отчёт v1',
  brief_v2: 'Краткий отчёт v2',
  full_v1: 'Полный отчёт v1',
  full_v2_part_1: 'Полный v2 · Часть 1 (Exec+A1+A2)',
  full_v2_part_2: 'Полный v2 · Часть 2 (A3+A5)',
  full_v2_part_3: 'Полный v2 · Часть 3 (A4 Competitors)',
  full_v2_part_4: 'Полный v2 · Часть 4 (B+C)',
  full_v2_part_5: 'Полный v2 · Часть 5 (D)',
  full_v2_part_6: 'Полный v2 · Часть 6 (E AI)',
  full_v2_part_7: 'Полный v2 · Часть 7 (A6 Blue Ocean)',
  full_v2_part_8: 'Полный v2 · Часть 8 (G Sources)',
}

function stageLabel(stage: string): string {
  return STAGE_LABEL[stage] ?? stage
}

function fmtRub(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₽'
}

function fmtUsd(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function fmtDate(d: Date): string {
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default async function AdminCostsPage() {
  const [today, week, month, allTime, stageBreakdown, jobsBreakdown, balance, usdRubRate] = await Promise.all([
    getTotalsForPeriod(1),
    getTotalsForPeriod(7),
    getTotalsForPeriod(30),
    getTotalsForPeriod(null),
    getStageBreakdown(null),
    getJobsBreakdown(30),
    getOpenRouterBalance(),
    getUsdRubRate(),
  ])

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      {/* Заголовок */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="lp-eyebrow lp-eyebrow-warm mb-2">Этап 1.1 admin-панели</p>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">Стоимость pipeline</h1>
          <p className="text-sm text-[#525252] mt-2">
            Курс конвертации USD→₽ на момент записи фиксируется. Текущий курс ЦБ: <strong>{usdRubRate.toFixed(2)} ₽/$</strong>.
          </p>
        </div>
        <div className="text-xs text-[#737373] text-right">
          Данные обновляются при каждом открытии страницы.
        </div>
      </div>

      {/* OpenRouter balance widget */}
      <BalanceWidget balance={balance} />

      {/* 4 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard label="Сегодня (24ч)" totals={today} />
        <KpiCard label="7 дней" totals={week} />
        <KpiCard label="30 дней" totals={month} />
        <KpiCard label="Всё время" totals={allTime} />
      </div>

      {/* Stage breakdown */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Разбивка по этапам (всё время)</h2>
        {stageBreakdown.length === 0 ? (
          <p className="text-sm text-[#737373] italic">Пока нет записей. Запусти любой intake — данные появятся.</p>
        ) : (
          <div className="overflow-x-auto border border-[#e5e5e5] rounded">
            <table className="w-full text-sm">
              <thead className="bg-[#fafafa]">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Этап</th>
                  <th className="text-right px-3 py-2 border-b border-[#e5e5e5]">Вызовов</th>
                  <th className="text-right px-3 py-2 border-b border-[#e5e5e5]">Токены (in / out)</th>
                  <th className="text-right px-3 py-2 border-b border-[#e5e5e5]">USD</th>
                  <th className="text-right px-3 py-2 border-b border-[#e5e5e5]">₽</th>
                </tr>
              </thead>
              <tbody>
                {stageBreakdown.map((s: StageBreakdown) => (
                  <tr key={s.stage} className="border-b border-[#f1f5f9]">
                    <td className="px-3 py-2 font-medium">{stageLabel(s.stage)}</td>
                    <td className="px-3 py-2 text-right">{s.callsCount}</td>
                    <td className="px-3 py-2 text-right text-[#525252]">
                      {fmtTokens(s.totalPromptTokens)} / {fmtTokens(s.totalCompletionTokens)}
                    </td>
                    <td className="px-3 py-2 text-right">{fmtUsd(s.totalUsd)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtRub(s.totalRub)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Jobs breakdown */}
      <section>
        <h2 className="text-xl font-bold mb-4">Последние {jobsBreakdown.length} research-jobs</h2>
        {jobsBreakdown.length === 0 ? (
          <p className="text-sm text-[#737373] italic">
            Пока нет jobs с зарегистрированными вызовами. (Вызовы intake_parse без research_job не показываются здесь —
            их видно в «Разбивке по этапам» выше.)
          </p>
        ) : (
          <div className="overflow-x-auto border border-[#e5e5e5] rounded">
            <table className="w-full text-sm">
              <thead className="bg-[#fafafa]">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Дата</th>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Компания</th>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Tier</th>
                  <th className="text-right px-3 py-2 border-b border-[#e5e5e5]">Вызовов</th>
                  <th className="text-right px-3 py-2 border-b border-[#e5e5e5]">USD</th>
                  <th className="text-right px-3 py-2 border-b border-[#e5e5e5]">₽</th>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Job ID</th>
                </tr>
              </thead>
              <tbody>
                {jobsBreakdown.map((j: JobBreakdown) => (
                  <tr key={j.researchJobId} className="border-b border-[#f1f5f9]">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(j.firstCallAt)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{j.companyName ?? '—'}</div>
                      <div className="text-xs text-[#737373]">{j.industry ?? ''}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          j.tier === 'paid'
                            ? 'bg-green-50 text-green-800'
                            : j.tier === 'retainer'
                              ? 'bg-purple-50 text-purple-800'
                              : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {j.tier ?? 'free'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{j.callsCount}</td>
                    <td className="px-3 py-2 text-right">{fmtUsd(j.totalUsd)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtRub(j.totalRub)}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/research/${j.researchJobId}/report?version=v2`}
                        className="text-xs text-[#1e3a8a] hover:underline font-mono"
                      >
                        {j.researchJobId.slice(0, 8)}…
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-[#737373] mt-8 italic">
        Стоимости берутся из ответа OpenRouter (usage.cost) когда доступно, иначе считаются по pricing.ts на основе токенов и модели.
        OpenAI direct (research) — расчёт по pricing.ts (нет публичного credits API через secret key).
      </p>
    </main>
  )
}

function KpiCard({ label, totals }: { label: string; totals: PeriodTotals }) {
  return (
    <article className="border border-[#e5e5e5] rounded p-4 bg-[#fafafa]">
      <p className="text-[11px] uppercase tracking-wider font-bold text-[#737373] mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-[-0.01em]">{fmtRub(totals.totalRub)}</p>
      <p className="text-xs text-[#525252] mt-1">
        {fmtUsd(totals.totalUsd)} · {totals.callsCount} вызовов
      </p>
      <p className="text-[10px] text-[#737373] mt-1">
        {fmtTokens(totals.totalPromptTokens)} in / {fmtTokens(totals.totalCompletionTokens)} out
      </p>
    </article>
  )
}

function BalanceWidget({
  balance,
}: {
  balance: { totalCredits: number; totalUsage: number; remaining: number } | null
}) {
  if (!balance) {
    return (
      <div className="border border-yellow-200 bg-yellow-50 rounded p-4 mb-6 text-sm">
        Баланс OpenRouter недоступен (нет ключа или сеть). Проверь через{' '}
        <a
          href="https://openrouter.ai/credits"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          openrouter.ai/credits
        </a>.
      </div>
    )
  }

  const isLow = balance.remaining < 5
  const isCritical = balance.remaining < 1
  const bg = isCritical ? 'bg-red-50 border-red-200' : isLow ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
  const emoji = isCritical ? '🔴' : isLow ? '🟡' : '🟢'

  return (
    <div className={`border rounded p-4 mb-6 ${bg}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold mb-1">Баланс OpenRouter {emoji}</p>
          <p className="text-xl font-bold">
            ${balance.remaining.toFixed(2)} осталось из ${balance.totalCredits.toFixed(2)}
          </p>
          <p className="text-xs text-[#525252] mt-1">
            Потрачено: ${balance.totalUsage.toFixed(2)}
          </p>
        </div>
        <a
          href="https://openrouter.ai/credits"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-btn-ghost text-xs"
        >
          Пополнить →
        </a>
      </div>
      {isLow && (
        <p className="text-xs mt-3">
          {isCritical
            ? 'Баланс на нуле — генерация отчётов будет падать с 402. Пополнить срочно.'
            : 'Баланс заканчивается. Рекомендуется пополнить до начала тестов.'}
        </p>
      )}
    </div>
  )
}
