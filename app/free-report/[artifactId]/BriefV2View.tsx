'use client'

// BriefV2View — НОВЫЙ компонент краткого отчёта (тестовая версия).
// Доступен через /free-report/[id]?version=v2. Старый отчёт продолжает
// работать по дефолту без query-параметра.
//
// Дизайн: Navigator Pattern — заголовок темы + 1-2 тезиса + список «в полном»
// + опциональная sub-плашка Level 2 «Реализация под ключ». Никаких blur/lock.
// Использует существующие LP-классы (lp-card, lp-eyebrow, lp-btn-primary,
// lp-btn-ghost) без кастомизации токенов.

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SectionV2 {
  id: string
  title: string
  theses: string[]
  in_full: string[]
  implementation_l2?: string | null
  unavailable?: boolean | null
}

interface AutomationBlockV2 {
  emotional_thesis: string
  found_points: Array<{ title: string; description: string }>
  in_full: string
  implementation_l2: string
}

interface BriefV2 {
  intake_quote: string
  executive_preview: string[]
  sections: SectionV2[]
  ai_automation: {
    business_process: AutomationBlockV2
    marketing: AutomationBlockV2
    niche_specific: AutomationBlockV2
  }
}

interface Props {
  artifactId: string
  companyName: string
  industry: string
}

