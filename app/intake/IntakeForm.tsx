'use client'

import { useEffect, useState } from 'react'
import { createResearchJob } from './actions'
import { normalizeAdChannel } from './normalize'
import { ymGoal } from '../YandexMetrica'

// localStorage save-draft: версионированный ключ, чтобы при изменении схемы
// можно было инвалидировать старые черновики. UX-аудит 2.10 «Память контекста».
const DRAFT_KEY = 'ai-strategist-intake-draft-v1'

interface DraftV1 {
  v: 1
  step: 1 | 2 | 3
  companyName: string
  industry: string
  description: string
  website: string
  goals: string
  competitors: string
  contextNotes: string
  directions: string[]
  directionsIndependent: boolean | null
  adChannels: string[]
  adChannelOther: string
  adChannelsUnknown: boolean
  isChain: boolean
  chainScope: 'network' | 'location'
  city: string
}

interface IntakeFormProps {
  tier: 'free' | 'paid'
}

const AD_CHANNEL_OPTIONS = [
  'Яндекс.Директ',
  'Авито',
  'SEO',
  'ВКонтакте',
  'Telegram',
  '2ГИС/Карты',
  'Email-рассылка',
  'Выставки/тендеры',
] as const

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function IntakeForm({ tier }: IntakeFormProps) {
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [goals, setGoals] = useState('')
  const [competitors, setCompetitors] = useState('')
  const [contextNotes, setContextNotes] = useState('')
  const [directions, setDirections] = useState<string[]>([''])
  const [directionsIndependent, setDirectionsIndependent] = useState<boolean | null>(null)
  const [adChannels, setAdChannels] = useState<string[]>([])
  const [adChannelOther, setAdChannelOther] = useState('')
  const [adChannelsUnknown, setAdChannelsUnknown] = useState(false)
  const [isChain, setIsChain] = useState(false)
  const [chainScope, setChainScope] = useState<'network' | 'location'>('location')
  const [city, setCity] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  // Запускался ли AI-разбор успешно — нужно, чтобы потребовать подтверждение от клиента.
  const [aiParseRan, setAiParseRan] = useState(false)
  // Клиент явно подтвердил, что AI всё понял правильно (после ручной проверки полей).
  const [parseConfirmed, setParseConfirmed] = useState(false)
  // 152-ФЗ: явное согласие на обработку персональных данных. Не предзаполнено
  // (требование закона). Без галочки submit заблокирован.
  const [dataConsent, setDataConsent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Wizard-state: разбиваем форму на 3 шага (UX-аудит топ-5).
  // 1 «О бизнесе» → 2 «Деятельность и рынок» → 3 «Цели и запуск».
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  // Восстановили ли мы драфт — нужно, чтобы показать пользователю явный сигнал
  // «нашли ваши данные за прошлый раз», а не делать это молча.
  const [draftRestored, setDraftRestored] = useState(false)

  // Restore из localStorage при монтировании. Запускается один раз.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as DraftV1
      if (draft.v !== 1) return
      // Не восстанавливаем если черновик полностью пустой (от прошлого посещения
      // когда юзер только открыл и закрыл страницу).
      const hasContent = Boolean(
        draft.companyName ||
          draft.industry ||
          draft.contextNotes ||
          draft.description ||
          draft.competitors,
      )
      if (!hasContent) return
      setCompanyName(draft.companyName ?? '')
      setIndustry(draft.industry ?? '')
      setDescription(draft.description ?? '')
      setWebsite(draft.website ?? '')
      setGoals(draft.goals ?? '')
      setCompetitors(draft.competitors ?? '')
      setContextNotes(draft.contextNotes ?? '')
      setDirections(draft.directions?.length ? draft.directions : [''])
      setDirectionsIndependent(draft.directionsIndependent ?? null)
      setAdChannels(draft.adChannels ?? [])
      setAdChannelOther(draft.adChannelOther ?? '')
      setAdChannelsUnknown(draft.adChannelsUnknown ?? false)
      setIsChain(draft.isChain ?? false)
      setChainScope(draft.chainScope ?? 'location')
      setCity(draft.city ?? '')
      setCurrentStep(draft.step ?? 1)
      setDraftRestored(true)
    } catch {
      // Битый JSON — игнорируем, начинаем с чистого листа.
    }
  }, [])

  // Save в localStorage при любом изменении состояния. localStorage.setItem
  // ~1мс, дебаунс не нужен. Не сохраняем пустую форму (избегаем «фантомных»
  // драфтов от мимолётных посещений).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasContent = Boolean(
      companyName || industry || contextNotes || description || competitors,
    )
    if (!hasContent) return
    try {
      const draft: DraftV1 = {
        v: 1,
        step: currentStep,
        companyName,
        industry,
        description,
        website,
        goals,
        competitors,
        contextNotes,
        directions,
        directionsIndependent,
        adChannels,
        adChannelOther,
        adChannelsUnknown,
        isChain,
        chainScope,
        city,
      }
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Квота localStorage / приватный режим Safari — продолжаем работать без save.
    }
  }, [
    companyName,
    industry,
    description,
    website,
    goals,
    competitors,
    contextNotes,
    directions,
    directionsIndependent,
    adChannels,
    adChannelOther,
    adChannelsUnknown,
    isChain,
    chainScope,
    city,
    currentStep,
  ])

  async function handleParse() {
    if (!contextNotes.trim()) return
    setIsParsing(true)
    setParseError(null)
    try {
      const res = await fetch('/api/parse-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contextNotes }),
      })
      if (res.status === 503) {
        setParseError('OPENROUTER_API_KEY не задан — заполните поля вручную')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.error === 'provider_unavailable') {
          setParseError('OpenRouter временно недоступен — повторите через минуту')
        } else {
          setParseError('Ошибка парсинга — заполните поля вручную')
        }
        return
      }
      const parsed = await res.json()

      // Проверка «AI хоть что-то извлёк» — иначе показывать «AI заполнил поля выше» нечестно.
      const hasAnyParsedField = Boolean(
        parsed.company_name ||
          parsed.industry ||
          parsed.description ||
          parsed.website ||
          parsed.goals ||
          parsed.competitors ||
          (Array.isArray(parsed.directions) && parsed.directions.length) ||
          (Array.isArray(parsed.ad_channels) && parsed.ad_channels.length),
      )
      if (!hasAnyParsedField) {
        setParseError(
          'AI не нашёл данных для заполнения в вашем тексте — дайте больше контекста (название компании, отрасль, описание, ссылки) или заполните поля вручную.',
        )
        return
      }

      if (parsed.company_name && !companyName) setCompanyName(parsed.company_name)
      if (parsed.industry && !industry) setIndustry(parsed.industry)
      if (parsed.description && !description) setDescription(parsed.description)
      if (parsed.website && !website) setWebsite(parsed.website)
      if (parsed.goals && !goals) setGoals(parsed.goals)
      if (parsed.competitors && !competitors) setCompetitors(parsed.competitors)

      // Направления — заполняем, только если пользователь ещё ничего не ввёл
      if (Array.isArray(parsed.directions) && directions.every((d) => !d.trim())) {
        const dirs = parsed.directions.map((d: unknown) => String(d).trim()).filter(Boolean)
        if (dirs.length) setDirections(dirs)
      }

      // Рекламные каналы — предотметка из текста (черновик, пользователь подтвердит)
      if (Array.isArray(parsed.ad_channels) && adChannels.length === 0 && !adChannelsUnknown) {
        const matched = new Set<string>()
        const extras: string[] = []
        for (const c of parsed.ad_channels) {
          const norm = normalizeAdChannel(String(c))
          if (norm) matched.add(norm)
          else if (String(c).trim()) extras.push(String(c).trim())
        }
        if (matched.size) setAdChannels(Array.from(matched))
        if (extras.length && !adChannelOther) setAdChannelOther(extras.join(', '))
      }

      // AI-разбор прошёл успешно → требуем явное подтверждение клиента (правило 4)
      setAiParseRan(true)
      setParseConfirmed(false)
      setSubmitError(null)
    } catch {
      setParseError('Ошибка парсинга — заполните поля вручную')
    } finally {
      setIsParsing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)

    // Если юзер нажал Enter не на финальном шаге — это переход «Далее», не submit.
    if (currentStep !== 3) {
      goNext()
      return
    }

    const filledDirections = directions.map((d) => d.trim()).filter(Boolean)

    // Правило 2: при 2+ направлениях обязательно выбрать характер связи (разные / одно).
    if (filledDirections.length >= 2 && directionsIndependent === null) {
      setSubmitError(
        'Уточните, как связаны направления (разные / одно связанное предложение) — это критично для корректного анализа.',
      )
      return
    }

    // Правило 4: финальная отметка ОБЯЗАТЕЛЬНА — и после AI-разбора, и при ручном заполнении.
    if (!parseConfirmed) {
      setSubmitError(
        aiParseRan
          ? 'Поставьте галочку «Да, AI всё понял верно» в блоке внизу формы — это финальный шаг перед запуском. Если что-то неверно — поправьте прямо в полях выше и затем поставьте галочку.'
          : 'Поставьте галочку «Да, всё верно» в блоке внизу формы — это финальный шаг перед запуском.',
      )
      return
    }

    // 152-ФЗ: без согласия на обработку персональных данных запуск невозможен.
    if (!dataConsent) {
      setSubmitError(
        'Подтвердите согласие на обработку персональных данных и условия публичной оферты — это требование закона.',
      )
      return
    }

    setIsSubmitting(true)

    // ВАЖНО: собираем FormData ИЗ STATE, а не из e.currentTarget. На wizard
    // в момент submit в DOM есть только поля шага 3 (1 и 2 размонтированы
    // условным рендером), поэтому FormData(e.currentTarget) был бы пуст по
    // company_name/industry — и серверная валидация ронялась бы тихо.
    const formData = new FormData()
    formData.set('company_name', companyName.trim())
    formData.set('industry', industry.trim())
    formData.set('tier', tier)

    // ?version=v2 → пробрасываем в server-action, иначе он не видит query-параметров
    // и редиректит на /research/{id} без version, теряя v2-путь.
    if (typeof window !== 'undefined') {
      const v = new URLSearchParams(window.location.search).get('version')
      if (v === 'v2') formData.set('version', 'v2')
    }
    if (description.trim()) formData.set('description', description.trim())
    if (website.trim()) formData.set('website', website.trim())
    if (goals.trim()) formData.set('research_goal', goals.trim())
    if (competitors.trim()) formData.set('competitors', competitors.trim())
    if (contextNotes.trim()) formData.set('context_notes', contextNotes.trim())

    formData.set('is_chain', isChain ? '1' : '0')
    if (isChain) {
      formData.set('chain_scope', chainScope)
      if (chainScope === 'location') formData.set('city', city)
    }

    // Направления (по строкам) + флаг связи (только если их 2+)
    filledDirections.forEach((d) => formData.append('direction', d))
    if (filledDirections.length >= 2 && directionsIndependent !== null) {
      formData.set('directions_independent', directionsIndependent ? '1' : '0')
    }

    // Используемые рекламные каналы
    if (adChannelsUnknown) {
      formData.set('ad_channels_unknown', '1')
    } else {
      adChannels.forEach((c) => formData.append('ad_channel', c))
      const other = adChannelOther.trim()
      if (other) formData.append('ad_channel', `Другое: ${other}`)
    }

    try {
      // Очищаем draft до redirect — после createResearchJob клиент уйдёт на
      // /research/[id] и сюда больше не вернётся, состояние больше не нужно.
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(DRAFT_KEY)
        } catch {
          /* ignore — приватный режим / квота */
        }
      }
      await createResearchJob(formData)
    } catch (err) {
      // redirect() в Next.js server-actions кидает специальный NEXT_REDIRECT —
      // он должен пробрасываться, иначе навигация не произойдёт.
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
        // Анкета успешно ушла на сервер — фиксируем цель ДО навигации.
        // ymGoal внутри использует navigator.sendBeacon, переживает unload.
        ymGoal('intake_submitted')
        throw err
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Не удалось запустить исследование. Попробуйте ещё раз или напишите нам.'
      setSubmitError(message)
      setIsSubmitting(false)
    }
  }

  // Гейты для submit-кнопки — пока не выполнены, кнопка визуально неактивна.
  const filledDirsForGate = directions.map((d) => d.trim()).filter(Boolean)
  const directionsGateOk = filledDirsForGate.length < 2 || directionsIndependent !== null
  // Чекбокс требуется когда есть минимум данных (Название+Отрасль) ИЛИ был AI-разбор —
  // ровно когда блок подтверждения виден.
  const confirmationRequired = aiParseRan || Boolean(companyName.trim() && industry.trim())
  const canSubmit =
    !isSubmitting &&
    directionsGateOk &&
    (!confirmationRequired || parseConfirmed) &&
    dataConsent

  // Валидация перехода между шагами (мягкая — кнопка disabled пока не выполнено).
  const canAdvanceFromStep1 = Boolean(companyName.trim() && industry.trim())
  const canAdvanceFromStep2 = directionsGateOk

  function goNext() {
    setSubmitError(null)
    if (currentStep === 1) {
      if (!canAdvanceFromStep1) {
        setSubmitError('Заполните название, отрасль и корректный email — потом сможем идти дальше.')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!canAdvanceFromStep2) {
        setSubmitError(
          'Если направлений больше одного — выберите, как они связаны (разные ниши / одно предложение).',
        )
        return
      }
      setCurrentStep(3)
    }
    // Прокрутить наверх формы, чтобы первый блок нового шага был виден.
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    setSubmitError(null)
    if (currentStep === 3) setCurrentStep(2)
    else if (currentStep === 2) setCurrentStep(1)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Прогресс-бар ─────────────────────────────────────────────────── */}
      <StepProgress current={currentStep} />

      {/* ── Сигнал о восстановленном черновике ───────────────────────────── */}
      {draftRestored && (
        <div className="rounded-md border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-[#1e3a8a] leading-snug">
            Восстановили данные с прошлого визита. Если хотите начать с чистого
            листа — нажмите справа.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                try {
                  window.localStorage.removeItem(DRAFT_KEY)
                } catch {
                  /* ignore */
                }
              }
              window.location.reload()
            }}
            className="text-xs font-semibold text-[#1e3a8a] underline hover:text-[#172554] shrink-0 cursor-pointer"
          >
            Начать заново
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ШАГ 1 — О бизнесе (контекст + название + email + чейн + отрасль)
          ═══════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
      <>
      {/* ── Context notes (AI parse) ── */}
      <div>
        <label htmlFor="context_notes" className="block text-sm font-medium text-gray-700 mb-1">
          Дополнительная информация о компании
        </label>
        <textarea
          id="context_notes"
          name="context_notes"
          rows={6}
          value={contextNotes}
          onChange={(e) => setContextNotes(e.target.value)}
          placeholder="Вставьте любую информацию: описание продуктов, данные о клиентах, конкурентах, метрики, КП, отзывы — система сама разберёт и заполнит поля ниже."
          className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] resize-none"
        />
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleParse}
            disabled={isParsing || !contextNotes.trim()}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#eff6ff] text-[#1e3a8a] border border-[#dbeafe] hover:bg-[#dbeafe] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors select-none"
          >
            {isParsing ? <Spinner /> : null}
            {isParsing ? 'Разбираю…' : 'Разобрать с помощью AI →'}
          </button>
          {parseError && <span className="text-xs text-red-500">{parseError}</span>}
          {!parseError && !isParsing && !aiParseRan && (
            <span className="text-xs text-gray-400">Необязательно. Чем больше данных — тем точнее стратегия.</span>
          )}
        </div>

        {/* Видимый индикатор обработки (правило 3) */}
        {isParsing && (
          <div className="mt-3 flex items-center gap-3 rounded-md bg-[#eff6ff] border border-[#dbeafe] px-4 py-3">
            <Spinner />
            <p className="text-sm text-[#1e3a8a]">
              Обрабатываем информацию — это занимает 10–30 секунд. Пожалуйста, подождите…
            </p>
          </div>
        )}

      </div>

      <hr className="border-gray-100" />

      {/* ── Company name ── */}
      <div>
        <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
          Название компании <span className="text-red-500">*</span>
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="ООО «Ромашка»"
          className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
        />
      </div>

      {/* ── Chain / network ── */}
      <div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isChain}
            onChange={(e) => setIsChain(e.target.checked)}
            className="rounded border-[#e5e5e5] text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
          />
          У компании несколько точек или филиалов (сеть или франшиза)
        </label>
        <p className="text-xs text-gray-400 mt-1 ml-6">
          Если отметите — уточним, что анализировать: одну вашу точку (по умолчанию) или всю сеть.
        </p>
        {isChain && (
          <div className="mt-3 ml-6 space-y-2">
            <p className="text-xs font-medium text-gray-600">Что анализировать?</p>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="radio"
                  name="chain_scope_ui"
                  checked={chainScope === 'location'}
                  onChange={() => setChainScope('location')}
                  className="text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
                />
                Одну конкретную точку
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="radio"
                  name="chain_scope_ui"
                  checked={chainScope === 'network'}
                  onChange={() => setChainScope('network')}
                  className="text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
                />
                Всю сеть целиком
              </label>
            </div>
            {chainScope === 'location' && (
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Город и/или адрес точки"
                className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
            )}
          </div>
        )}
      </div>

      {/* ── Industry ── */}
      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
          Отрасль / ниша <span className="text-red-500">*</span>
        </label>
        <input
          id="industry"
          name="industry"
          type="text"
          required
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="например: B2B SaaS, e-commerce, строительство"
          className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
        />
      </div>
      </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ШАГ 2 — Деятельность и рынок (направления + сайт + каналы + конкуренты)
          ═══════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
      <>
      {/* ── Directions ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Направления деятельности</label>
        <p className="text-xs text-gray-400 mb-2">
          Если направлений несколько и они не связаны (разные продукты / разные клиенты) — добавьте каждое
          отдельной строкой. Это не даст приложению склеить разные ниши в одну.
        </p>
        <div className="space-y-2">
          {directions.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={d}
                onChange={(e) =>
                  setDirections((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                }
                placeholder={
                  i === 0 ? 'например: производство промышленного оборудования' : 'ещё одно направление'
                }
                className="flex-1 border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
              {directions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDirections((prev) => prev.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-500 text-xl leading-none cursor-pointer"
                  aria-label="Убрать направление"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDirections((prev) => [...prev, ''])}
          className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer"
        >
          + добавить направление
        </button>

        {directions.map((d) => d.trim()).filter(Boolean).length >= 2 && (
          <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 space-y-2">
            <p className="text-xs font-medium text-amber-800">
              Как связаны эти направления? <span className="text-red-600">обязательно</span>
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="radio"
                name="dir_rel_ui"
                checked={directionsIndependent === true}
                onChange={() => setDirectionsIndependent(true)}
                className="text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
              />
              Разные направления — разные клиенты / рынки (анализировать раздельно)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="radio"
                name="dir_rel_ui"
                checked={directionsIndependent === false}
                onChange={() => setDirectionsIndependent(false)}
                className="text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
              />
              Одно связанное предложение для одного клиента
            </label>
          </div>
        )}
      </div>

      {/* ── Description ── */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Краткое описание бизнеса
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Чем занимается компания, какой продукт или услугу предлагает"
          className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] resize-none"
        />
      </div>

      {/* ── Website ── */}
      <div>
        <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
          Сайт компании
        </label>
        <input
          id="website"
          name="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.ru"
          className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
        />
      </div>

      {/* ── Ad channels already used ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Какими каналами рекламы уже пользуетесь?
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Отметьте те, что реально используете. Это не даст приложению ошибочно решить, что канал не
          используется.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {AD_CHANNEL_OPTIONS.map((c) => (
            <label
              key={c}
              className={`flex items-center gap-2 text-sm cursor-pointer select-none ${
                adChannelsUnknown ? 'opacity-40' : 'text-gray-700'
              }`}
            >
              <input
                type="checkbox"
                disabled={adChannelsUnknown}
                checked={adChannels.includes(c)}
                onChange={(e) =>
                  setAdChannels((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))
                }
                className="rounded border-[#e5e5e5] text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
              />
              {c}
            </label>
          ))}
        </div>
        <input
          type="text"
          value={adChannelOther}
          disabled={adChannelsUnknown}
          onChange={(e) => setAdChannelOther(e.target.value)}
          placeholder="Другое (через запятую)"
          className="mt-2 w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] disabled:opacity-40"
        />
        <label className="mt-2 flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={adChannelsUnknown}
            onChange={(e) => {
              setAdChannelsUnknown(e.target.checked)
              if (e.target.checked) {
                setAdChannels([])
                setAdChannelOther('')
              }
            }}
            className="rounded border-[#e5e5e5] cursor-pointer"
          />
          пока не знаю / не уверен, какими каналами пользуемся
        </label>
      </div>

      {/* ── Competitors ── */}
      <div>
        <label htmlFor="competitors" className="block text-sm font-medium text-gray-700 mb-1">
          Конкуренты
        </label>
        <input
          id="competitors"
          name="competitors"
          type="text"
          value={competitors}
          onChange={(e) => setCompetitors(e.target.value)}
          placeholder="Компания А, Компания Б, бренд В"
          className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
        />
        <p className="mt-1 text-xs text-gray-400">Через запятую. Желательно указать ссылку на сайт рядом с названием: «Компания А (company-a.ru), Компания Б».</p>
      </div>
      </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ШАГ 3 — Цели и запуск (goal + parseConfirmed + 152-ФЗ + submit)
          ═══════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
      <>
      {/* ── Research goal ── */}
      <div>
        <label htmlFor="research_goal" className="block text-sm font-medium text-gray-700 mb-1">
          Цель исследования
        </label>
        <textarea
          id="research_goal"
          name="research_goal"
          rows={2}
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="Что хотите понять или получить от исследования"
          className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] resize-none"
        />
      </div>

      {/* Финальное подтверждение — единый гейт для AI-fill и manual-fill (правило 4).
          Показываем когда есть минимум данных (Название+Отрасль) ИЛИ был AI-разбор. */}
      {!isParsing && (aiParseRan || (companyName.trim() && industry.trim())) && (
        <div
          className={`rounded-md border px-4 py-3 ${
            parseConfirmed
              ? 'bg-green-50 border-green-200'
              : aiParseRan
                ? 'bg-amber-50 border-amber-200'
                : 'bg-[#eff6ff] border-[#dbeafe]'
          }`}
        >
          <p
            className={`text-sm mb-2 ${
              parseConfirmed ? 'text-green-800' : aiParseRan ? 'text-amber-900' : 'text-[#1e3a8a]'
            }`}
          >
            {aiParseRan ? (
              <>
                AI заполнил поля выше.{' '}
                <strong>Если что-то неверно — поправьте прямо в полях</strong> (уберите лишнее,
                добавьте недостающее). Когда всё проверено — поставьте галочку «Да», кнопка запуска
                станет активной.
              </>
            ) : (
              <>
                Просмотрите поля выше.{' '}
                <strong>Если что-то нужно исправить — измените прямо в полях.</strong> Если
                заполняли сами — поставьте галочку «Да», кнопка запуска станет активной.
              </>
            )}
          </p>
          <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={parseConfirmed}
              onChange={(e) => {
                setParseConfirmed(e.target.checked)
                if (e.target.checked) setSubmitError(null)
              }}
              className="rounded border-[#e5e5e5] text-[#1e3a8a] focus:ring-[#1e3a8a] mt-0.5 cursor-pointer"
            />
            <span
              className={
                parseConfirmed
                  ? 'text-green-900'
                  : aiParseRan
                    ? 'text-amber-900 font-medium'
                    : 'text-[#1e3a8a] font-medium'
              }
            >
              {aiParseRan
                ? 'Да, мы правильно интерпретировали информацию — AI всё понял верно'
                : 'Да, все данные верны — можно запускать'}
            </span>
          </label>
        </div>
      )}

      {/* 152-ФЗ: согласие на обработку перс. данных и принятие оферты.
          Чекбокс НЕ предзаполнен — требование закона. */}
      <div className="rounded-md border border-[#e5e5e5] bg-[#fafafa] px-4 py-3">
        <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dataConsent}
            onChange={(e) => {
              setDataConsent(e.target.checked)
              if (e.target.checked) setSubmitError(null)
            }}
            className="rounded border-[#e5e5e5] text-[#1e3a8a] focus:ring-[#1e3a8a] mt-0.5 cursor-pointer shrink-0"
          />
          <span className="text-gray-700 leading-snug">
            Я согласен на обработку моих персональных данных в соответствии с{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1e3a8a] underline hover:text-[#172554]"
            >
              Политикой обработки персональных данных
            </a>{' '}
            и принимаю условия{' '}
            <a
              href="/offer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1e3a8a] underline hover:text-[#172554]"
            >
              публичной оферты
            </a>
            .
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        title={!canSubmit ? 'Поставьте галочку «Да» и согласие 152-ФЗ — это финальный шаг перед запуском' : undefined}
        className="lp-btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Spinner /> : null}
        {isSubmitting ? 'Запускаю исследование…' : 'Запустить исследование'}
        {!isSubmitting && <span aria-hidden>→</span>}
      </button>
      </>
      )}

      {/* ── Ошибка submit + ошибка navigation ─────────────────────────────── */}
      {submitError && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {submitError}
        </p>
      )}

      {/* ── Навигация шагов (Назад / Далее) ───────────────────────────────── */}
      {currentStep < 3 && (
        <div className="flex items-center gap-3 pt-2">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="lp-btn-secondary"
            >
              ← Назад
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={currentStep === 1 ? !canAdvanceFromStep1 : !canAdvanceFromStep2}
            className="lp-btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            Далее
            <span aria-hidden>→</span>
          </button>
        </div>
      )}
      {currentStep === 3 && (
        <button
          type="button"
          onClick={goBack}
          className="lp-btn-secondary"
        >
          ← Назад
        </button>
      )}
    </form>
  )
}

// ─── Прогресс-бар (3 шага) ────────────────────────────────────────────────────
function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'О бизнесе' },
    { n: 2, label: 'Рынок' },
    { n: 3, label: 'Запуск' },
  ] as const

  return (
    <div className="flex items-center gap-2 mb-2">
      {steps.map((s, i) => {
        const isActive = current === s.n
        const isDone = current > s.n
        return (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center gap-2 ${
                isActive ? 'text-[#1e3a8a]' : isDone ? 'text-[#0a0a0a]' : 'text-[#6b7280]'
              }`}
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0 ${
                  isActive
                    ? 'bg-[#1e3a8a] text-white'
                    : isDone
                      ? 'bg-[#0a0a0a] text-white'
                      : 'bg-[#e5e5e5] text-[#6b7280]'
                }`}
              >
                {isDone ? '✓' : s.n}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] hidden sm:inline">
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 ${
                  current > s.n ? 'bg-[#0a0a0a]' : 'bg-[#e5e5e5]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
