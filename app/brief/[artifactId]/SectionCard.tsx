import type { BriefSection, SectionId } from './parser'

const SECTION_META: Record<SectionId, { label: string; icon: string; accent: string; bg: string; border: string; iconBg: string }> = {
  snapshot: { label: 'Executive Snapshot', icon: '⚡', accent: 'text-indigo-700', bg: 'bg-indigo-50/60', border: 'border-indigo-200', iconBg: 'bg-indigo-100' },
  business: { label: 'Бизнес', icon: '🏢', accent: 'text-blue-700', bg: 'bg-blue-50/40', border: 'border-blue-100', iconBg: 'bg-blue-100' },
  market: { label: 'Рынок', icon: '📊', accent: 'text-purple-700', bg: 'bg-purple-50/40', border: 'border-purple-100', iconBg: 'bg-purple-100' },
  audience: { label: 'Аудитория', icon: '👥', accent: 'text-orange-700', bg: 'bg-orange-50/40', border: 'border-orange-100', iconBg: 'bg-orange-100' },
  channels: { label: 'Каналы', icon: '📡', accent: 'text-teal-700', bg: 'bg-teal-50/40', border: 'border-teal-100', iconBg: 'bg-teal-100' },
  competitors: { label: 'Конкуренты', icon: '⚔️', accent: 'text-rose-700', bg: 'bg-rose-50/40', border: 'border-rose-100', iconBg: 'bg-rose-100' },
  strategy: { label: 'Стратегия', icon: '🎯', accent: 'text-emerald-700', bg: 'bg-emerald-50/40', border: 'border-emerald-100', iconBg: 'bg-emerald-100' },
  other: { label: 'Прочее', icon: '📄', accent: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', iconBg: 'bg-gray-100' },
}

export function SectionCard({ section, index }: { section: BriefSection; index: number }) {
  const meta = SECTION_META[section.id]

  return (
    <article
      className={`group brief-section relative rounded-2xl border ${meta.border} ${meta.bg} p-6 sm:p-8 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div
          className={`flex-shrink-0 w-11 h-11 rounded-xl ${meta.iconBg} flex items-center justify-center text-xl shadow-sm`}
          aria-hidden
        >
          {meta.icon}
        </div>
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${meta.accent}`}>
            {section.id === 'snapshot' ? 'Краткий обзор · 10 секунд' : `Раздел ${index}`}
          </p>
          <h2 className="text-xl font-bold text-gray-900 leading-tight mt-0.5">
            {section.title || meta.label}
          </h2>
        </div>
      </div>

      {/* ВЫВОД */}
      {section.vivod && (
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
            Вывод
          </p>
          <p className="text-[15px] font-medium text-gray-900 leading-relaxed">
            {section.vivod}
          </p>
        </div>
      )}

      {/* Facts */}
      {section.facts.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
            Факты
          </p>
          <ul className="space-y-2">
            {section.facts.map((fact, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] text-gray-700 leading-relaxed">
                <span className={`flex-shrink-0 mt-2 w-1.5 h-1.5 rounded-full ${meta.iconBg.replace('bg-', 'bg-').replace('-100', '-400')}`} aria-hidden />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ДЕЙСТВИЕ */}
      {section.action && (
        <div className="mt-5 pt-5 border-t border-gray-100/60">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
                Действие
              </p>
              <p className="text-[14px] font-medium text-gray-900 leading-relaxed">
                {section.action}
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
