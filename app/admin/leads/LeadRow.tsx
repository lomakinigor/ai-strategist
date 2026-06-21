'use client'

// Одна строка таблицы /admin/leads с inline-controls для статуса и заметок.
// Status — обычный <select> с onChange → server action.
// Заметки — раскрывающийся <textarea> с кнопкой «Сохранить».

import { useState, useTransition } from 'react'
import { updateLeadStatus, updateLeadNotes } from './actions'

export interface LeadRowData {
  id: string
  leadType: 'paid' | 'retainer'
  name: string
  email: string
  phone: string | null
  company: string | null
  message: string | null
  status: 'new' | 'in_progress' | 'closed'
  utm: Record<string, string> | null
  adminNotes: string | null
  createdAt: Date
  updatedAt: Date
}

const STATUS_META: Record<LeadRowData['status'], { label: string; classes: string }> = {
  new: { label: 'Новый', classes: 'bg-blue-50 border-blue-200 text-blue-800' },
  in_progress: { label: 'В работе', classes: 'bg-amber-50 border-amber-200 text-amber-800' },
  closed: { label: 'Закрыт', classes: 'bg-gray-100 border-gray-300 text-gray-600' },
}

const TYPE_META: Record<LeadRowData['leadType'], { label: string; classes: string }> = {
  paid: { label: '9 999 ₽', classes: 'bg-green-50 text-green-800' },
  retainer: { label: 'Сопровождение', classes: 'bg-purple-50 text-purple-800' },
}

function fmtDate(d: Date): string {
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtUtm(utm: Record<string, string> | null): string {
  if (!utm) return '—'
  const parts: string[] = []
  if (utm.utm_source) parts.push(utm.utm_source)
  if (utm.utm_medium) parts.push(utm.utm_medium)
  if (utm.utm_campaign) parts.push(utm.utm_campaign)
  return parts.length > 0 ? parts.join(' / ') : '—'
}

export function LeadRow({ lead }: { lead: LeadRowData }) {
  const [isPending, startTransition] = useTransition()
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState(lead.adminNotes ?? '')
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const onStatusChange = (newStatus: LeadRowData['status']) => {
    startTransition(async () => {
      const res = await updateLeadStatus(lead.id, newStatus)
      if ('error' in res) {
        alert('Ошибка смены статуса: ' + res.error)
      }
    })
  }

  const onSaveNotes = () => {
    setNotesStatus('saving')
    startTransition(async () => {
      const res = await updateLeadNotes(lead.id, notesDraft)
      setNotesStatus('error' in res ? 'error' : 'saved')
      if (!('error' in res)) {
        setTimeout(() => setNotesStatus('idle'), 2000)
      }
    })
  }

  const typeMeta = TYPE_META[lead.leadType]

  return (
    <>
      <tr className="border-b border-[#f1f5f9]">
        <td className="px-3 py-2 whitespace-nowrap text-xs text-[#525252]">{fmtDate(lead.createdAt)}</td>
        <td className="px-3 py-2">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${typeMeta.classes}`}>
            {typeMeta.label}
          </span>
        </td>
        <td className="px-3 py-2">
          <div className="font-medium text-sm">{lead.name}</div>
          {lead.company && <div className="text-xs text-[#737373]">{lead.company}</div>}
        </td>
        <td className="px-3 py-2 text-sm">
          <a href={`mailto:${lead.email}`} className="text-[#1e3a8a] hover:underline">
            {lead.email}
          </a>
          {lead.phone && <div className="text-xs text-[#525252] mt-0.5">{lead.phone}</div>}
        </td>
        <td className="px-3 py-2 text-xs text-[#525252]" title={JSON.stringify(lead.utm, null, 2)}>
          {fmtUtm(lead.utm)}
        </td>
        <td className="px-3 py-2">
          <select
            value={lead.status}
            disabled={isPending}
            onChange={(e) => onStatusChange(e.target.value as LeadRowData['status'])}
            className={`text-xs font-bold uppercase tracking-wider rounded border px-2 py-1 ${STATUS_META[lead.status].classes} ${
              isPending ? 'opacity-50' : 'cursor-pointer'
            }`}
          >
            {(Object.keys(STATUS_META) as LeadRowData['status'][]).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            className="text-xs text-[#1e3a8a] hover:underline"
          >
            {lead.adminNotes ? '📝 Есть' : '+ Добавить'}
          </button>
        </td>
      </tr>
      {(notesOpen || lead.message) && (
        <tr className="border-b border-[#f1f5f9] bg-[#fafafa]">
          <td colSpan={7} className="px-3 py-3">
            {lead.message && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#737373] mb-1">
                  Сообщение клиента:
                </p>
                <p className="text-sm whitespace-pre-wrap">{lead.message}</p>
              </div>
            )}
            {notesOpen && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#737373] mb-1">
                  Заметки оператора:
                </p>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={3}
                  className="w-full border border-[#e5e5e5] rounded p-2 text-sm font-mono"
                  placeholder="Что обсудили, когда перезвонить, статус оплаты..."
                />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onSaveNotes}
                    disabled={isPending}
                    className="text-xs bg-[#1e3a8a] text-white rounded px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotesOpen(false)}
                    className="text-xs text-[#525252] hover:text-[#0a0a0a]"
                  >
                    Скрыть
                  </button>
                  {notesStatus === 'saved' && <span className="text-xs text-green-700">✓ Сохранено</span>}
                  {notesStatus === 'error' && <span className="text-xs text-red-700">Ошибка сохранения</span>}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
