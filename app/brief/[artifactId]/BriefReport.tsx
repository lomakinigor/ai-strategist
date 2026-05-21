import type { BriefReportBlock } from '@/lib/strategy/brief'

const STATUS_STYLE: Record<string, string> = {
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-emerald-800',
}
const STATUS_ICON: Record<string, string> = { red: '🔴', yellow: '🟡', green: '🟢' }

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border border-red-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-gray-50 text-gray-600 border border-gray-200',
}
const PRIORITY_LABEL: Record<string, string> = { high: 'Высокий', medium: 'Средний', low: 'Низкий' }

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
      {children}
    </h2>
  )
}

export function BriefReport({ brief }: { brief: BriefReportBlock }) {
  return (
    <div className="space-y-10">
      {/* 1. Позиция на рынке */}
      {brief.market_position.rows.length > 0 && (
        <section>
          <SectionTitle>Позиция на рынке</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Метрика</th>
                  <th className="pb-2 pr-4 font-medium">Значение</th>
                  <th className="pb-2 pr-4 font-medium">Норма</th>
                  <th className="pb-2 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {brief.market_position.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-gray-900">{row.metric}</td>
                    <td className="py-2 pr-4 font-medium text-gray-900">{row.value}</td>
                    <td className="py-2 pr-4 text-gray-500">{row.norm}</td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[row.status]}`}
                      >
                        {STATUS_ICON[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 2. Критические узкие места */}
      {brief.critical_bottlenecks.length > 0 && (
        <section>
          <SectionTitle>Критические узкие места</SectionTitle>
          <div className="space-y-3">
            {brief.critical_bottlenecks.map((b, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-200 bg-white">
                <span className="flex-shrink-0 text-red-500 font-bold text-lg leading-none mt-0.5">
                  {i + 1}
                </span>
                <div className="space-y-1">
                  <p className="font-medium text-sm text-gray-900">{b.problem}</p>
                  <p className="text-xs font-medium text-gray-500">{b.metric}</p>
                  <p className="text-xs text-gray-500">→ {b.consequence}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Потенциал роста */}
      {brief.growth_potential.rows.length > 0 && (
        <section>
          <SectionTitle>Потенциал роста</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Направление</th>
                  <th className="pb-2 pr-4 font-medium">Потенциал</th>
                  <th className="pb-2 pr-4 font-medium">Срок</th>
                  <th className="pb-2 font-medium">Приоритет</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {brief.growth_potential.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-gray-900">{row.direction}</td>
                    <td className="py-2 pr-4 font-semibold text-emerald-600">{row.potential_pct}</td>
                    <td className="py-2 pr-4 text-gray-500">{row.deadline}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_STYLE[row.priority]}`}
                      >
                        {PRIORITY_LABEL[row.priority]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 4. AI-рычаги */}
      {brief.ai_levers.length > 0 && (
        <section>
          <SectionTitle>AI-автоматизация</SectionTitle>
          <div className="space-y-3">
            {brief.ai_levers.map((lever, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 text-sm"
              >
                <span className="font-semibold text-indigo-700 sm:w-40 flex-shrink-0">
                  {lever.tool}
                </span>
                <span className="text-gray-500 flex-1">→ {lever.automates}</span>
                <span className="font-medium text-gray-900 flex-1">{lever.effect}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{lever.launch_deadline}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Следующие 3 действия */}
      {brief.next_actions.length > 0 && (
        <section>
          <SectionTitle>Следующие 3 действия</SectionTitle>
          <ol className="space-y-3">
            {brief.next_actions.map((action, i) => (
              <li key={i} className="flex gap-4 p-4 rounded-xl border border-gray-200 bg-white">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="space-y-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{action.action}</p>
                  <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                    <span>📅 {action.deadline}</span>
                    <span>👤 {action.owner}</span>
                    <span>📊 {action.kpi}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 6. A/B гипотезы */}
      {brief.ab_hypotheses.length > 0 && (
        <section>
          <SectionTitle>Гипотезы для A/B-теста</SectionTitle>
          <div className="space-y-3">
            {brief.ab_hypotheses.map((h, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-200 bg-white text-sm">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 font-mono text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded">
                    {h.id || `H${i + 1}`}
                  </span>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{h.hypothesis}</p>
                    <p className="text-xs text-gray-500">
                      Метрика: <span className="font-medium">{h.metric}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Метод: {h.test_method} · Срок: {h.deadline}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
