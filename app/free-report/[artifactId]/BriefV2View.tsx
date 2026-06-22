'use client'

// BriefV2View (v3 итерация) — НОВЫЙ компонент краткого отчёта (тестовая версия).
// Доступен через /free-report/[id]?version=v2. Старый отчёт продолжает работать
// по дефолту без query-параметра.
//
// Структура: 4 Navigator-карточки (Части A/B/C/D из полного) + 3 AI-подблока +
// блок реализации + free/paid таблица + CTA Level 1 + footer Level 2 + disclaimer.
//
// Дизайн: existing LP-классы (lp-card, lp-eyebrow, lp-btn-primary, lp-btn-ghost),
// без кастомизации shadcn/токенов. Никаких blur/lock-эффектов.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trackUsage } from '@/lib/usage/client'

interface AutomationBlockV2 {
  emotional_thesis: string
  found_points: Array<{ title: string; description: string }>
  in_full: string
  implementation_l2: string
}

interface BriefV2 {
  intake_quote: string
  executive_preview: string[]
  part_a_theses: string[]
  part_b_theses: string[]
  part_c_theses: string[]
  part_d_theses: string[]
  implementation_l2_hints: {
    part_a?: string | null
    part_c?: string | null
    part_d?: string | null
  }
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

// Кеш-ключ бампается с каждой итерацией структуры, чтобы инвалидировать
// сохранённые в браузере данные старой формы.
const CACHE_KEY = (artifactId: string) => `brief_v2_v3_${artifactId}`

function readCache(artifactId: string): BriefV2 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY(artifactId))
    if (!raw) return null
    return JSON.parse(raw) as BriefV2
  } catch {
    return null
  }
}

function writeCache(artifactId: string, brief: BriefV2): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY(artifactId), JSON.stringify(brief))
  } catch {
    // sessionStorage переполнен — без кеша, не катастрофа
  }
}

// ─── Static subtopic lists (структура полного отчёта) ─────────────────────────
// Эти списки описывают что внутри каждой Части полного отчёта. Хардкодим
// в компоненте — экономим LLM-токены, гарантируем консистентность UI.

const PART_A_SUBTOPICS: Array<{ id: string; title: string; description: string }> = [
  { id: 'A1', title: 'Industry Snapshot', description: 'Porter 5 Forces + PESTEL + размер и рост рынка' },
  { id: 'A2', title: 'Customer Insights', description: 'JTBD-фреймворк, top-10 pains/gains, voice-of-customer' },
  { id: 'A3', title: 'Digital Footprint Map', description: 'Тех-скоринг сайта клиента и top-5 конкурентов (Lighthouse)' },
  { id: 'A4', title: 'Competitor Profiles', description: '9-точечное профилирование top-5 игроков рынка' },
  { id: 'A5', title: 'SWOT-TOWS', description: '4 квадранта стратегий из пересечения сильных сторон и угроз' },
  { id: 'A6', title: 'Blue Ocean Value Curve', description: 'Где можно дифференцироваться по 6+ параметрам' },
]

const PART_B_SUBTOPICS: Array<{ id: string; title: string; description: string }> = [
  { id: 'B1', title: 'Global Industry Snapshot', description: '2–3 ведущие страны или региона по вашей нише' },
  { id: 'B2', title: 'Global Trends & Innovations', description: 'Что появилось и набрало силу за последние 2 года' },
  { id: 'B3', title: 'Global Top Players', description: 'Игроки, которых нет на российском рынке' },
]

const PART_C_SUBTOPICS: Array<{ id: string; title: string; description: string }> = [
  { id: 'C1', title: 'Comparison-таблица', description: 'Сравнение РФ vs Global по 8–10 параметрам' },
  { id: 'C2', title: 'Opportunity Gaps', description: '3–5 направлений: Global уже мейнстрим, РФ ещё нет' },
  { id: 'C3', title: 'Что не повторять', description: '3–5 пунктов: какие Global-эксперименты провалились' },
]

const PART_D_SUBTOPICS: Array<{ id: string; title: string; description: string }> = [
  { id: 'D1', title: 'Roadmap McKinsey 3H', description: 'H1 (core, 0–3 мес) · H2 (рост, 3–9 мес) · H3 (future, 9+ мес)' },
  { id: 'D2', title: 'Метрики успеха', description: 'KPI на каждый горизонт + способ замера без платной аналитики' },
  { id: 'D3', title: '3–7 гипотез для тестирования', description: 'С метриками и пороговыми значениями pass/fail' },
]

