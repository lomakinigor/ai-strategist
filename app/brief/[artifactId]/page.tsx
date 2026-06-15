import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// /brief/[id] устарел: вся «карточка позиции» теперь живёт на /free-report/[id]
// в едином tier-aware виде (free показывает paywall, paid показывает CTA на
// полный отчёт). Этот маршрут оставлен как редирект для старых ссылок.
export default function BriefRedirect({ params }: { params: { artifactId: string } }) {
  redirect(`/free-report/${params.artifactId}`)
}
