// /admin/usage — дашборд использования приложения.
// Сверху: воронка intake → brief → full → PDF в процентах.
// Гистограмма «время возврата за полным после краткого» (горизонтальные бары).
// Топ ниш по числу intake (горизонтальные бары).
// Таблица: последние 50 компаний с временами и Δ.

import Link from 'next/link'
import {
  getFunnelStats,
  getReturnTimeBuckets,
  getCompanyUsageRows,
  getTopIndustries,
  type FunnelStats,
  type ReturnTimeBucket,
  type CompanyUsageRow,
  type IndustryStat,
} from '@/lib/usage/queries'

export const dynamic = 'force-dynamic'

function fmtDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(sec: number | null): string {
  if (sec === null) return '—'
  if (sec < 60) return `${Math.round(sec)} сек`
  if (sec < 3600) return `${Math.round(sec / 60)} мин`
  if (sec < 86400) {
    const h = Math.floor(sec / 3600)
    const m = Math.round((sec % 3600) / 60)
    return m > 0 ? `${h} ч ${m} мин` : `${h} ч`
  }
  const d = Math.floor(sec / 86400)
  const h = Math.round((sec % 86400) / 3600)
  return h > 0 ? `${d} дн ${h} ч` : `${d} дн`
}

function fmtPct(p: number): string {
  return p.toFixed(1) + '%'
}

