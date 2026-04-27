export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI-Стратег</h1>
        <p className="text-gray-600 mb-8 max-w-sm mx-auto">
          Автоматизированный стратегический анализ для российских компаний
        </p>
        <a
          href="/intake"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Создать исследование
        </a>
      </div>
    </main>
  )
}
