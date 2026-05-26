'use client'

import { useState } from 'react'
import { createResearchJob } from './actions'

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

export default function IntakeForm() {
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
  const [chainScope, setChainScope] = useState<'network' | 'location'>('network')
  const [city, setCity] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      if (parsed.company_name && !companyName) setCompanyName(parsed.company_name)
      if (parsed.industry && !industry) setIndustry(parsed.industry)
      if (parsed.description && !description) setDescription(parsed.description)
      if (parsed.website && !website) setWebsite(parsed.website)
      if (parsed.goals && !goals) setGoals(parsed.goals)
      if (parsed.competitors && !competitors) setCompetitors(parsed.competitors)


    } catch {
      setParseError('Ошибка парсинга — заполните поля вручную')
    } finally {
      setIsParsing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    formData.set('is_chain', isChain ? '1' : '0')
    if (isChain) {
      formData.set('chain_scope', chainScope)
      if (chainScope === 'location') formData.set('city', city)
    }

    // Направления (по строкам) + флаг связи (только если их 2+)
    const filledDirections = directions.map((d) => d.trim()).filter(Boolean)
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-lg border border-gray-200">

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
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleParse}
            disabled={isParsing || !contextNotes.trim()}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 active:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors select-none"
          >
            {isParsing ? <Spinner /> : null}
            {isParsing ? 'Разбираю…' : 'Разобрать с помощью AI →'}
          </button>
          {parseError && <span className="text-xs text-red-500">{parseError}</span>}
          {!parseError && (
            <span className="text-xs text-gray-400">Необязательно. Чем больше данных — тем точнее стратегия.</span>
          )}
        </div>
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
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ── Chain / network ── */}
      <div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isChain}
            onChange={(e) => setIsChain(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          Это сетевая компания или франшиза
        </label>
        {isChain && (
          <div className="mt-3 ml-6 space-y-2">
            <p className="text-xs font-medium text-gray-600">Что анализировать?</p>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="radio"
                  name="chain_scope_ui"
                  checked={chainScope === 'network'}
                  onChange={() => setChainScope('network')}
                  className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                Всю сеть целиком
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="radio"
                  name="chain_scope_ui"
                  checked={chainScope === 'location'}
                  onChange={() => setChainScope('location')}
                  className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                Одну конкретную точку
              </label>
            </div>
            {chainScope === 'location' && (
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Город и/или адрес точки"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <p className="text-xs font-medium text-amber-800">Как связаны эти направления?</p>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="radio"
                name="dir_rel_ui"
                checked={directionsIndependent === true}
                onChange={() => setDirectionsIndependent(true)}
                className="text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              Разные направления — разные клиенты / рынки (анализировать раздельно)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="radio"
                name="dir_rel_ui"
                checked={directionsIndependent === false}
                onChange={() => setDirectionsIndependent(false)}
                className="text-blue-600 focus:ring-blue-500 cursor-pointer"
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
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
          className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
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
            className="rounded border-gray-300 cursor-pointer"
          />
          пока не знаю / не уверен
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
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors select-none"
      >
        {isSubmitting ? <Spinner /> : null}
        {isSubmitting ? 'Запускаю исследование…' : 'Запустить исследование'}
      </button>
    </form>
  )
}
