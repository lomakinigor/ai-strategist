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
  getProviderUsage,
  type PeriodTotals,
  type StageBreakdown,
  type JobBreakdown,
  type ProviderUsage,
} from '@/lib/cost/queries'
import { getUsdRubRate } from '@/lib/cost/rates'
import { PersonalLinkButton } from '../PersonalLinkButton'

export const dynamic = 'force-dynamic'

// Реестр провайдеров. ЛЮБОЙ новый провайдер в llm_calls.provider автоматически
// появится виджетом — для известных используется конфиг отсюда, для неизвестных
// — дефолтная карточка с названием-как-есть и предупреждением «нет конфига».
// Когда добавляешь новый провайдер (например, anthropic_direct / deepseek_direct):
//   1. Добавь сюда запись со label / dashboardUrl / color
//   2. Передавай его в recordLlmCall({ provider: '<имя>' }) при инструментации
//   3. (опционально) реализуй getXxxBalance() в queries.ts и подключи здесь
interface ProviderConfig {
  label: string
  /** URL личного кабинета провайдера */
  dashboardUrl: string
  /** Эмодзи или маленький префикс перед названием */
  emoji: string
  /** Если у провайдера есть публичный API баланса — true (рендерится отдельный widget) */
  hasBalanceApi?: boolean
}

const PROVIDER_CONFIG: Record<string, ProviderConfig> = {
  openrouter: {
    label: 'OpenRouter',
    dashboardUrl: 'https://openrouter.ai/credits',
    emoji: '🟦',
    hasBalanceApi: true,
  },
  openai: {
    label: 'OpenAI',
    dashboardUrl: 'https://platform.openai.com/usage',
    emoji: '🟢',
  },
  anthropic: {
    label: 'Anthropic (direct)',
    dashboardUrl: 'https://console.anthropic.com/settings/billing',
    emoji: '🟧',
  },
  deepseek: {
    label: 'DeepSeek (direct)',
    dashboardUrl: 'https://platform.deepseek.com/usage',
    emoji: '🐋',
  },
  yookassa: {
    label: 'YooKassa (платежи)',
    dashboardUrl: 'https://yookassa.ru/my',
    emoji: '💳',
  },
}

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

