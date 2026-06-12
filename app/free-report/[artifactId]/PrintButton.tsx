'use client'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="lp-btn-secondary no-print"
    >
      Скачать PDF
      <span aria-hidden>↓</span>
    </button>
  )
}