// ─── Главный компонент ────────────────────────────────────────────────────────

export function BriefV2View({ artifactId, companyName, industry }: Props) {
  const [brief, setBrief] = useState<BriefV2 | null>(() => readCache(artifactId))
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    console.log('Report version: v2')
    // Логируем просмотр краткого отчёта для /admin/usage. Один раз на mount.
    trackUsage({ eventType: 'brief_viewed', artifactId })
    // Чистим intake draft — клиент дошёл до отчёта, форма больше не нужна.
    // UX-аудит 2.5 + 2.10: draft переживал submit чтобы позволить «вернуться
    // и поправить» с /pay, но после успешного отчёта смысла его держать нет.
    try {
      window.localStorage.removeItem('ai-strategist-intake-draft-v1')
    } catch {
      /* ignore */
    }
  }, [artifactId])

  useEffect(() => {
    if (brief) return

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
        writeCache(artifactId, data.brief)
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
  }, [artifactId, brief])

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
        <p className="text-xs text-[#737373] mt-4">
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
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Краткий разбор</p>
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
            onClick={() => {
              trackUsage({ eventType: 'pdf_downloaded', artifactId, metadata: { source: 'brief_v2' } })
              window.print()
            }}
            className="lp-btn-primary"
          >
            ⤓ Скачать PDF
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

      {/* ── 4–7. NAVIGATOR-КАРТОЧКИ ПО ЧАСТЯМ A/B/C/D ──────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <p className="lp-eyebrow mb-4">Что в полном отчёте</p>
        <h2 className="text-2xl font-bold tracking-[-0.02em] mb-8">
          4 крупных Части анализа
        </h2>
        <div className="space-y-6">
          <NavigatorCard
            badge="🇷🇺 Часть A"
            title="Анализ российского рынка"
            theses={brief.part_a_theses}
            subtopics={PART_A_SUBTOPICS}
            implementationL2={brief.implementation_l2_hints.part_a ?? null}
            artifactId={artifactId}
          />
          <NavigatorCard
            badge="🌍 Часть B"
            title="Зарубежный опыт за 2 года"
            theses={brief.part_b_theses}
            subtopics={PART_B_SUBTOPICS}
            implementationL2={null}
            artifactId={artifactId}
          />
          <NavigatorCard
            badge="📊 Часть C"
            title="Что Global даёт российскому рынку"
            theses={brief.part_c_theses}
            subtopics={PART_C_SUBTOPICS}
            implementationL2={brief.implementation_l2_hints.part_c ?? null}
            artifactId={artifactId}
          />
          <NavigatorCard
            badge="📋 Часть D"
            title="Стратегия и план на 6–12 месяцев"
            theses={brief.part_d_theses}
            subtopics={PART_D_SUBTOPICS}
            implementationL2={brief.implementation_l2_hints.part_d ?? null}
            artifactId={artifactId}
          />
        </div>
      </section>

      <div className="border-t border-[#e5e5e5]" />

      {/* ── 8. AI-АВТОМАТИЗАЦИЯ ─────────────────────────────────────── */}
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
            label="8.1"
            title="Автоматизация бизнес-процессов"
            block={brief.ai_automation.business_process}
          />
          <AutomationCard
            label="8.2"
            title="Автоматизация маркетинга"
            block={brief.ai_automation.marketing}
          />
          <AutomationCard
            label="8.3"
            title="Нишевые автоматизации"
            block={brief.ai_automation.niche_specific}
          />
        </div>
      </section>

      <div className="border-t border-[#e5e5e5]" />

      {/* ── 9. ЧТО МЫ ДЕЛАЕМ ПОД КЛЮЧ (Level 2 hub) ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14" id="level2-hub">
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Реализация на нашей стороне</p>
        <h2 className="text-2xl font-bold tracking-[-0.02em] mb-4">
          Если в команде некому исполнять — закроем сами
        </h2>
        <p className="text-base text-[#525252] leading-[1.6] mb-8 max-w-3xl">
          Когда вы выбираете реализацию у нас, мы используем <strong className="text-[#0a0a0a]">всю глубину анализа</strong> —
          даже если вы прочитали только краткий отчёт. Полный набор УТП, сильных сторон,
          стратегических выводов и AI-возможностей применяется к работе автоматически,
          независимо от того, какой уровень отчёта вы купили.
        </p>
        <div className="grid gap-5 md:grid-cols-2 mb-8">
          <article className="lp-card p-7">
            <p className="lp-eyebrow mb-3">Услуга 1</p>
            <h3 className="text-lg font-bold mb-3 tracking-[-0.01em]">
              Разработка сайта по критериям отчёта
            </h3>
            <p className="text-[15px] text-[#525252] leading-[1.6]">
              Лендинг или одностраничник, отвечающий на бренд-стратегию из полного отчёта —
              первый экран с УТП из Части A6, посадочные под каналы из Части D, формы захвата.
            </p>
          </article>
          <article className="lp-card p-7">
            <p className="lp-eyebrow mb-3">Услуга 2</p>
            <h3 className="text-lg font-bold mb-3 tracking-[-0.01em]">
              AI-автоматизация под ключ
            </h3>
            <p className="text-[15px] text-[#525252] leading-[1.6]">
              Чат-боты квалификации, автопостинг по соцсетям, нишевые автоматизации —
              реализуем то, что разобрано в блоке 8.
            </p>
          </article>
        </div>
        <Link href="/lead/retainer" className="lp-btn-primary no-print">
          Обсудить ваш проект
          <span aria-hidden>→</span>
        </Link>
      </section>

      <div className="border-t border-[#e5e5e5]" />

      {/* ── 10. БЕСПЛАТНО vs ПЛАТНО (таблица) ──────────────────────── */}
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
              {[
                { topic: '🇷🇺 Часть A — Анализ российского рынка', brief: 'обозначение тем', full: 'Porter 5F · PESTEL · JTBD · SWOT-TOWS · Blue Ocean' },
                { topic: '🌍 Часть B — Зарубежный опыт за 2 года', brief: 'обзорные тезисы', full: '2–3 страны · топ-инновации · ключевые игроки' },
                { topic: '📊 Часть C — Сравнение РФ vs Global', brief: 'один тезис', full: 'таблица 8–10 параметров · opportunity gaps · что не повторять' },
                { topic: '📋 Часть D — Стратегия и Roadmap 6–12 мес', brief: '1–2 тезиса', full: 'McKinsey 3H · KPI · 3–7 гипотез с pass/fail' },
              ].map((row) => (
                <tr key={row.topic} className="border-b border-[#e5e5e5]">
                  <td className="px-4 py-3 text-[#0a0a0a] align-top">{row.topic}</td>
                  <td className="px-4 py-3 text-[#6b7280] align-top">{row.brief}</td>
                  <td className="px-4 py-3 text-[#0a0a0a] align-top">{row.full}</td>
                </tr>
              ))}
              {[
                { topic: '🤖 8.1 AI-автоматизация бизнес-процессов', brief: 'направления', full: 'roadmap · ROI-оценка · инструменты' },
                { topic: '🤖 8.2 AI-автоматизация маркетинга', brief: 'направления', full: 'roadmap · инструменты · сетка по каналам клиента' },
                { topic: '🤖 8.3 Нишевые AI-автоматизации', brief: '1–2 паттерна', full: 'полный список + интеграционные схемы' },
              ].map((row) => (
                <tr key={row.topic} className="border-b border-[#e5e5e5] bg-[#f0fdf4]">
                  <td className="px-4 py-3 text-[#0a0a0a] align-top">{row.topic}</td>
                  <td className="px-4 py-3 text-[#6b7280] align-top">{row.brief}</td>
                  <td className="px-4 py-3 text-[#0a0a0a] align-top">{row.full}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 11. CTA-БЛОК Level 1 ─────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="lp-eyebrow mb-4">Полный отчёт</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-10">
            За 9 999 ₽ — полный анализ
          </h2>
          <ul className="text-left max-w-md mx-auto space-y-3 mb-10 text-[15px] text-[#0a0a0a]">
            <li className="flex gap-3">
              <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
              <span>Часть A — РФ-анализ: Porter 5F, PESTEL, JTBD, SWOT-TOWS, Blue Ocean</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
              <span>Часть B — Global-бенчмарк: 2–3 ведущие страны, инновации, top players</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
              <span>Часть C — Сравнение РФ vs Global: таблица, opportunity gaps, чего не повторять</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
              <span>Часть D — Стратегия и Roadmap по McKinsey 3H, метрики, 3–7 гипотез</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
              <span>AI-автоматизация: roadmap, ROI, инструменты для бизнес-процессов и маркетинга</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
              <span>Источники с RS-маркировкой 🟢🟡🟠🔴 и список открытых вопросов</span>
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

      {/* ── 12. FOOTER-CTA Level 2 ───────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5] bg-[#fafafa] no-print">
        <div className="max-w-3xl mx-auto px-6 py-10 text-center">
          <p className="text-sm text-[#525252] leading-[1.6]">
            Хотите сразу к реализации? <a href="#level2-hub" className="text-[#1e3a8a] underline">Обсудим ваш проект →</a>
          </p>
        </div>
      </section>

      {/* ── 12.5 ФИНАЛЬНАЯ КНОПКА Save PDF ──────────────────────────── */}
      <section className="border-t border-[#e5e5e5] no-print">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <p className="text-sm text-[#525252] leading-[1.6] mb-5">
            Сохраните разбор себе — в браузере вкладку можно случайно закрыть.
          </p>
          <button
            type="button"
            onClick={() => {
              trackUsage({
                eventType: 'pdf_downloaded',
                artifactId,
                metadata: { source: 'brief_v2_footer' },
              })
              window.print()
            }}
            className="lp-btn-primary"
          >
            ⤓ Скачать PDF
          </button>
        </div>
      </section>

      {/* ── 13. METHODOLOGY DISCLAIMER ──────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b7280] mb-2">
            О методологии
          </p>
          <p className="text-xs text-[#6b7280] leading-[1.65]">
            Анализ построен на бесплатных открытых источниках: Wordstat и Я.Тренды,
            публичные данные Я.Карт/2ГИС, открытые статистики ТГ-каналов и ВК,
            Lighthouse и PageSpeed Insights, открытое наблюдение SERP, публичные
            данные Rusprofile. Каждый факт сопровождается RS-маркировкой
            (🟢 Официальный / 🟡 Оценочный / 🟠 Экспертный / 🔴 Неверифицируемый).
            Платные SaaS-аналитики и доступы клиента (GSC, Я.Метрика, CMS) не
            используются — отчёт строится на тех же публичных данных, по которым
            анализируются конкуренты.
          </p>
        </div>
      </section>
    </>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function NavigatorCard({
  badge,
  title,
  theses,
  subtopics,
  implementationL2,
  artifactId,
}: {
  badge: string
  title: string
  theses: string[]
  subtopics: Array<{ id: string; title: string; description: string }>
  implementationL2: string | null
  artifactId: string
}) {
  return (
    <article className="lp-card p-7 page-break-inside-avoid">
      <div className="flex items-start gap-3 mb-4 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1e3a8a] bg-[#dbeafe] rounded px-2 py-1 whitespace-nowrap">
          {badge}
        </span>
        <h3 className="text-xl font-bold tracking-[-0.01em] leading-snug flex-1 min-w-0">
          {title}
        </h3>
      </div>

      {theses.length > 0 ? (
        <ul className="space-y-2.5 mb-6">
          {theses.map((t, i) => (
            <li key={i} className="text-[15px] text-[#0a0a0a] leading-[1.6]">
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#6b7280] italic mb-6">
          Тезисы готовятся — подробности в полном отчёте.
        </p>
      )}

      <div className="border-t border-[#e5e5e5] pt-5">
        <p className="text-xs font-bold text-[#6b7280] uppercase tracking-[0.12em] mb-3">
          В полном отчёте по этой теме
        </p>
        <ul className="space-y-2">
          {subtopics.map((item) => (
            <li key={item.id} className="flex gap-3 text-sm leading-[1.55]">
              <span className="text-[#1e3a8a] font-bold shrink-0 w-7">{item.id}</span>
              <span className="text-[#0a0a0a]">
                <strong>{item.title}</strong> — <span className="text-[#525252]">{item.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {implementationL2 && (
        <div className="mt-5 rounded-md border border-[#fbbf24]/40 bg-[#fef3c7]/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#92400e] mb-1">
            Реализация под ключ
          </p>
          <p className="text-sm text-[#0a0a0a] leading-[1.55]">{implementationL2}</p>
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