export function BriefV2View({ artifactId, companyName, industry }: Props) {
  const [brief, setBrief] = useState<BriefV2 | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    console.log('Report version: v2')
  }, [])

  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000)
    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch(`/api/brief-v2/${artifactId}`, { method: 'POST' })
        const data = (await res.json().catch(() => ({}))) as {
          brief?: BriefV2
          error?: string
        }
        if (cancelled) return
        if (!res.ok || !data.brief) {
          setError(data.error ?? `HTTP ${res.status}`)
          return
        }
        setBrief(data.brief)
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
  }, [artifactId])

  if (error) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Ошибка генерации v2</p>
        <h2 className="text-2xl font-bold mb-3 tracking-[-0.02em]">
          Не удалось сформировать краткий отчёт v2
        </h2>
        <p className="text-base text-[#525252] max-w-md mx-auto leading-[1.6] mb-2">
          {error}
        </p>
        <p className="text-xs text-[#737373]">
          Это тестовая версия. Откройте страницу без <code>?version=v2</code> чтобы увидеть рабочий вариант.
        </p>
      </section>
    )
  }

  if (!brief) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="lp-eyebrow mb-4">v2 — тестовая версия</p>
        <div className="flex items-center justify-center mb-6">
          <span
            aria-hidden
            className="inline-block w-8 h-8 rounded-full border-2 border-[#e5e5e5] border-t-[#0a0a0a] animate-spin"
          />
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-[-0.02em]">
          Формируем краткий разбор…
        </h2>
        <p className="text-base text-[#525252] max-w-md mx-auto leading-[1.6]">
          Это занимает 20–40 секунд. Прошло {elapsed} сек.
        </p>
      </section>
    )
  }

  return (
    <>
      <BriefV2PrintStyles />

      {/* ── 1. HEADER ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-14 pb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <p className="lp-eyebrow lp-eyebrow-warm">Краткий разбор</p>
          <div className="flex items-center gap-2 no-print">
            <span className="text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-1 rounded bg-[#fef3c7] text-[#92400e]">
              v2 · тестовая версия
            </span>
            <span className="text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-1 rounded bg-[#dbeafe] text-[#1e3a8a]">
              Полный — 9 999 ₽
            </span>
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
          Краткий разбор — {companyName}
        </h1>
        <p className="text-sm text-[#525252] leading-[1.6]">
          {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}
          {' · '}Методология RS 1–5
          {industry ? ` · ${industry}` : ''}
        </p>
        <div className="no-print mt-5">
          <button
            type="button"
            onClick={() => window.print()}
            className="lp-btn-ghost text-sm"
          >
            Скачать PDF
          </button>
        </div>
      </section>

      <div className="border-t border-[#e5e5e5]" />

      {/* ── 2. INTAKE-ЗАПРОС КЛИЕНТА (второй экран) ─────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <p className="lp-eyebrow mb-4">Ваш запрос</p>
        <blockquote className="border-l-4 border-[#1e3a8a] pl-6 py-2 mb-4">
          <p className="text-xl font-medium leading-[1.5] text-[#0a0a0a] italic">
            «{brief.intake_quote}»
          </p>
        </blockquote>
        <p className="text-sm text-[#6b7280] leading-[1.6]">
          Все выводы ниже отталкиваются от вашего запроса.
        </p>
      </section>

      <div className="border-t border-[#e5e5e5]" />

      {/* ── 3. EXECUTIVE PREVIEW ─────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14 bg-[#fafafa]">
        <p className="lp-eyebrow mb-4">Главные выводы</p>
        <h2 className="text-2xl font-bold tracking-[-0.02em] mb-8">
          Что мы увидели, разобравшись в вашей ситуации
        </h2>
        <ul className="space-y-4 max-w-3xl">
          {brief.executive_preview.map((thesis, i) => (
            <li key={i} className="flex gap-4">
              <span className="text-[#1e3a8a] font-bold text-lg shrink-0 leading-tight pt-0.5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-base text-[#0a0a0a] leading-[1.6]">{thesis}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-[#e5e5e5]" />

      {/* ── 4. 11 АНАЛИТИЧЕСКИХ СЕКЦИЙ ─────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <p className="lp-eyebrow mb-4">Разбор по темам</p>
        <h2 className="text-2xl font-bold tracking-[-0.02em] mb-8">
          11 направлений анализа
        </h2>
        <div className="space-y-6">
          {brief.sections.map((s, i) => (
            <SectionCard key={s.id} section={s} index={i + 1} artifactId={artifactId} />
          ))}
        </div>
      </section>

      <div className="border-t border-[#e5e5e5]" />

      {/* ── 5. AI-АВТОМАТИЗАЦИЯ ─────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14 bg-[#f0fdf4]">
        <p className="lp-eyebrow mb-4" style={{ color: '#15803d' }}>
          AI-автоматизация
        </p>
        <h2 className="text-2xl font-bold tracking-[-0.02em] mb-2">
          Где AI даёт вам преимущество прямо сейчас
        </h2>
        <p className="text-sm text-[#525252] leading-[1.6] mb-10 max-w-3xl">
          Три направления автоматизации — для бизнес-процессов, маркетинга и под нишу.
        </p>

        <div className="space-y-8">
          <AutomationCard
            label="5.1"
            title="Автоматизация бизнес-процессов"
            block={brief.ai_automation.business_process}
          />
          <AutomationCard
            label="5.2"
            title="Автоматизация маркетинга"
            block={brief.ai_automation.marketing}
          />
          <AutomationCard
            label="5.3"
            title="Нишевые автоматизации"
            block={brief.ai_automation.niche_specific}
          />
        </div>
      </section>

      <div className="border-t border-[#e5e5e5]" />

      {/* ── 6. ЧТО МЫ ДЕЛАЕМ ПОД КЛЮЧ (Level 2 hub) ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14" id="level2-hub">
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Реализация на нашей стороне</p>
        <h2 className="text-2xl font-bold tracking-[-0.02em] mb-4">
          Если в команде некому исполнять — закроем сами
        </h2>
        <p className="text-base text-[#525252] leading-[1.6] mb-8 max-w-3xl">
          Когда вы выбираете реализацию у нас, мы используем <strong className="text-[#0a0a0a]">всю глубину анализа</strong> —
          даже если вы прочитали только краткий отчёт. Полный набор УТП, сильных сторон и
          стратегических выводов из платного отчёта применяется к работе автоматически.
        </p>
        <div className="grid gap-5 md:grid-cols-2 mb-8">
          <article className="lp-card p-7">
            <p className="lp-eyebrow mb-3">Услуга 1</p>
            <h3 className="text-lg font-bold mb-3 tracking-[-0.01em]">
              Разработка сайта по критериям отчёта
            </h3>
            <p className="text-[15px] text-[#525252] leading-[1.6]">
              Лендинг или одностраничник, который отвечает на бренд-стратегию из отчёта —
              первый экран с УТП, посадочные под канал, формы захвата.
            </p>
          </article>
          <article className="lp-card p-7">
            <p className="lp-eyebrow mb-3">Услуга 2</p>
            <h3 className="text-lg font-bold mb-3 tracking-[-0.01em]">
              AI-автоматизация под ключ
            </h3>
            <p className="text-[15px] text-[#525252] leading-[1.6]">
              Чат-боты квалификации, автопостинг по соцсетям, нишевые автоматизации —
              реализуем то, что разобрано в блоке 5.
            </p>
          </article>
        </div>
        <a href="mailto:hello@ai-strategist.ru" className="lp-btn-primary no-print">
          Обсудить ваш проект
          <span aria-hidden>→</span>
        </a>
      </section>

      <div className="border-t border-[#e5e5e5]" />

      {/* ── 7. БЕСПЛАТНО vs ПЛАТНО (таблица) ──────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14 bg-[#fafafa]">
        <p className="lp-eyebrow mb-4">Что входит куда</p>
        <h2 className="text-2xl font-bold tracking-[-0.02em] mb-8">
          Бесплатный пробник vs Полный отчёт
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-[#e5e5e5] bg-white">
            <thead className="bg-[#f5f5f4]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[#0a0a0a] border-b border-[#e5e5e5] w-1/2">
                  Тема
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[#6b7280] border-b border-[#e5e5e5]">
                  В пробнике
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[#0a0a0a] border-b border-[#e5e5e5]">
                  В полном
                </th>
              </tr>
            </thead>
            <tbody>
              {brief.sections.map((s) => (
                <tr key={s.id} className="border-b border-[#e5e5e5]">
                  <td className="px-4 py-3 text-[#0a0a0a]">{s.title}</td>
                  <td className="px-4 py-3 text-[#6b7280]">обозначение темы</td>
                  <td className="px-4 py-3 text-[#0a0a0a]">раскрытие с фактами</td>
                </tr>
              ))}
              {[
                'AI-автоматизация бизнес-процессов',
                'AI-автоматизация маркетинга',
                'Нишевые автоматизации',
              ].map((t) => (
                <tr key={t} className="border-b border-[#e5e5e5] bg-[#f0fdf4]">
                  <td className="px-4 py-3 text-[#0a0a0a]">{t}</td>
                  <td className="px-4 py-3 text-[#6b7280]">направления</td>
                  <td className="px-4 py-3 text-[#0a0a0a]">roadmap, ROI, инструменты</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 8. CTA-БЛОК Level 1 ─────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="lp-eyebrow mb-4">Полный отчёт</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-10">
            За 9 999 ₽ — полный анализ
          </h2>
          <ul className="text-left max-w-md mx-auto space-y-3 mb-10 text-[15px] text-[#0a0a0a]">
            {brief.sections.map((s) => (
              <li key={s.id} className="flex gap-3">
                <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
                <span>{s.title} — раскрытие с фактами и источниками</span>
              </li>
            ))}
            <li className="flex gap-3">
              <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
              <span>Roadmap AI-автоматизации (бизнес-процессы + маркетинг + нишевые)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
              <span>План действий на 30 / 60 / 90 дней с метриками</span>
            </li>
          </ul>
          <Link
            href={`/api/upgrade-to-paid?artifactId=${artifactId}`}
            className="lp-btn-primary no-print"
          >
            Получить полный анализ
            <span aria-hidden>→</span>
          </Link>
          <p className="text-sm text-[#6b7280] mt-5">
            9 999 ₽ через СБП. Отчёт откроется в браузере сразу после подтверждения оплаты.
          </p>
        </div>
      </section>

      {/* ── 9. FOOTER-CTA Level 2 ───────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5] bg-[#fafafa] no-print">
        <div className="max-w-3xl mx-auto px-6 py-10 text-center">
          <p className="text-sm text-[#525252] leading-[1.6]">
            Хотите сразу к реализации? <a href="#level2-hub" className="text-[#1e3a8a] underline">Обсудим ваш проект →</a>
          </p>
        </div>
      </section>
    </>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionCard({
  section,
  index,
  artifactId,
}: {
  section: SectionV2
  index: number
  artifactId: string
}) {
  return (
    <article className="lp-card p-7 page-break-inside-avoid">
      <div className="flex items-start gap-4 mb-3">
        <span className="text-[#1e3a8a] font-bold text-base shrink-0 leading-tight pt-0.5">
          {String(index).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold tracking-[-0.01em] leading-snug">
            {section.title}
          </h3>
        </div>
      </div>

      {section.unavailable ? (
        <p className="text-sm text-[#92400e] bg-[#fef3c7] border border-[#fde68a] rounded px-3 py-2 leading-[1.55]">
          Доступно при предоставлении данных.
        </p>
      ) : section.theses.length > 0 ? (
        <ul className="space-y-2 mb-5">
          {section.theses.map((t, i) => (
            <li key={i} className="text-[15px] text-[#0a0a0a] leading-[1.6]">
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#6b7280] italic mb-5">
          Тезисы готовятся — подробности в полном отчёте.
        </p>
      )}

      {section.in_full.length > 0 && (
        <div className="border-t border-[#e5e5e5] pt-4">
          <p className="text-xs font-bold text-[#6b7280] uppercase tracking-[0.12em] mb-3">
            В полном отчёте по этой теме
          </p>
          <ul className="space-y-1.5">
            {section.in_full.map((item, i) => (
              <li
                key={i}
                className="text-sm text-[#525252] leading-[1.55] flex gap-2"
              >
                <span className="text-[#a3a3a3] shrink-0">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {section.implementation_l2 && (
        <div className="mt-5 rounded-md border border-[#fbbf24]/40 bg-[#fef3c7]/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#92400e] mb-1">
            Реализация под ключ
          </p>
          <p className="text-sm text-[#0a0a0a] leading-[1.55]">{section.implementation_l2}</p>
        </div>
      )}

      <div className="mt-5 no-print">
        <Link
          href={`/api/upgrade-to-paid?artifactId=${artifactId}`}
          className="text-sm text-[#1e3a8a] font-medium hover:underline"
        >
          Раскрыть в полном →
        </Link>
      </div>
    </article>
  )
}

function AutomationCard({
  label,
  title,
  block,
}: {
  label: string
  title: string
  block: AutomationBlockV2
}) {
  return (
    <article className="bg-white border border-[#bbf7d0] rounded-lg p-7 page-break-inside-avoid">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#15803d] bg-[#dcfce7] rounded px-2 py-1">
          {label}
        </span>
        <h3 className="text-lg font-bold tracking-[-0.01em] leading-snug flex-1">
          {title}
        </h3>
      </div>

      {block.emotional_thesis && (
        <p className="text-[15px] text-[#0a0a0a] leading-[1.6] mb-4 italic">
          {block.emotional_thesis}
        </p>
      )}

      {block.found_points.length > 0 && (
        <div className="space-y-3 mb-4">
          {block.found_points.map((p, i) => (
            <div key={i} className="border-l-2 border-[#15803d] pl-3">
              <p className="text-sm font-semibold text-[#0a0a0a] mb-0.5">{p.title}</p>
              <p className="text-sm text-[#525252] leading-[1.55]">{p.description}</p>
            </div>
          ))}
        </div>
      )}

      {block.in_full && (
        <p className="text-xs text-[#6b7280] leading-[1.55] mb-4">
          <span className="font-bold uppercase tracking-[0.1em]">В полном:</span> {block.in_full}
        </p>
      )}

      {block.implementation_l2 && (
        <div className="rounded-md border border-[#fbbf24]/40 bg-[#fef3c7]/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#92400e] mb-1">
            Реализация под ключ
          </p>
          <p className="text-sm text-[#0a0a0a] leading-[1.55]">{block.implementation_l2}</p>
        </div>
      )}
    </article>
  )
}

function BriefV2PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        .no-print { display: none !important; }
        .page-break-inside-avoid { page-break-inside: avoid; }
        body { background: white !important; }
        section { page-break-inside: avoid; }
        a[href]:after { content: ''; }
      }
    `}</style>
  )
}
