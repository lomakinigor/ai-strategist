'use client'

import { useState } from 'react'
import type { AiProposal } from './ai-extract'

function ContrastCard({ proposal, index }: { proposal: AiProposal; index: number }) {
  const [open, setOpen] = useState(index === 0)

  const hasContrast = proposal.before || proposal.after || proposal.effect

  return (
    <div className="ai-card group rounded-xl border border-indigo-200/70 bg-white/80 backdrop-blur-sm overflow-hidden transition-all duration-200 hover:border-indigo-300 hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-4 p-5 text-left transition-colors hover:bg-indigo-50/30"
        aria-expanded={open ? 'true' : 'false'}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
          <span className="text-white text-base font-bold">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-gray-900 leading-snug">
            {proposal.title}
          </h3>
          {!open && proposal.effect && (
            <p className="text-xs text-emerald-700 font-medium mt-1.5 line-clamp-2">
              💰 {proposal.effect}
            </p>
          )}
        </div>
        <svg
          className={`flex-shrink-0 w-5 h-5 text-indigo-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      <div className={`ai-card-body px-5 pb-5 space-y-3 ${open ? '' : 'hidden'}`}>
          {hasContrast ? (
            <>
              {proposal.before && (
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-base" aria-hidden>🔴</span>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700 mb-0.5">Сейчас</p>
                    <p className="text-[13px] text-gray-700 leading-relaxed">{proposal.before}</p>
                  </div>
                </div>
              )}
              {proposal.after && (
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-base" aria-hidden>🟢</span>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-0.5">После</p>
                    <p className="text-[13px] text-gray-700 leading-relaxed">{proposal.after}</p>
                  </div>
                </div>
              )}
              {proposal.effect && (
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-base" aria-hidden>💰</span>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-0.5">Эффект</p>
                    <p className="text-[13px] text-gray-700 leading-relaxed">{proposal.effect}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-[13px] text-gray-700 leading-relaxed">{proposal.description}</p>
          )}
      </div>
    </div>
  )
}

export function AiBlock({ proposals }: { proposals: AiProposal[] }) {
  if (proposals.length === 0) return null

  return (
    <section className="ai-block relative rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 p-6 sm:p-8">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-purple-200/30 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-indigo-200/30 blur-3xl" aria-hidden />

      <div className="relative">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md text-2xl" aria-hidden>
            🤖
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600">
              AI-Автоматизация
            </p>
            <h2 className="text-xl font-bold text-gray-900 leading-tight mt-0.5">
              Что предлагаем автоматизировать
            </h2>
            <p className="text-sm text-gray-600 mt-1.5">
              Три ключевые возможности для роста с минимальными вложениями. Кликните карточку для деталей.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {proposals.map((p, i) => (
            <ContrastCard key={i} proposal={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
