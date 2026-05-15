export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI-Стратег</h1>
        <p className="text-gray-600 mb-8 max-w-sm mx-auto">
          Автоматизированный стратегический анализ для российских компаний
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/intake"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Создать исследование
          </a>
          <a
            href="/archive"
            className="inline-block border border-gray-300 text-gray-700 px-6 py-3 rounded-lg text-sm font-medium hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Архив отчётов
          </a>
        </div>
      </div>
    </main>
  )
}
