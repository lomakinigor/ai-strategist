'use client'

// InteractiveV2View — интерактивный «рабочий отчёт» (дизайн innodor-report.html):
// sticky-сайдбар с якорной навигацией, hero с KPI-плашками, «3 действия месяца»,
// карта потерь (аккордеон), диагностические карточки, JTBD-сетка, цифровой аудит
// с графиком, roadmap H1/H2, ROI-таблица, SWOT+риски, открытые вопросы, CTA.
//
// Первый экран для paid-клиента после оплаты (см. app/api/pipeline-status).
// Полный 70–80-стр. отчёт (FullV2View) остаётся доступен по кросс-ссылке.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Manrope, Instrument_Serif } from 'next/font/google'
import { trackUsage } from '@/lib/usage/client'
import { OPEN_CONTACT_ADMIN_EVENT } from '@/components/ContactAdminButton'
import type {
  ClaimTag,
  DiagnosisCard as DiagnosisCardT,
  DigitalTask,
  InteractiveV2,
  KpiRow,
  RiskRow,
} from '@/lib/strategy/interactive-v2'
import styles from './interactive-report.module.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
})
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
})

interface Props {
  jobId: string
  companyName: string
  industry: string
}

const CACHE_KEY = (jobId: string) => `interactive_v2_v1_${jobId}`

function readCache(jobId: string): InteractiveV2 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY(jobId))
    if (!raw) return null
    return JSON.parse(raw) as InteractiveV2
  } catch {
    return null
  }
}

function writeCache(jobId: string, data: InteractiveV2): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY(jobId), JSON.stringify(data))
  } catch {
    // переполнение sessionStorage — не критично
  }
}

const CLAIM_TAG_META: Record<ClaimTag, { label: string; cls: string }> = {
  FACT: { label: 'Факт', cls: styles.badgeFact },
  HYPOTHESIS: { label: 'Гипотеза', cls: styles.badgeHypo },
  INSUFFICIENT_DATA: { label: 'Уточнить', cls: styles.badgeCheck },
}

function ClaimBadge({ tag }: { tag: ClaimTag }) {
  const meta = CLAIM_TAG_META[tag]
  return <span className={`${styles.badge} ${meta.cls}`}>{meta.label}</span>
}

const SEVERITY_BADGE: Record<DiagnosisCardT['severity'], { label: string; cls: string }> = {
  danger: { label: 'Критический', cls: styles.badgeCrit },
  warning: { label: 'Высокий', cls: styles.badgeHigh },
  gold: { label: 'Средний', cls: styles.badgeMed },
  primary: { label: 'Приоритет', cls: styles.badgeFact },
}

const KPI_STATUS_BADGE: Record<KpiRow['status'], { label: string; cls: string }> = {
  crit: { label: 'Ключевой', cls: styles.badgeCrit },
  high: { label: 'Важно', cls: styles.badgeHigh },
  ok: { label: 'В норме', cls: styles.badgeLow },
}

const DIGITAL_PRIORITY_BADGE: Record<DigitalTask['priority'], { label: string; cls: string }> = {
  crit: { label: 'Критично', cls: styles.badgeCrit },
  high: { label: 'Высокий', cls: styles.badgeHigh },
  med: { label: 'Средний', cls: styles.badgeMed },
  low: { label: 'Поддерживать', cls: styles.badgeLow },
}

const RISK_LEVEL_LABEL: Record<RiskRow['probability'], string> = {
  high: 'Высокая',
  medium: 'Средняя',
  low: 'Низкая',
}

// Цветовые пары для Chart.js — CSS custom properties Chart.js не читает,
// поэтому дублируем hex-значения токенов из interactive-report.module.css
// отдельно для light/dark (тот же приём, что в оригинале innodor-report.html).
function chartColors(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        primary: '#4a9990',
        primaryMid: '#5ab0a6',
        danger: '#c04050',
        warning: '#c47840',
        success: '#5a9948',
        text: '#cdc9c2',
        textMuted: '#7a7770',
        grid: 'rgba(255,255,255,0.06)',
      }
    : {
        primary: '#1a5c54',
        primaryMid: '#4a8f86',
        danger: '#8c1f2a',
        warning: '#9c4a1a',
        success: '#2e6b20',
        text: '#1e1c18',
        textMuted: '#6b6860',
        grid: 'rgba(30,28,24,0.07)',
      }
}

