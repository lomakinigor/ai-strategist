'use client'

export function BriefReportPanel({ artifactId }: { artifactId: string }) {
  return (
    <div className="mt-6">
      <a
        href={`/brief/${artifactId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-800 text-sm font-medium hover:bg-indigo-100 active:bg-indigo-200 transition-colors select-none"
      >
        Краткий отчёт
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-60" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
        </svg>
      </a>
    </div>
  )
}