export default async function AdminUsagePage() {
  const [funnel, returnBuckets, companies, industries] = await Promise.all([
    getFunnelStats(),
    getReturnTimeBuckets(),
    getCompanyUsageRows(50),
    getTopIndustries(10),
  ])

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <p className="lp-eyebrow lp-eyebrow-warm mb-2">Этап 1.2 admin-панели</p>
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Использование приложения</h1>
        <p className="text-sm text-[#525252] mt-2">
          Воронка от intake до скачивания PDF и поведенческие метрики возврата клиентов.
        </p>
      </div>

      {/* Funnel */}
      <FunnelWidget funnel={funnel} />

      {/* Histogram */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Время возврата за полным после краткого</h2>
        <p className="text-sm text-[#525252] mb-4">
          Сколько проходит между первым просмотром брифа и первым просмотром полного отчёта одной компанией.
        </p>
        <ReturnHistogram buckets={returnBuckets} />
      </section>

      {/* Top industries */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Топ ниш по числу intake</h2>
        <IndustriesChart industries={industries} totalIntake={funnel.intakeCount} />
      </section>

      {/* Company timeline table */}
      <section>
        <h2 className="text-xl font-bold mb-4">Последние {companies.length} компаний</h2>
        {companies.length === 0 ? (
          <p className="text-sm text-[#737373] italic">
            Ещё нет компаний с зарегистрированными событиями. Запусти один intake → дойди до полного отчёта.
          </p>
        ) : (
          <div className="overflow-x-auto border border-[#e5e5e5] rounded">
            <table className="w-full text-sm">
              <thead className="bg-[#fafafa]">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Дата intake</th>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Компания</th>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Tier</th>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Краткий ✓</th>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Полный ✓</th>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Δ (бриф→полный)</th>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">PDF</th>
                  <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Job</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c: CompanyUsageRow) => (
                  <tr key={c.researchJobId} className="border-b border-[#f1f5f9]">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(c.intakeAt)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{c.companyName ?? '—'}</div>
                      <div className="text-xs text-[#737373]">{c.industry ?? ''}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          c.tier === 'paid'
                            ? 'bg-green-50 text-green-800'
                            : c.tier === 'retainer'
                              ? 'bg-purple-50 text-purple-800'
                              : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {c.tier ?? 'free'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[#525252]">
                      {c.briefFirstViewedAt ? `✓ ${fmtDate(c.briefFirstViewedAt)}` : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[#525252]">
                      {c.fullFirstViewedAt ? `✓ ${fmtDate(c.fullFirstViewedAt)}` : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {c.briefToFullSec !== null && c.briefToFullSec >= 0 ? (
                        <span
                          className={`font-medium ${
                            c.briefToFullSec < 60 * 60
                              ? 'text-green-700'
                              : c.briefToFullSec < 24 * 60 * 60
                                ? 'text-amber-700'
                                : 'text-[#525252]'
                          }`}
                        >
                          {fmtDuration(c.briefToFullSec)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">{c.pdfDownloadedAt ? '📄' : '—'}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/research/${c.researchJobId}/report?version=v2`}
                        className="text-xs text-[#1e3a8a] hover:underline font-mono"
                      >
                        {c.researchJobId.slice(0, 8)}…
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
        События пишутся при mount компонента (один раз на сессию) и при клике «Скачать PDF».
        Если клиент перезагружает страницу — события пишутся повторно, но в воронке учитываются как один просмотр (DISTINCT по research_job_id).
      </p>
    </main>
  )
}

function FunnelWidget({ funnel }: { funnel: FunnelStats }) {
  const steps = [
    { label: 'Intake', count: funnel.intakeCount, pctFromPrev: null as number | null },
    { label: 'Бриф открыт', count: funnel.briefViewedCount, pctFromPrev: funnel.intakeToBriefPct },
    { label: 'Полный открыт', count: funnel.fullViewedCount, pctFromPrev: funnel.briefToFullPct },
    { label: 'PDF скачан', count: funnel.pdfDownloadedCount, pctFromPrev: funnel.fullToPdfPct },
  ]
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-4">Воронка</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((s, i) => (
          <article key={s.label} className="border border-[#e5e5e5] rounded p-4 bg-[#fafafa]">
            <p className="text-[11px] uppercase tracking-wider font-bold text-[#737373] mb-1">
              {i + 1}. {s.label}
            </p>
            <p className="text-3xl font-bold tracking-[-0.01em]">{s.count}</p>
            {s.pctFromPrev !== null && (
              <p className="text-xs text-[#525252] mt-1">{fmtPct(s.pctFromPrev)} от предыдущего шага</p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

function ReturnHistogram({ buckets }: { buckets: ReturnTimeBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <div className="space-y-2">
      {buckets.map((b) => {
        const widthPct = (b.count / max) * 100
        const isNotReturned = b.upperBoundSec === null
        return (
          <div key={b.label} className="flex items-center gap-3">
            <div className="w-44 text-sm shrink-0 text-[#525252]">{b.label}</div>
            <div className="flex-1 bg-[#f1f5f9] rounded h-7 relative overflow-hidden">
              <div
                className={`h-full ${isNotReturned ? 'bg-red-300' : 'bg-[#1e3a8a]'}`}
                style={{ width: `${widthPct}%` }}
              />
              <div className="absolute inset-0 flex items-center px-3 text-xs font-semibold">
                {b.count > 0 ? b.count : ''}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function IndustriesChart({ industries, totalIntake }: { industries: IndustryStat[]; totalIntake: number }) {
  if (industries.length === 0) {
    return <p className="text-sm text-[#737373] italic">Нет данных по нишам.</p>
  }
  const max = Math.max(1, ...industries.map((i) => i.intakeCount))
  return (
    <div className="space-y-2">
      {industries.map((i) => {
        const widthPct = (i.intakeCount / max) * 100
        const sharePct = totalIntake > 0 ? (i.intakeCount / totalIntake) * 100 : 0
        return (
          <div key={i.industry} className="flex items-center gap-3">
            <div className="w-44 text-sm shrink-0 text-[#525252] truncate" title={i.industry}>
              {i.industry}
            </div>
            <div className="flex-1 bg-[#f1f5f9] rounded h-7 relative overflow-hidden">
              <div className="h-full bg-amber-300" style={{ width: `${widthPct}%` }} />
              <div className="absolute inset-0 flex items-center px-3 text-xs font-semibold">
                {i.intakeCount} · {fmtPct(sharePct)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
