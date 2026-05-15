'use client'

export function BriefFooter() {
  return (
    <div className="mt-10 pt-6 border-t border-gray-100 flex gap-4">
      <button
        className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
        onClick={() => window.print()}
      >
        Распечатать
      </button>
      <button
        className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
        onClick={() => window.close()}
      >
        Закрыть окно
      </button>
    </div>
  )
}
