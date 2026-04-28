'use client'

import { useState } from 'react'
import { createResearchJob } from './actions'

const RF_CHANNELS = [
  'ВКонтакте',
  'Telegram',
  'YouTube',
  'Instagram',
  'TikTok',
  'Одноклассники',
  'Яндекс.Дзен',
  'Авито',
  'MAX',
]

export default function IntakeForm() {
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [goals, setGoals] = useState('')
  const [competitors, setCompetitors] = useState('')
  const [contextNotes, setContextNotes] = useState('')
  const [channels, setChannels] = useState<string[]>([])
  const [channelsOther, setChannelsOther] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState(false)

  async function handleParse() {
    if (!contextNotes.trim()) return
    setIsParsing(true)
    setParseError(false)
    try {
      const res = await fetch('/api/parse-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contextNotes }),
      })
      const parsed = await res.json()
      if (parsed.company_name && !companyName) setCompanyName(parsed.company_name)
      if (parsed.industry && !industry) setIndustry(parsed.industry)
      if (parsed.description && !description) setDescription(parsed.description)
      if (parsed.website && !website) setWebsite(parsed.website)
      if (parsed.goals && !goals) setGoals(parsed.goals)
      if (parsed.competitors && !competitors) setCompetitors(parsed.competitors)
      if (Array.isArray(parsed.channels) && parsed.channels.length > 0) {
        const valid = parsed.channels.filter((ch: string) => RF_CHANNELS.includes(ch))
        setChannels((prev) => [...new Set([...prev, ...valid])])
      }
    } catch {
      setParseError(true)
    } finally {
      setIsParsing(false)
    }
  }

  function toggleChannel(ch: string) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    )
  }

  return (
    <form action={createResearchJob} className="space-y-5 bg-white p-6 rounded-lg border border-gray-200">
      {/* ── Context notes (AI parse) — top of form ── */}
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
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleParse}
            disabled={isParsing || !contextNotes.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isParsing ? 'Разбираю…' : 'Разобрать с помощью AI →'}
          </button>
          {parseError && (
            <span className="text-xs text-red-500">Ошибка парсинга, заполните поля вручную</span>
          )}
          <span className="text-xs text-gray-400">Необязательно. Чем больше данных — тем точнее стратегия.</span>
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
        <p className="mt-1 text-xs text-gray-400">Через запятую. Будут включены в анализ рынка.</p>
      </div>

      {/* ── Channels ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Каналы присутствия компании
        </label>
        <div className="grid grid-cols-2 gap-2">
          {RF_CHANNELS.map((ch) => (
            <label key={ch} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="channels"
                value={ch}
                checked={channels.includes(ch)}
                onChange={() => toggleChannel(ch)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {ch}
            </label>
          ))}
        </div>
        <div className="mt-2">
          <input
            name="channels_other"
            type="text"
            value={channelsOther}
            onChange={(e) => setChannelsOther(e.target.value)}
            placeholder="Другие каналы (через запятую)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Запустить исследование
      </button>
    </form>
  )
}
