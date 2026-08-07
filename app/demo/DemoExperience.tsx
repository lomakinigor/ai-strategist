'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Instrument_Serif, Manrope } from 'next/font/google'
import { DEMO_SNAPSHOT } from '@/lib/demo/snapshot'
import type { DemoReportBlock, EvidenceKind } from '@/lib/demo/types'
import styles from './demo.module.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-demo-sans',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-demo-serif',
})

type DemoStep = 'input' | 'research' | 'interactive' | 'report'

const STEPS: Array<{ id: DemoStep; number: string; label: string }> = [
  { id: 'input', number: '01', label: 'Данные компании' },
  { id: 'research', number: '02', label: 'Исследование' },
  { id: 'interactive', number: '03', label: 'Главные решения' },
  { id: 'report', number: '04', label: 'Полный отчёт' },
]

const KIND_CLASS: Record<EvidenceKind, string> = {
  fact: styles.tagFact,
  hypothesis: styles.tagHypothesis,
  insufficient: styles.tagInsufficient,
}

function ReportBlock({ block }: { block: DemoReportBlock }) {
  return (
    <div className={styles.reportBlock}>
      <h3>{block.title}</h3>
      {block.text && <p>{block.text}</p>}
      {block.items && (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {block.rows && block.rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                {Object.keys(block.rows[0]).map((key) => (
                  <th key={key}>{key.replaceAll('_', ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, index) => (
                <tr key={`${block.title}-${index}`}>
                  {Object.values(row).map((value, cellIndex) => (
                    <td key={`${value}-${cellIndex}`}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function DemoExperience() {
  const [step, setStep] = useState<DemoStep>('input')
  const activeIndex = STEPS.findIndex((item) => item.id === step)

  const moveTo = (next: DemoStep) => {
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className={`${styles.demo} ${manrope.variable} ${instrumentSerif.variable}`}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="AI-Стратег — на главную">
          <span className={styles.brandMark}>AI</span>
          <span>Стратег</span>
        </Link>
        <div className={styles.demoBadge}>Демонстрационный режим</div>
        <Link href={DEMO_SNAPSHOT.cta.paidHref} className={styles.headerCta}>
          Исследовать мою компанию
        </Link>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <p className={styles.eyebrow}>Как работает продукт</p>
          <nav aria-label="Этапы демонстрации" className={styles.steps}>
            {STEPS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.stepButton} ${step === item.id ? styles.stepActive : ''} ${index < activeIndex ? styles.stepDone : ''}`}
                onClick={() => index <= activeIndex && moveTo(item.id)}
                disabled={index > activeIndex}
              >
                <span>{index < activeIndex ? '✓' : item.number}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className={styles.sidebarTrust}>
            <span>Обезличенный пример</span>
            <p>Результат реального исследования без названий, контактов и персональных данных.</p>
          </div>
        </aside>

        <section className={styles.workspace}>
          {step === 'input' && (
            <div className={styles.stage}>
              <div className={styles.stageIntro}>
                <p className={styles.kicker}>Шаг 1 · Входные данные</p>
                <h1>
                  Посмотрите, что получает <em>реальная компания</em>
                </h1>
                <p className={styles.lead}>
                  Мы уже заполнили анкету за вас. Это безопасная копия реального B2B-исследования:
                  все идентификаторы заменены, а логика анализа сохранена.
                </p>
              </div>

              <div className={styles.notice}>{DEMO_SNAPSHOT.notice}</div>

              <div className={styles.inputLayout}>
                <div className={styles.formPanel}>
                  <div className={styles.panelHeading}>
                    <span>Предзаполненная анкета</span>
                    <span className={styles.readOnly}>Только просмотр</span>
                  </div>
                  <div className={styles.fieldGrid}>
                    <div className={styles.fieldWide}>
                      <label>Компания</label>
                      <p>{DEMO_SNAPSHOT.company.name}</p>
                    </div>
                    <div>
                      <label>Отрасль</label>
                      <p>{DEMO_SNAPSHOT.company.industry}</p>
                    </div>
                    <div>
                      <label>География</label>
                      <p>{DEMO_SNAPSHOT.company.region}</p>
                    </div>
                    <div className={styles.fieldWide}>
                      <label>Цель исследования</label>
                      <p>{DEMO_SNAPSHOT.company.goal}</p>
                    </div>
                    <div className={styles.fieldWide}>
                      <label>Чем занимается</label>
                      <p>{DEMO_SNAPSHOT.company.description}</p>
                    </div>
                  </div>
                </div>

                <div className={styles.inputSummary}>
                  <div>
                    <span className={styles.summaryLabel}>Услуги</span>
                    {DEMO_SNAPSHOT.company.services.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                  <div>
                    <span className={styles.summaryLabel}>Известные каналы</span>
                    <div className={styles.chips}>
                      {DEMO_SNAPSHOT.company.channels.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className={styles.summaryLabel}>Конкуренты для сравнения</span>
                    <p>{DEMO_SNAPSHOT.company.competitors.join(' · ')}</p>
                  </div>
                </div>
              </div>

              <div className={styles.stageAction}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => moveTo('research')}
                >
                  Запустить тестовое исследование <span>→</span>
                </button>
                <p>В demo данные уже собраны — ожидания и списаний не будет.</p>
              </div>
            </div>
          )}

          {step === 'research' && (
            <div className={styles.stage}>
              <div className={styles.stageIntro}>
                <p className={styles.kicker}>Шаг 2 · Сбор и проверка</p>
                <h1>
                  Не один ответ AI, а <em>пять потоков исследования</em>
                </h1>
                <p className={styles.lead}>
                  Система сопоставляет данные о компании, рынке, аудитории, каналах и конкурентах.
                  Каждый вывод получает уровень надёжности.
                </p>
              </div>

              <div className={styles.researchHero}>
                <div>
                  <strong>{DEMO_SNAPSHOT.research.factCount}</strong>
                  <span>фактов собрано</span>
                </div>
                <div>
                  <strong>{DEMO_SNAPSHOT.research.sourceCount}</strong>
                  <span>источника изучено</span>
                </div>
                <div>
                  <strong>{DEMO_SNAPSHOT.research.streams.length}</strong>
                  <span>потоков анализа</span>
                </div>
              </div>

              <div className={styles.streamList}>
                {DEMO_SNAPSHOT.research.streams.map((stream, index) => (
                  <div className={styles.streamRow} key={stream.name}>
                    <span className={styles.streamIndex}>0{index + 1}</span>
                    <div>
                      <h2>{stream.name}</h2>
                      <p>{stream.detail}</p>
                    </div>
                    <span className={styles.streamCount}>{stream.factCount} фактов</span>
                    <span className={styles.streamStatus}>Готово</span>
                  </div>
                ))}
              </div>

              <div className={styles.reliability}>
                <div className={styles.reliabilityIntro}>
                  <span className={styles.aiLabel}>AI-анализ</span>
                  <h2>Достоверность отделена от уверенного тона</h2>
                  <p>
                    Гипотеза не маскируется под факт. Непроверяемые выводы остаются вопросами к
                    владельцу.
                  </p>
                </div>
                <div className={styles.reliabilityBars}>
                  {DEMO_SNAPSHOT.research.reliability.map((item, index) => (
                    <div key={item.label}>
                      <div className={styles.barMeta}>
                        <span>{item.label}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div className={styles.bar}>
                        <span
                          style={{
                            width: `${(item.count / DEMO_SNAPSHOT.research.factCount) * 100}%`,
                          }}
                          data-tone={index}
                        />
                      </div>
                      <p>{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.stageAction}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => moveTo('interactive')}
                >
                  Собрать выводы и решения <span>→</span>
                </button>
                <p>Дальше AI связывает факты с последствиями и действиями.</p>
              </div>
            </div>
          )}

          {step === 'interactive' && (
            <div className={styles.stage}>
              <div className={styles.reportMasthead}>
                <div>
                  <p className={styles.kicker}>Шаг 3 · Интерактивная часть</p>
                  <h1>{DEMO_SNAPSHOT.company.name}</h1>
                  <p>
                    {DEMO_SNAPSHOT.company.industry} · {DEMO_SNAPSHOT.company.region}
                  </p>
                </div>
                <span className={styles.reportStamp}>Demo snapshot</span>
              </div>

              <section className={styles.thesis}>
                <span className={styles.aiLabel}>AI-резюме · на основе 48 фактов</span>
                <p>{DEMO_SNAPSHOT.interactive.thesis}</p>
              </section>

              <section className={styles.contentSection}>
                <div className={styles.sectionNumber}>01</div>
                <div className={styles.sectionBody}>
                  <p className={styles.kicker}>Позиция</p>
                  <h2>{DEMO_SNAPSHOT.interactive.position.title}</h2>
                  <p className={styles.sectionLead}>{DEMO_SNAPSHOT.interactive.position.summary}</p>
                  <div className={styles.metricGrid}>
                    {DEMO_SNAPSHOT.interactive.position.metrics.map((metric) => (
                      <div className={styles.metric} key={metric.label} data-tone={metric.tone}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                        <p>{metric.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className={styles.contentSection}>
                <div className={styles.sectionNumber}>02</div>
                <div className={styles.sectionBody}>
                  <p className={styles.kicker}>Диагноз</p>
                  <h2>Два главных узких места</h2>
                  <div className={styles.findingList}>
                    {DEMO_SNAPSHOT.interactive.bottlenecks.map((item, index) => (
                      <article className={styles.finding} key={item.title}>
                        <div className={styles.findingHead}>
                          <span>УМ-{index + 1}</span>
                          <span
                            className={`${styles.evidenceTag} ${KIND_CLASS[item.evidenceNote.kind]}`}
                          >
                            {item.evidenceNote.label}
                          </span>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.evidence}</p>
                        <div>
                          <strong>Последствие</strong>
                          {item.consequence}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <section className={styles.contentSection}>
                <div className={styles.sectionNumber}>03</div>
                <div className={styles.sectionBody}>
                  <p className={styles.kicker}>Конкурентное поле</p>
                  <h2>Что рынок повторяет — и где есть место</h2>
                  <div className={styles.cleanTable}>
                    <div className={styles.cleanTableHead}>
                      <span>Паттерн</span>
                      <span>На рынке</span>
                      <span>Возможность</span>
                    </div>
                    {DEMO_SNAPSHOT.interactive.competitorPatterns.map((row) => (
                      <div className={styles.cleanTableRow} key={row.pattern}>
                        <strong>{row.pattern}</strong>
                        <span>{row.market}</span>
                        <span>{row.opportunity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className={`${styles.contentSection} ${styles.actionSection}`}>
                <div className={styles.sectionNumber}>04</div>
                <div className={styles.sectionBody}>
                  <p className={styles.kicker}>Приоритеты</p>
                  <h2>Три действия в правильном порядке</h2>
                  <div className={styles.actionList}>
                    {DEMO_SNAPSHOT.interactive.actions.map((action, index) => (
                      <article key={action.title}>
                        <span className={styles.actionIndex}>0{index + 1}</span>
                        <div>
                          <span className={styles.actionPriority}>{action.priority}</span>
                          <h3>{action.title}</h3>
                          <p>{action.description}</p>
                        </div>
                        <div className={styles.actionMeta}>
                          <span>{action.horizon}</span>
                          <p>{action.effect}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <div className={styles.stageAction}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => moveTo('report')}
                >
                  Открыть полный отчёт §0–8 <span>→</span>
                </button>
                <p>Подробная аргументация, roadmap, тесты, риски и источники.</p>
              </div>
            </div>
          )}

          {step === 'report' && (
            <div className={`${styles.stage} ${styles.fullReport}`}>
              <div className={styles.reportMasthead}>
                <div>
                  <p className={styles.kicker}>Шаг 4 · Полная версия</p>
                  <h1>{DEMO_SNAPSHOT.fullReport.title}</h1>
                  <p>{DEMO_SNAPSHOT.fullReport.subtitle}</p>
                </div>
                <span className={styles.reportStamp}>§0–8</span>
              </div>
              <div className={styles.reportDisclaimer}>
                <strong>Важно:</strong> названия источников скрыты только в публичном demo. В
                персональном отчёте факты сопровождаются активными ссылками, датой и оценкой
                надёжности.
              </div>

              <nav className={styles.reportIndex} aria-label="Содержание полного отчёта">
                {DEMO_SNAPSHOT.fullReport.sections.map((section) => (
                  <a key={section.id} href={`#demo-${section.id}`}>
                    <span>{section.number}</span>
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className={styles.reportSections}>
                {DEMO_SNAPSHOT.fullReport.sections.map((section) => (
                  <section
                    id={`demo-${section.id}`}
                    className={styles.reportSection}
                    key={section.id}
                  >
                    <div className={styles.reportSectionHead}>
                      <span>{section.number}</span>
                      <div>
                        <h2>{section.title}</h2>
                        <p>{section.lead}</p>
                      </div>
                    </div>
                    <div className={styles.reportBlocks}>
                      {section.blocks.map((block) => (
                        <ReportBlock key={block.title} block={block} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <section className={styles.finalCta}>
                <p className={styles.kicker}>Следующий шаг</p>
                <h2>{DEMO_SNAPSHOT.cta.title}</h2>
                <p>{DEMO_SNAPSHOT.cta.text}</p>
                <div>
                  <Link href={DEMO_SNAPSHOT.cta.paidHref} className={styles.primaryButton}>
                    {DEMO_SNAPSHOT.cta.paidLabel} <span>→</span>
                  </Link>
                  <Link href={DEMO_SNAPSHOT.cta.freeHref} className={styles.secondaryButton}>
                    {DEMO_SNAPSHOT.cta.freeLabel}
                  </Link>
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
