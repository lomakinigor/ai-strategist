import { createResearchJob } from './actions'

export const metadata = {
  title: 'Новое исследование — AI-Стратег',
}

export default function IntakePage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Новое исследование</h1>
          <p className="mt-2 text-gray-600">
            Заполните форму — система автоматически проведёт исследование вашего бизнеса,
            рынка и целевой аудитории.
          </p>
        </div>

        <form action={createResearchJob} className="space-y-5 bg-white p-6 rounded-lg border border-gray-200">
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
              Название компании <span className="text-red-500">*</span>
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              required
              placeholder="ООО «Ромашка»"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
              Отрасль / ниша <span className="text-red-500">*</span>
            </label>
            <input
              id="industry"
              name="industry"
              type="text"
              required
              placeholder="например: B2B SaaS, e-commerce, строительство"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Краткое описание бизнеса
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Чем занимается компания, какой продукт или услугу предлагает"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              Сайт компании
            </label>
            <input
              id="website"
              name="website"
              type="url"
              placeholder="https://example.ru"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="research_goal" className="block text-sm font-medium text-gray-700 mb-1">
              Цель исследования
            </label>
            <textarea
              id="research_goal"
              name="research_goal"
              rows={2}
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

        <p className="mt-4 text-xs text-center text-gray-400">
          После отправки система автоматически запустит исследование по 4 направлениям:
          бизнес, рынок, аудитория, каналы.
        </p>
      </div>
    </main>
  )
}
