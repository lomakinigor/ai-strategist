'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getConfirmDraftAction, saveAndGenerateAction } from './actions'
import {
  BLOCK_KEYS,
  BLOCK_LABELS,
  BLOCK_HINTS,
  PROVENANCE_LABELS,
  REQUIRED_BLOCKS,
  emptyConfirmation,
  type Confirmation,
  type BlockKey,
  type ConfirmBlock,
  type ConfirmItem,
} from '@/lib/strategy/confirm-types'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const blockResolved = (b: ConfirmBlock) => b.unknown || b.items.some((i) => i.text.trim().length > 0)

export function ConfirmForm({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [conf, setConf] = useState<Confirmation | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getConfirmDraftAction(jobId)
      .then((d) => {
        if (alive) {
          setConf(d)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (alive) {
          setConf(emptyConfirmation())
          setStatus('ready')
        }
      })
    return () => {
      alive = false
    }
  }, [jobId])

  function patchBlock(key: BlockKey, next: ConfirmBlock) {
    setConf((prev) => (prev ? { ...prev, [key]: next } : prev))
  }
  function setItemText(key: BlockKey, idx: number, text: string) {
    if (!conf) return
    const items = conf[key].items.map((it, i) => (i === idx ? { ...it, text } : it))
    patchBlock(key, { ...conf[key], items })
  }
  function addItem(key: BlockKey) {
    if (!conf) return
    const item: ConfirmItem = { text: '', provenance: 'brief' }
    patchBlock(key, { ...conf[key], items: [...conf[key].items, item], unknown: false })
  }
  function removeItem(key: BlockKey, idx: number) {
    if (!conf) return
    patchBlock(key, { ...conf[key], items: conf[key].items.filter((_, i) => i !== idx) })
  }
  function toggleUnknown(key: BlockKey) {
    if (!conf) return
    patchBlock(key, { ...conf[key], unknown: !conf[key].unknown })
  }

  async function submit() {
    if (!conf) return
    setError(null)
    setStatus('saving')
    try {
      const result = await saveAndGenerateAction(jobId, conf)
      if (!result) {
        setError('Запрос превысил лимит времени. Обнови страницу через минуту — отчёт мог сохраниться.')
        setStatus('ready')
        return
      }
      if ('error' in result) {
        setError(result.error)
        setStatus('ready')
        return
      }
      router.push(result.redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при генерации')
      setStatus('ready')
    }
  }

  if (status === 'loading' || !conf) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Spinner />
        <p className="text-sm text-gray-700 mt-3">Готовим черновик понимания…</p>
        <p className="text-xs text-gray-400 mt-1">Это занимает 10–30 секунд</p>
      </div>
    )
  }

  const unresolvedRequired = REQUIRED_BLOCKS.filter((k) => !blockResolved(conf[k]))
  const canSubmit = unresolvedRequired.length === 0 && status !== 'saving'

  return (
    <div className="space-y-5">
      {BLOCK_KEYS.map((key) => {
        const block = conf[key]
        const required = REQUIRED_BLOCKS.includes(key)
        return (
          <div key={key} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-sm font-semibold text-gray-900">
                {BLOCK_LABELS[key]}
                {required && <span className="ml-2 text-[10px] text-indigo-600 align-middle">обязательно</span>}
              </h2>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 cursor-pointer select-none">
                <input type="checkbox" checked={block.unknown} onChange={() => toggleUnknown(key)} />
                не знаю
              </label>
            </div>
            <p className="text-xs text-gray-400 mb-3">{BLOCK_HINTS[key]}</p>

            {block.unknown ? (
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                В отчёте будет «[НЕДОСТАТОЧНО ДАННЫХ]» — приложение не станет домысливать.
              </p>
            ) : (
              <div className="space-y-2">
                {block.items.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Ничего не нашли — добавьте, если есть.</p>
                )}
                {block.items.map((it, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1">
                      <input
                        value={it.text}
                        onChange={(e) => setItemText(key, idx, e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:border-indigo-400 focus:outline-none"
                        placeholder="…"
                      />
                      <span
                        className={`text-[10px] ${it.provenance === 'ai_guess' ? 'text-amber-600 font-medium' : 'text-gray-400'}`}
                      >
                        {PROVENANCE_LABELS[it.provenance]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(key, idx)}
                      className="text-gray-300 hover:text-red-500 text-lg leading-none mt-1"
                      aria-label="Убрать"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addItem(key)}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  + добавить
                </button>
              </div>
            )}
          </div>
        )
      })}

      {unresolvedRequired.length > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Подтвердите обязательные блоки ({unresolvedRequired.map((k) => BLOCK_LABELS[k]).join(', ')}) —
          добавьте данные или отметьте «не знаю».
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 break-words">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors select-none"
      >
        {status === 'saving' && <Spinner />}
        {status === 'saving' ? 'Генерирую отчёт…' : 'Подтвердить и сгенерировать отчёт →'}
      </button>
      <p className="text-xs text-gray-400 text-center">Генерация занимает 1–2 минуты.</p>
    </div>
  )
}
