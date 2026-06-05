'use client'

import { useState } from 'react'
import { createResearchJob } from './actions'
import { normalizeAdChannel } from './normalize'

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function IntakeForm() {
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  // Email клиента — обязателен, чтобы прислать ссылку на готовый отчёт.
  const [email, setEmail] = useState('')
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

    // Email обязателен — на него мы пришлём ссылку на готовый отчёт.
    const emailTrimmed = email.trim()
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setSubmitError('Укажите корректный email — на него придёт ссылка на готовый отчёт.')
      return
    }

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
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
      await createResearchJob(formData)
    } catch {
      setIsSubmitting(false)
    }
  }

  // Гейты для submit-кнопки — пока не выполнены, кнопка визуально неактивна.
  const filledDirsForGate = directions.map((d) => d.trim()).filter(Boolean)
  const directionsGateOk = filledDirsForGate.length < 2 || directionsIndependent !== null
  // Чекбокс требуется когда есть минимум данных (Название+Отрасль) ИЛИ был AI-разбор —
  // ровно когда блок подтверждения виден.
  const confirmationRequired = aiParseRan || Boolean(companyName.trim() && industry.trim())
  const emailValid = EMAIL_REGEX.test(email.trim())
  const canSubmit =
    !isSubmitting &&
    directionsGateOk &&
    (!confirmationRequired || parseConfirmed) &&
    dataConsent &&
    emailValid

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

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

      {/* ── Email ── */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.ru"
          className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
        />
        <p className="text-xs text-gray-500 mt-1">
          На этот адрес придёт ссылка на готовый отчёт.
        </p>
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
      {submitError && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mt-2">
          {submitError}
        </p>
      )}
    </form>
  )
}