function DigitalChart({
  metrics,
  theme,
}: {
  metrics: NonNullable<InteractiveV2['digital_audit']>['metrics']
  theme: 'light' | 'dark'
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<import('chart.js').Chart | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('chart.js/auto').then(({ default: Chart }) => {
      if (cancelled || !canvasRef.current) return
      chartRef.current?.destroy()
      const c = chartColors(theme)
      chartRef.current = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels: metrics.map((m) => `${m.label}${m.unit ? ` (${m.unit})` : ''}`),
          datasets: [
            { label: 'Сейчас', data: metrics.map((m) => m.current), backgroundColor: c.danger, borderRadius: 6 },
            { label: 'Цель', data: metrics.map((m) => m.target), backgroundColor: c.primaryMid, borderRadius: 6 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: c.text } } },
          scales: {
            x: { grid: { color: c.grid }, ticks: { color: c.textMuted } },
            y: { grid: { color: c.grid }, ticks: { color: c.textMuted } },
          },
        },
      })
    })
    return () => {
      cancelled = true
      chartRef.current?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, metrics])

  return <canvas ref={canvasRef} />
}

function RoiChart({ chart, theme }: { chart: NonNullable<NonNullable<InteractiveV2['roi']>['chart']>; theme: 'light' | 'dark' }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<import('chart.js').Chart | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('chart.js/auto').then(({ default: Chart }) => {
      if (cancelled || !canvasRef.current) return
      chartRef.current?.destroy()
      const c = chartColors(theme)
      chartRef.current = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels: chart.labels,
          datasets: [
            { label: 'Сейчас', data: chart.before, backgroundColor: c.danger, borderRadius: 6 },
            { label: 'После', data: chart.after, backgroundColor: c.success, borderRadius: 6 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: c.text } } },
          scales: {
            x: { grid: { color: c.grid }, ticks: { color: c.textMuted } },
            y: { grid: { color: c.grid }, ticks: { color: c.textMuted } },
          },
        },
      })
    })
    return () => {
      cancelled = true
      chartRef.current?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, chart])

  return <canvas ref={canvasRef} />
}