// Whitelist провайдеров с защищённым переходом. Должен совпадать с
// PROVIDER_URLS в /api/admin/personal-link/route.ts. Если в будущем
// появится новый провайдер — добавь его сначала там, потом сюда.
const KNOWN_PERSONAL_PROVIDERS = ['openrouter', 'openai', 'anthropic', 'deepseek', 'yookassa'] as const
function isKnownProvider(p: string): p is (typeof KNOWN_PERSONAL_PROVIDERS)[number] {
  return (KNOWN_PERSONAL_PROVIDERS as readonly string[]).includes(p)
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
  const [today, week, month, allTime, stageBreakdown, jobsBreakdown, balance, providerUsage, usdRubRate] = await Promise.all([
    getTotalsForPeriod(1),
    getTotalsForPeriod(7),
    getTotalsForPeriod(30),
    getTotalsForPeriod(null),
    getStageBreakdown(null),
    getJobsBreakdown(30),
    getOpenRouterBalance(),
    getProviderUsage(),
    getUsdRubRate(),
  ])

  // Список провайдеров для виджетов: всё что есть в llm_calls + те что в
  // PROVIDER_CONFIG но ещё без вызовов (показать «ждём первого вызова»).
  // Так автоматически появится виджет когда мы начнём использовать новый провайдер.
  const seenProviders = new Set(providerUsage.map((p) => p.provider))
  const knownProvidersNotYetUsed = Object.keys(PROVIDER_CONFIG).filter((p) => !seenProviders.has(p))

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      {/* Заголовок */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="lp-eyebrow lp-eyebrow-warm mb-2">Этап 1.1 admin-панели</p>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">Стоимость pipeline</h1>
        </div>
        <div className="text-xs text-[#737373] text-right">
          <p>
            Курс ЦБ: <strong className="text-[#0a0a0a]">1 $ = {usdRubRate.toFixed(2)} ₽</strong>
          </p>
          <p className="mt-0.5">Данные обновляются при каждом открытии страницы.</p>
        </div>
      </div>

      {/* Provider widgets — динамически по каждому провайдеру.
          Для OpenRouter — отдельный балансовый widget (есть API).
          Для остальных — generic с расходами из БД. */}
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {/* Виджеты по уже использованным провайдерам */}
        {providerUsage.map((usage) => {
          const cfg = PROVIDER_CONFIG[usage.provider]
          if (usage.provider === 'openrouter') {
            return <BalanceWidget key={usage.provider} balance={balance} usage={usage} config={cfg} />
          }
          return <ProviderUsageWidget key={usage.provider} usage={usage} config={cfg} providerKey={usage.provider} />
        })}
        {/* Виджеты-заглушки для известных, но ещё не использованных провайдеров */}
        {knownProvidersNotYetUsed.map((p) => (
          <ProviderUsageWidget key={p} usage={null} config={PROVIDER_CONFIG[p]} providerKey={p} />
        ))}
      </div>

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

// BalanceWidget — для провайдеров с публичным API баланса (сейчас только OpenRouter).
// Показывает остаток + цвет (зелёный/жёлтый/красный) + ссылку на пополнение.
function BalanceWidget({
  balance,
  usage,
  config,
}: {
  balance: { totalCredits: number; totalUsage: number; remaining: number } | null
  usage: ProviderUsage
  config: ProviderConfig | undefined
}) {
  const label = config?.label ?? 'OpenRouter'
  const dashboardUrl = config?.dashboardUrl ?? 'https://openrouter.ai/credits'

  if (!balance) {
    return (
      <div className="border border-yellow-200 bg-yellow-50 rounded p-4 text-sm">
        <p className="text-[11px] uppercase tracking-wider font-bold mb-1">{label}</p>
        <p className="mb-2">Баланс недоступен (нет ключа или сеть). Проверь личный кабинет:</p>
        <PersonalLinkButton provider="openrouter" label={`Открыть ${label}`} />
        <span className="ml-2 text-xs text-[#737373]">
          ({dashboardUrl.replace(/^https?:\/\//, '')})
        </span>
      </div>
    )
  }

  const isLow = balance.remaining < 5
  const isCritical = balance.remaining < 1
  const bg = isCritical ? 'bg-red-50 border-red-200' : isLow ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
  const stateEmoji = isCritical ? '🔴' : isLow ? '🟡' : '🟢'

  return (
    <div className={`border rounded p-4 ${bg}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold mb-1">
            Баланс {label} {stateEmoji}
          </p>
          <p className="text-xl font-bold">
            ${balance.remaining.toFixed(2)} осталось из ${balance.totalCredits.toFixed(2)}
          </p>
          <p className="text-xs text-[#525252] mt-1">
            Потрачено: ${balance.totalUsage.toFixed(2)} · в нашей БД: ${usage.totalUsd.toFixed(2)} ({usage.callsCount} вызовов)
          </p>
        </div>
        <PersonalLinkButton provider="openrouter" label="Пополнить" />
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

// ProviderUsageWidget — для любого провайдера БЕЗ публичного API баланса.
// Показывает суммарный расход из нашей БД (llm_calls) + разбивку 24ч/7д/30д +
// ссылку на dashboard провайдера. Используется для OpenAI, Anthropic direct,
// DeepSeek direct, YooKassa и любых будущих провайдеров.
function ProviderUsageWidget({
  usage,
  config,
  providerKey,
}: {
  usage: ProviderUsage | null
  config: ProviderConfig | undefined
  providerKey: string
}) {
  const label = config?.label ?? providerKey
  const emoji = config?.emoji ?? '⚙️'
  const dashboardUrl = config?.dashboardUrl

  // Нет вызовов вообще (заглушка для известных провайдеров до первого использования)
  if (!usage || usage.callsCount === 0) {
    return (
      <div className="border border-[#e5e5e5] rounded p-4 bg-[#fafafa]">
        <p className="text-[11px] uppercase tracking-wider font-bold mb-1">{label} {emoji}</p>
        <p className="text-sm text-[#525252]">
          Ещё нет вызовов. Появятся после первого использования провайдера.
        </p>
        {dashboardUrl && isKnownProvider(providerKey) && (
          <div className="mt-3">
            <PersonalLinkButton
              provider={providerKey as 'openrouter' | 'openai' | 'anthropic' | 'deepseek' | 'yookassa'}
              label="Открыть dashboard"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border border-[#e5e5e5] rounded p-4 bg-[#fafafa]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold mb-1">
            Расходы {label} {emoji}
          </p>
          <p className="text-xl font-bold">${usage.totalUsd.toFixed(4)}</p>
          <p className="text-xs text-[#525252] mt-1">
            {usage.callsCount} вызовов · {usage.totalRub.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
          </p>
        </div>
        {dashboardUrl && isKnownProvider(providerKey) && (
          <PersonalLinkButton
            provider={providerKey as 'openrouter' | 'openai' | 'anthropic' | 'deepseek' | 'yookassa'}
            label="Dashboard"
          />
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[#737373]">За 24ч</p>
          <p className="font-semibold">${usage.todayUsd.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-[#737373]">За 7д</p>
          <p className="font-semibold">${usage.weekUsd.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-[#737373]">За 30д</p>
          <p className="font-semibold">${usage.monthUsd.toFixed(4)}</p>
        </div>
      </div>
      {!config && (
        <p className="text-[10px] text-amber-700 mt-2 italic">
          Провайдер «{providerKey}» не зарегистрирован в PROVIDER_CONFIG —
          добавь конфиг в app/admin/costs/page.tsx для красивого названия и ссылки на dashboard.
        </p>
      )}
    </div>
  )
}
