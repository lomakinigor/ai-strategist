// Yandex.Metrica — рендерит script-tag только если задан counter ID.
// При отсутствии env-переменной — null (заглушка для разработки).
// Цели для воронки:
//   - 'open_intake'      — открыл /intake
//   - 'intake_submitted' — отправил анкету
//   - 'free_report_view' — открыл /free-report/[id]
//   - 'paywall_click'    — кликнул «Получить полный отчёт за 9 999 ₽»
//   - 'lead_paid'        — отправил заявку с /lead/paid
//   - 'lead_retainer'    — отправил заявку с /lead/retainer
//
// Триггер цели из клиентского кода:
//   import { ymGoal } from '@/app/YandexMetrica'
//   ymGoal('open_intake')

import Script from 'next/script'

export const YM_GOALS = {
  OPEN_INTAKE: 'open_intake',
  INTAKE_SUBMITTED: 'intake_submitted',
  FREE_REPORT_VIEW: 'free_report_view',
  PAYWALL_CLICK: 'paywall_click',
  LEAD_PAID: 'lead_paid',
  LEAD_RETAINER: 'lead_retainer',
} as const

export type YMGoal = (typeof YM_GOALS)[keyof typeof YM_GOALS]

declare global {
  interface Window {
    // Метрика инжектит этот метод в глобальный scope.
    ym?: (counterId: number, action: string, target?: string) => void
  }
}

export function ymGoal(target: YMGoal): void {
  if (typeof window === 'undefined') return
  const counterId = Number(process.env.NEXT_PUBLIC_YM_COUNTER_ID)
  if (!Number.isFinite(counterId) || counterId <= 0) return
  if (typeof window.ym !== 'function') return
  window.ym(counterId, 'reachGoal', target)
}

export default function YandexMetrica() {
  const counterId = process.env.NEXT_PUBLIC_YM_COUNTER_ID
  if (!counterId) return null

  return (
    <Script id="ym-counter" strategy="afterInteractive">
      {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
      ym(${counterId}, "init", { defer: true, clickmap:true, trackLinks:true, accurateTrackBounce:true });`}
    </Script>
  )
}