export function InteractiveV2View({ jobId, companyName, industry }: Props) {
  const [data, setData] = useState<InteractiveV2 | null>(() => readCache(jobId))
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [compact, setCompact] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedLoss, setExpandedLoss] = useState<Set<number>>(new Set())
  const [activeSection, setActiveSection] = useState('s-summary')
  const [progressPct, setProgressPct] = useState(0)

  useEffect(() => {
    trackUsage({ eventType: 'interactive_viewed', researchJobId: jobId })
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
    try {
      window.localStorage.removeItem('ai-strategist-intake-draft-v1')
    } catch {
      /* ignore */
    }
  }, [jobId])

  useEffect(() => {
    if (data) return
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000)
    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch(`/api/interactive-v2/${jobId}`, { method: 'POST' })
        const body = (await res.json().catch(() => ({}))) as { interactive?: InteractiveV2; error?: string }
        if (cancelled) return
        if (!res.ok || !body.interactive) {
          setError(body.error ?? `HTTP ${res.status}`)
          return
        }
        setData(body.interactive)
        writeCache(jobId, body.interactive)
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
  }, [jobId, data])

  const sections = useMemo(() => {
    if (!data) return []
    return [
      { id: 's-summary', num: '01', label: 'Резюме' },
      { id: 's-context', num: '02', label: 'Контекст компании' },
      { id: 's-losses', num: '03', label: 'Где теряются деньги' },
      { id: 's-diagnosis', num: '04', label: 'Диагноз' },
      { id: 's-jtbd', num: '05', label: 'JTBD клиентов' },
      ...(data.digital_audit ? [{ id: 's-digital', num: '06', label: 'Цифровой аудит' }] : []),
      { id: 's-roadmap', num: data.digital_audit ? '07' : '06', label: 'Roadmap' },
      ...(data.roi ? [{ id: 's-roi', num: data.digital_audit ? '08' : '07', label: 'ROI автоматизации' }] : []),
      { id: 's-swot', num: 'SW', label: 'SWOT & риски' },
      { id: 's-questions', num: 'Q', label: 'Открытые вопросы' },
      { id: 's-next', num: '→', label: 'Следующий шаг' },
    ]
  }, [data])

  useEffect(() => {
    if (!data || sections.length === 0) return
    const onScroll = () => {
      const totalH = document.body.scrollHeight - window.innerHeight
      setProgressPct(totalH > 0 ? Math.min(100, Math.round((window.scrollY / totalH) * 100)) : 0)
      let current = sections[0]?.id ?? ''
      for (const s of sections) {
        const el = document.getElementById(s.id)
        if (el && window.scrollY >= el.offsetTop - 120) current = s.id
      }
      setActiveSection(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [data, sections])

  const toggleLoss = (i: number) => {
    setExpandedLoss((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const handlePrint = () => {
    trackUsage({ eventType: 'pdf_downloaded', researchJobId: jobId, metadata: { source: 'interactive_v2' } })
    window.print()
  }

  const handleTalkToTeam = () => {
    trackUsage({ eventType: 'interactive_viewed', researchJobId: jobId, metadata: { action: 'talk_to_team' } })
    window.dispatchEvent(
      new CustomEvent(OPEN_CONTACT_ADMIN_EVENT, {
        detail: { message: `Хочу обсудить приоритеты плана по отчёту «${companyName}».` },
      }),
    )
  }

  if (error) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Ошибка генерации</p>
        <h2 className="text-2xl font-bold mb-3 tracking-[-0.02em]">Не удалось собрать рабочий отчёт</h2>
        <p className="text-base text-[#525252] max-w-md mx-auto leading-[1.6] mb-2">{error}</p>
        <p className="text-sm text-[#525252] mt-4">
          Нажмите «💬 Написать админу» в правом нижнем углу — мы вручную перезапустим генерацию.
        </p>
        <Link href={`/research/${jobId}/report`} className="lp-btn-ghost mt-6 inline-block">
          Открыть полный отчёт →
        </Link>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Рабочий отчёт</p>
        <div className="flex items-center justify-center mb-6">
          <span aria-hidden className="inline-block w-8 h-8 rounded-full border-2 border-[#e5e5e5] border-t-[#0a0a0a] animate-spin" />
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-[-0.02em]">Собираем рабочий отчёт…</h2>
        <p className="text-base text-[#525252] max-w-md mx-auto leading-[1.6]">
          Дистилляция полного анализа в короткий интерактивный формат занимает 20–40 секунд. Прошло {elapsed} сек.
        </p>
      </section>
    )
  }

  return (
    <div className={`${styles.themeRoot} ${manrope.variable} ${instrumentSerif.variable}`} data-theme={theme}>
      {mobileOpen && (
        <div className={`${styles.sidebarOverlay} ${styles.sidebarOverlayVisible}`} onClick={() => setMobileOpen(false)} />
      )}

      <div className={styles.appLayout}>
        <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarLogo}>
            <div className={styles.logoMark}>
              <div className={styles.logoIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <div className={`${styles.logoText} ${styles.fontDisplay}`}>{companyName}</div>
                <div className={styles.logoSub}>Рабочий отчёт</div>
              </div>
            </div>
          </div>

          <div className={styles.navLabel}>Содержание</div>
          <nav>
            <ul className={styles.navList}>
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`${styles.navItem} ${activeSection === s.id ? styles.navItemActive : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className={styles.navNum}>{s.num}</span> {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.sidebarActions}>
            <button type="button" className={styles.btnOutline} onClick={() => setCompact((v) => !v)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 6h16M8 12h8M10 18h4" />
              </svg>
              {compact ? 'Полный вид' : 'Только выводы'}
            </button>
            <button type="button" className={styles.btnOutline} onClick={handlePrint}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Печать / PDF
            </button>
            <Link href={`/research/${jobId}/report`} className={styles.btnOutline}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Полный отчёт (70+ стр.) →
            </Link>
          </div>

          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              <span>Прочитано</span>
              <span>{progressPct}%</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </aside>

        <div className={styles.mainContent}>
          <div className={styles.topBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className={styles.mobileNavToggle}
                onClick={() => setMobileOpen(true)}
                aria-label="Открыть меню"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className={styles.breadcrumb}>
                <strong>{companyName}</strong> <span>›</span> Рабочий отчёт
              </div>
            </div>
            <div className={styles.topActions}>
              <button
                type="button"
                className={styles.themeToggle}
                aria-label="Сменить тему"
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className={styles.contentWrapper}>
            {/* 01 — SUMMARY */}
            <section id="s-summary" className={styles.section}>
              <div className={`${styles.heroSection} ${styles.reveal}`}>
                <div className={styles.heroBadge}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {data.hero.eyebrow || industry || 'Проверяемый рабочий отчёт'}
                </div>
                <h1 className={`${styles.heroTitle} ${styles.fontDisplay}`}>
                  {data.hero.title_main}
                  <br />
                  <em>{data.hero.title_accent}</em>
                </h1>
                <p className={styles.heroSub}>{data.hero.subtitle}</p>
                <div className={styles.heroMeta}>
                  {data.hero.date_label && (
                    <div className={styles.heroMetaItem}>
                      <strong>{data.hero.date_label}</strong>
                    </div>
                  )}
                  {data.hero.scope_label && (
                    <div className={styles.heroMetaItem}>
                      <strong>{data.hero.scope_label}</strong>
                    </div>
                  )}
                  {data.hero.horizon_label && (
                    <div className={styles.heroMetaItem}>
                      <strong>{data.hero.horizon_label}</strong>
                    </div>
                  )}
                </div>
                {data.hero.trust_badges.length > 0 && (
                  <div className={styles.heroTrustBadges}>
                    {data.hero.trust_badges.map((b, i) => (
                      <div key={i} className={styles.trustBadge}>
                        <span className="val">{b.value}</span>
                        <span className="lbl">{b.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!compact && (
                <div className={styles.infoCallout}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-primary)' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <strong>Методологическое замечание.</strong> Отчёт собран из проверяемых фактов и признанных
                    гипотез: <ClaimBadge tag="FACT" /> — проверяемые данные, <ClaimBadge tag="HYPOTHESIS" /> — разумные
                    допущения, <ClaimBadge tag="INSUFFICIENT_DATA" /> — данные, нужные от клиента для финализации решения.
                  </div>
                </div>
              )}

              {data.three_actions.length > 0 && (
                <>
                  <h3 className={`${styles.fontDisplay} ${styles.reveal}`} style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-5)' }}>
                    Три действия первого месяца
                  </h3>
                  <div className={`${styles.cardGrid} ${styles.cardGrid3}`}>
                    {data.three_actions.map((a, i) => {
                      const borderColor =
                        a.priority === 'critical' ? 'var(--color-primary)' : a.priority === 'high' ? 'var(--color-warning)' : 'var(--color-gold)'
                      return (
                        <div key={i} className={styles.card} style={{ borderTop: `3px solid ${borderColor}` }}>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: borderColor, marginBottom: 'var(--space-3)' }}>
                            {a.step_label}
                          </div>
                          <div className={styles.cardTitle}>{a.title}</div>
                          <div className={styles.cardBody}>{a.body}</div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </section>

            <hr className={styles.divider} />

            {/* 02 — CONTEXT */}
            <section id="s-context" className={styles.section}>
              <div className={styles.sectionEyebrow}>Контекст</div>
              <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>Контекст компании</h2>
              <p className={styles.sectionDesc}>Профиль компании и конкурентная позиция — основа для всех последующих решений.</p>

              <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
                <div className={styles.card}>
                  <div className={styles.cardTitle} style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
                    Профиль
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {data.context.profile_rows.map((row, i) => (
                      <div
                        key={i}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-md)' }}
                      >
                        <span className={styles.textMuted} style={{ fontSize: 'var(--text-sm)' }}>
                          {row.label}
                        </span>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardTitle} style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
                    Конкурентная позиция
                  </div>
                  <div className={styles.cardBody} style={{ marginBottom: 'var(--space-4)' }}>
                    {data.context.competitive_position}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {data.context.position_scores.map((s, i) => {
                      const color = s.tone === 'danger' ? 'var(--color-danger)' : s.tone === 'success' ? 'var(--color-success)' : 'var(--color-warning)'
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 'var(--text-xs)' }}>{s.label}</span>
                            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>{s.value}/5</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--color-surface-offset)', borderRadius: 99 }}>
                            <div style={{ height: '100%', width: `${(s.value / 5) * 100}%`, background: color, borderRadius: 99 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {!compact && data.context.regional_risk_callout && (
                <div className={styles.gapCallout} style={{ marginTop: 'var(--space-6)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-warning)' }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <strong>Региональный риск:</strong> {data.context.regional_risk_callout}
                  </div>
                </div>
              )}
            </section>

            <hr className={styles.divider} />

            {/* 03 — LOSSES */}
            <section id="s-losses" className={styles.section}>
              <div className={styles.sectionEyebrow}>Диагностика</div>
              <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>Где теряются деньги</h2>
              <p className={styles.sectionDesc}>Ключевые точки потерь. Нажмите на каждую для деталей.</p>

              <div className={styles.painFlow}>
                {data.losses.map((loss, i) => {
                  const expanded = expandedLoss.has(i)
                  return (
                    <button
                      type="button"
                      key={i}
                      className={`${styles.painStep} ${expanded ? styles.painStepExpanded : ''}`}
                      onClick={() => toggleLoss(i)}
                    >
                      <div className={styles.painNum}>{i + 1}</div>
                      <div>
                        <div className={styles.painTitle}>{loss.title}</div>
                        <div className={styles.painSummary}>{loss.summary}</div>
                        {expanded && <div className={styles.painDetail}>{loss.detail}</div>}
                      </div>
                      <div className={styles.painImpact}>
                        <div className={styles.impactVal}>{loss.impact_value}</div>
                        <div className={styles.impactLbl}>{loss.impact_label}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <hr className={styles.divider} />

            {/* 04 — DIAGNOSIS */}
            <section id="s-diagnosis" className={styles.section}>
              <div className={styles.sectionEyebrow}>Диагноз</div>
              <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>Системный взгляд на проблему</h2>
              <p className={styles.sectionDesc}>Каждый диагноз привязан к симптому, бизнес-эффекту и конкретному действию.</p>

              <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
                {data.diagnosis.map((d, i) => {
                  const sev = SEVERITY_BADGE[d.severity]
                  return (
                    <div key={i} className={styles.diagnosisCard}>
                      <div className={styles.diagEyebrow}>{d.eyebrow}</div>
                      <div className={styles.diagProblem}>{d.problem}</div>
                      <div className={styles.diagEffect}>{d.effect}</div>
                      <div className={styles.diagAction}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        {d.action}
                      </div>
                      <div>
                        <span className={`${styles.badge} ${sev.cls}`}>{sev.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <hr className={styles.divider} />

            {/* 05 — JTBD */}
            <section id="s-jtbd" className={styles.section}>
              <div className={styles.sectionEyebrow}>Понимание клиента</div>
              <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>Jobs To Be Done: логика спроса</h2>
              <p className={styles.sectionDesc}>Реальные задачи, которые клиенты решают через ваш продукт или услугу.</p>

              <div className={styles.jtbdGrid}>
                {data.jtbd.map((j, i) => (
                  <div key={i} className={styles.jtbdItem}>
                    <div className={styles.jtbdScenario}>{j.scenario}</div>
                    <div className={styles.jtbdJob}>{j.job}</div>
                    <div className={styles.jtbdPain}>{j.pain}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 06 — DIGITAL AUDIT (опционально) */}
            {data.digital_audit && (
              <>
                <hr className={styles.divider} />
                <section id="s-digital" className={styles.section}>
                  <div className={styles.sectionEyebrow}>Технический аудит</div>
                  <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>Цифровой аудит</h2>
                  <p className={styles.sectionDesc}>{data.digital_audit.chart_note}</p>

                  <div className={`${styles.cardGrid} ${styles.cardGrid2}`} style={{ marginBottom: 'var(--space-6)' }}>
                    <div className={styles.chartWrap}>
                      <div className={styles.chartTitle}>Метрики: сейчас vs цель</div>
                      <div className={styles.chartSub}>&nbsp;</div>
                      <div className={styles.chartCanvasWrap} style={{ height: 220 }}>
                        <DigitalChart metrics={data.digital_audit.metrics} theme={theme} />
                      </div>
                    </div>
                    <div className={styles.card}>
                      <div className={styles.cardTitle} style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
                        Список задач <span style={{ fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--color-text-muted)' }}>— по приоритету</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {data.digital_audit.tasks.map((t, i) => {
                          const p = DIGITAL_PRIORITY_BADGE[t.priority]
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-md)' }}>
                              <span className={`${styles.badge} ${p.cls}`} style={{ flexShrink: 0 }}>
                                {p.label}
                              </span>
                              <div style={{ fontSize: 'var(--text-sm)' }}>
                                <strong>{t.title}</strong> {t.note && `— ${t.note}`}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {!compact && data.digital_audit.caveat && (
                    <div className={styles.gapCallout}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-warning)' }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <div>
                        <strong>Что не включено в аудит.</strong> {data.digital_audit.caveat}
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}

            <hr className={styles.divider} />

            {/* ROADMAP */}
            <section id="s-roadmap" className={styles.section}>
              <div className={styles.sectionEyebrow}>Стратегия</div>
              <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>Roadmap 0–12 месяцев</h2>
              <p className={styles.sectionDesc}>Два горизонта: фундамент и рост.</p>

              <div className={styles.horizonTimeline}>
                <div className={styles.horizonTrack}>
                  <div className={styles.htSeg} style={{ background: 'var(--color-primary)' }} />
                  <div className={styles.htSeg} style={{ background: 'var(--color-primary-mid)' }} />
                  <div className={styles.htSeg} style={{ background: 'color-mix(in oklch,var(--color-primary) 40%,var(--color-surface-offset))' }} />
                  <div className={styles.htSeg} style={{ background: 'var(--color-surface-offset)' }} />
                </div>
                <div className={styles.horizonLabels}>
                  <div style={{ textAlign: 'left' }}>
                    <span className={styles.horizonLabel} style={{ color: 'var(--color-primary)' }}>
                      {data.roadmap.horizon_labels[0]}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={styles.horizonLabel}>{data.roadmap.horizon_labels[1]}</span>
                  </div>
                </div>
              </div>

              <div className={styles.roadmapPhases}>
                <div className={styles.phaseCard}>
                  <div className={styles.phaseHeader} style={{ borderLeft: '4px solid var(--color-primary)' }}>
                    <div className={styles.phaseLabel}>Горизонт 1</div>
                    <div className={styles.phaseTitle}>{data.roadmap.horizon_labels[0]}</div>
                  </div>
                  <div className={styles.phaseItems}>
                    {data.roadmap.h1.map((p, i) => (
                      <div key={i} className={styles.phaseItem}>
                        <div className={styles.phaseDot} />
                        <div>
                          <div className={styles.phaseItemTitle}>{p.title}</div>
                          <div className={styles.phaseItemDesc}>{p.desc}</div>
                          <div className={styles.phaseItemMeta}>
                            {p.period_badge && <span className={`${styles.badge} ${styles.badgeFact}`}>{p.period_badge}</span>}
                            {p.cost_badge && <span className={`${styles.badge} ${styles.badgeHypo}`}>{p.cost_badge}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.phaseCard}>
                  <div className={styles.phaseHeader} style={{ borderLeft: '4px solid var(--color-primary-mid)' }}>
                    <div className={styles.phaseLabel}>Горизонт 2</div>
                    <div className={styles.phaseTitle}>{data.roadmap.horizon_labels[1]}</div>
                  </div>
                  <div className={styles.phaseItems}>
                    {data.roadmap.h2.map((p, i) => (
                      <div key={i} className={styles.phaseItem}>
                        <div className={styles.phaseDot} style={{ background: 'var(--color-primary-mid)' }} />
                        <div>
                          <div className={styles.phaseItemTitle}>{p.title}</div>
                          <div className={styles.phaseItemDesc}>{p.desc}</div>
                          <div className={styles.phaseItemMeta}>
                            {p.period_badge && <span className={`${styles.badge} ${styles.badgeFact}`}>{p.period_badge}</span>}
                            {p.cost_badge && <span className={`${styles.badge} ${styles.badgeHypo}`}>{p.cost_badge}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {data.roadmap.kpi_table.length > 0 && (
                <>
                  <h3 className={styles.fontDisplay} style={{ fontSize: 'var(--text-xl)', marginTop: 'var(--space-10)', marginBottom: 'var(--space-5)' }}>
                    KPI на 6 месяцев
                  </h3>
                  <div className={styles.tableBorder}>
                    <div className={`${styles.tableRow} ${styles.tableRowHeader}`} style={{ gridTemplateColumns: '1fr 90px 90px auto' }}>
                      <div>Метрика</div>
                      <div className={styles.tableCell}>Сейчас</div>
                      <div className={styles.tableCell}>Цель 6 мес</div>
                      <div className={styles.tableCell}>Статус</div>
                    </div>
                    {data.roadmap.kpi_table.map((k, i) => {
                      const status = KPI_STATUS_BADGE[k.status]
                      return (
                        <div key={i} className={styles.tableRow} style={{ gridTemplateColumns: '1fr 90px 90px auto' }}>
                          <div className={styles.tableCellLabel}>{k.metric}</div>
                          <div className={styles.tableCell}>{k.now}</div>
                          <div className={styles.tableCell} style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                            {k.target_6m}
                          </div>
                          <div className={styles.tableCell}>
                            <span className={`${styles.badge} ${status.cls}`}>{status.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </section>

            {/* ROI (опционально) */}
            {data.roi && (
              <>
                <hr className={styles.divider} />
                <section id="s-roi" className={styles.section}>
                  <div className={styles.sectionEyebrow}>Экономика</div>
                  <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>ROI автоматизации</h2>
                  <p className={styles.sectionDesc}>Расчёт экономического эффекта от операционного ядра.</p>

                  <div className={styles.roiBlock} style={{ marginBottom: 'var(--space-6)' }}>
                    <div className={styles.roiHeader}>
                      <div className={styles.roiHeaderItem}>
                        <div className="val">{data.roi.header.current_cost}</div>
                        <div className="lbl">Текущие трудозатраты / мес</div>
                      </div>
                      <div className={styles.roiHeaderItem}>
                        <div className="val">{data.roi.header.savings}</div>
                        <div className="lbl">Экономия после автоматизации</div>
                      </div>
                      <div className={styles.roiHeaderItem}>
                        <div className="val">{data.roi.header.payback}</div>
                        <div className="lbl">Срок окупаемости</div>
                      </div>
                    </div>
                    <div className={styles.roiTableWrap}>
                      <table className={styles.roiTable}>
                        <thead>
                          <tr>
                            <th>Операция</th>
                            <th>Время/ед.</th>
                            <th>Текущие затраты</th>
                            <th>После автоматизации</th>
                            <th>Экономия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.roi.rows.map((r, i) => (
                            <tr key={i}>
                              <td>{r.operation}</td>
                              <td className="num">{r.time_per_unit}</td>
                              <td className="num neg">{r.current_cost}</td>
                              <td className="num">{r.after_cost}</td>
                              <td className="num pos">{r.savings}</td>
                            </tr>
                          ))}
                          <tr style={{ background: 'color-mix(in oklch,var(--color-success) 8%,transparent)' }}>
                            <td>
                              <strong>{data.roi.total_row.operation}</strong>
                            </td>
                            <td></td>
                            <td className="num neg">
                              <strong>{data.roi.total_row.current_cost}</strong>
                            </td>
                            <td className="num">
                              <strong>{data.roi.total_row.after_cost}</strong>
                            </td>
                            <td className="num pos">
                              <strong>{data.roi.total_row.savings}</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
                    {data.roi.chart && (
                      <div className={styles.chartWrap}>
                        <div className={styles.chartTitle}>До / После автоматизации</div>
                        <div className={styles.chartSub}>&nbsp;</div>
                        <div className={styles.chartCanvasWrap} style={{ height: 200 }}>
                          <RoiChart chart={data.roi.chart} theme={theme} />
                        </div>
                      </div>
                    )}
                    {data.roi.assumptions.length > 0 && (
                      <div className={styles.card}>
                        <div className={styles.cardTitle} style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
                          Допущения и ограничения
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                          {data.roi.assumptions.map((a, i) => (
                            <div key={i} className={styles.evidenceItem}>
                              <ClaimBadge tag={a.tag} />
                              <div className="eText">{a.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            <hr className={styles.divider} />

            {/* SWOT & RISKS */}
            <section id="s-swot" className={styles.section}>
              <div className={styles.sectionEyebrow}>Позиция</div>
              <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>SWOT & ключевые риски</h2>
              <p className={styles.sectionDesc}>Стратегическая позиция компании и управленческие риски внедрения.</p>

              <div className={styles.swotGrid} style={{ marginBottom: 'var(--space-8)' }}>
                <div className={`${styles.swotCell} ${styles.swotS}`}>
                  <h4>Сильные стороны</h4>
                  <ul>
                    {data.swot.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className={`${styles.swotCell} ${styles.swotW}`}>
                  <h4>Слабые стороны</h4>
                  <ul>
                    {data.swot.weaknesses.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className={`${styles.swotCell} ${styles.swotO}`}>
                  <h4>Возможности</h4>
                  <ul>
                    {data.swot.opportunities.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className={`${styles.swotCell} ${styles.swotT}`}>
                  <h4>Угрозы</h4>
                  <ul>
                    {data.swot.threats.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {data.risks.length > 0 && (
                <>
                  <h3 className={styles.fontDisplay} style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-5)' }}>
                    Матрица рисков внедрения
                  </h3>
                  <div className={styles.tableBorder}>
                    <div className={`${styles.tableRow} ${styles.tableRowHeader}`} style={{ gridTemplateColumns: '1fr 90px 90px auto' }}>
                      <div>Риск</div>
                      <div className={styles.tableCell}>Вероятность</div>
                      <div className={styles.tableCell}>Влияние</div>
                      <div className={styles.tableCell}>Митигация</div>
                    </div>
                    {data.risks.map((r, i) => (
                      <div key={i} className={styles.tableRow} style={{ gridTemplateColumns: '1fr 90px 90px auto' }}>
                        <div className={styles.tableCellLabel}>{r.risk}</div>
                        <div className={styles.tableCell}>{RISK_LEVEL_LABEL[r.probability]}</div>
                        <div className={styles.tableCell}>{RISK_LEVEL_LABEL[r.impact]}</div>
                        <div className={styles.tableCell}>{r.mitigation}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <hr className={styles.divider} />

            {/* OPEN QUESTIONS */}
            <section id="s-questions" className={styles.section}>
              <div className={styles.sectionEyebrow}>Следующий шаг</div>
              <h2 className={`${styles.sectionTitle} ${styles.fontDisplay}`}>Открытые вопросы</h2>
              <p className={styles.sectionDesc}>Данные, необходимые от клиента для финализации плана и точного расчёта ROI.</p>

              <div className={styles.questionsList}>
                {data.open_questions.map((q, i) => (
                  <div key={i} className={styles.questionItem}>
                    <div className={styles.qNum}>{i + 1}</div>
                    <div>
                      <div className={styles.qText}>{q.question}</div>
                      <div className={styles.qWhy}>{q.why}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <hr className={styles.divider} />

            {/* NEXT STEP CTA */}
            <section id="s-next" className={styles.section}>
              <div className={styles.ctaBlock}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>→</div>
                <h2 className={`${styles.ctaTitle} ${styles.fontDisplay}`}>{data.next_step.title}</h2>
                <p className={styles.ctaDesc}>{data.next_step.body}</p>
                <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className={styles.btnPrimary} onClick={handleTalkToTeam}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Записаться на разбор
                  </button>
                  <button type="button" className={styles.btnOutline} style={{ padding: 'var(--space-4) var(--space-8)' }} onClick={handlePrint}>
                    Скачать PDF
                  </button>
                  <Link href={`/research/${jobId}/report`} className={styles.btnOutline} style={{ padding: 'var(--space-4) var(--space-8)' }}>
                    Открыть полный отчёт (70+ стр.) →
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
