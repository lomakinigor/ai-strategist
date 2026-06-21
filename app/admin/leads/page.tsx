// /admin/leads — CRM-lite для платных лидов.
// Фильтры через URL: ?status=new|in_progress|closed|all & ?type=paid|retainer|all & ?q=email-fragment
// Inline-смена статуса и заметок через server actions (LeadRow.tsx — client component).

import Link from 'next/link'
import { desc, eq, ilike, or, and, type SQL } from 'drizzle-orm'
import { getDb } from '@/db'
import { leads } from '@/db/schema'
import { LeadRow, type LeadRowData } from './LeadRow'

export const dynamic = 'force-dynamic'

type StatusFilter = 'all' | 'new' | 'in_progress' | 'closed'
type TypeFilter = 'all' | 'paid' | 'retainer'

interface PageProps {
  searchParams?: {
    status?: string
    type?: string
    q?: string
  }
}

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'closed', label: 'Закрытые' },
]

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'paid', label: '9 999 ₽' },
  { value: 'retainer', label: 'Сопровождение' },
]

function buildQueryString(current: Record<string, string | undefined>, overrides: Record<string, string | null>): string {
  const merged: Record<string, string> = {}
  for (const [k, v] of Object.entries(current)) {
    if (v) merged[k] = v
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) {
      delete merged[k]
    } else {
      merged[k] = v
    }
  }
  const params = new URLSearchParams(merged)
  const s = params.toString()
  return s ? `?${s}` : ''
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const statusFilter = (searchParams?.status ?? 'all') as StatusFilter
  const typeFilter = (searchParams?.type ?? 'all') as TypeFilter
  const searchQuery = searchParams?.q?.trim() ?? ''

  const db = getDb()

  // Сборка фильтров
  const filters: SQL[] = []
  if (statusFilter !== 'all') {
    filters.push(eq(leads.status, statusFilter))
  }
  if (typeFilter !== 'all') {
    filters.push(eq(leads.leadType, typeFilter))
  }
  if (searchQuery) {
    const like = `%${searchQuery}%`
    const orClause = or(
      ilike(leads.email, like),
      ilike(leads.name, like),
      ilike(leads.company, like),
    )
    if (orClause) filters.push(orClause)
  }
  const whereClause = filters.length > 0 ? and(...filters) : undefined

  const rows = await db
    .select()
    .from(leads)
    .where(whereClause)
    .orderBy(desc(leads.createdAt))
    .limit(200)

  // Статистика для KPI карточек (по всей таблице, не отфильтрованная)
  const allRows = await db.select({ status: leads.status, leadType: leads.leadType }).from(leads)
  const totalCount = allRows.length
  const newCount = allRows.filter((r) => r.status === 'new').length
  const inProgressCount = allRows.filter((r) => r.status === 'in_progress').length
  const closedCount = allRows.filter((r) => r.status === 'closed').length
  const paidCount = allRows.filter((r) => r.leadType === 'paid').length
  const retainerCount = allRows.filter((r) => r.leadType === 'retainer').length

  const leadRows: LeadRowData[] = rows.map((r) => ({
    id: r.id,
    leadType: r.leadType as 'paid' | 'retainer',
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    message: r.message,
    status: r.status as 'new' | 'in_progress' | 'closed',
    utm: (r.utm as Record<string, string> | null) ?? null,
    adminNotes: r.adminNotes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))

  const currentParams = {
    status: searchParams?.status,
    type: searchParams?.type,
    q: searchParams?.q,
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <p className="lp-eyebrow lp-eyebrow-warm mb-2">Этап 2.2 admin-панели</p>
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Лиды (CRM-lite)</h1>
        <p className="text-sm text-[#525252] mt-2">
          Заявки с лендингов /lead/[type]. Inline-смена статуса и заметок оператора.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Всего" value={totalCount} accent="gray" />
        <KpiCard label="Новые" value={newCount} accent="blue" />
        <KpiCard label="В работе" value={inProgressCount} accent="amber" />
        <KpiCard label="Закрытые" value={closedCount} accent="gray" />
        <KpiCard
          label="Paid / Retainer"
          value={`${paidCount} / ${retainerCount}`}
          accent="green"
        />
      </div>

      {/* Фильтры */}
      <div className="border border-[#e5e5e5] rounded p-4 mb-6 bg-[#fafafa]">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs uppercase tracking-wider font-bold text-[#737373] mr-2">Статус:</span>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = (statusFilter === opt.value) || (statusFilter === 'all' && opt.value === 'all')
              return (
                <Link
                  key={opt.value}
                  href={`/admin/leads${buildQueryString(currentParams, { status: opt.value === 'all' ? null : opt.value })}`}
                  className={`text-xs px-2 py-1 rounded ${
                    isActive ? 'bg-[#1e3a8a] text-white font-semibold' : 'text-[#525252] hover:bg-[#e5e5e5]'
                  }`}
                >
                  {opt.label}
                </Link>
              )
            })}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs uppercase tracking-wider font-bold text-[#737373] mr-2">Тип:</span>
            {TYPE_OPTIONS.map((opt) => {
              const isActive = (typeFilter === opt.value) || (typeFilter === 'all' && opt.value === 'all')
              return (
                <Link
                  key={opt.value}
                  href={`/admin/leads${buildQueryString(currentParams, { type: opt.value === 'all' ? null : opt.value })}`}
                  className={`text-xs px-2 py-1 rounded ${
                    isActive ? 'bg-[#1e3a8a] text-white font-semibold' : 'text-[#525252] hover:bg-[#e5e5e5]'
                  }`}
                >
                  {opt.label}
                </Link>
              )
            })}
          </div>

          {/* Search (GET form) */}
          <form action="/admin/leads" method="GET" className="flex items-center gap-2 ml-auto">
            {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
            {typeFilter !== 'all' && <input type="hidden" name="type" value={typeFilter} />}
            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              placeholder="Поиск по email/имени/компании"
              className="text-sm border border-[#e5e5e5] rounded px-2 py-1 w-64"
            />
            <button type="submit" className="text-xs bg-[#1e3a8a] text-white rounded px-3 py-1.5 hover:opacity-90">
              Найти
            </button>
            {searchQuery && (
              <Link
                href={`/admin/leads${buildQueryString(currentParams, { q: null })}`}
                className="text-xs text-[#737373] hover:text-[#0a0a0a]"
              >
                Сбросить
              </Link>
            )}
          </form>
        </div>
      </div>

      {/* Таблица */}
      <div className="border border-[#e5e5e5] rounded overflow-hidden">
        {leadRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#737373]">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Ничего не найдено. Сбрось фильтры.'
              : 'Ещё нет лидов. Они появятся после первой заявки с /lead/paid или /lead/retainer.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Дата</th>
                <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Тариф</th>
                <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Имя / компания</th>
                <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Контакты</th>
                <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">UTM</th>
                <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Статус</th>
                <th className="text-left px-3 py-2 border-b border-[#e5e5e5]">Заметки</th>
              </tr>
            </thead>
            <tbody>
              {leadRows.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-[#737373] mt-4 italic">
        Показано {leadRows.length} из {totalCount} лидов (последние 200 при отсутствии фильтров).
        Заметки и статусы сохраняются автоматически при изменении.
      </p>
    </main>
  )
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: 'gray' | 'blue' | 'amber' | 'green'
}) {
  const accentClasses = {
    gray: 'bg-[#fafafa] border-[#e5e5e5]',
    blue: 'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200',
  }
  return (
    <article className={`border rounded p-4 ${accentClasses[accent]}`}>
      <p className="text-[11px] uppercase tracking-wider font-bold text-[#737373] mb-1">{label}</p>
      <p className="text-3xl font-bold tracking-[-0.01em]">{value}</p>
    </article>
  )
}
