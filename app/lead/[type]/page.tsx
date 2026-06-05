// Лид-формы для платных тарифов: /lead/paid (счёт 9 999 ₽) и /lead/retainer
// (запись на отбор для сопровождения). Free-тариф сюда не попадает — он сразу
// уходит в /intake. Server-wrapper передаёт тип в client-форму.
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LeadForm from './LeadForm'

type LeadType = 'paid' | 'retainer'

const COPY: Record<LeadType, {
  eyebrow: string
  h1: string
  intro: string
  successTitle: string
  successBody: string
}> = {
  paid: {
    eyebrow: 'Разовый отчёт 9 999 ₽',
    h1: 'Запросить счёт на полный отчёт',
    intro:
      'Оставьте контакты — пришлём счёт в течение часа. После оплаты вы получите ссылку на анкету. Отчёт будет готов в течение 24 часов.',
    successTitle: 'Заявка принята',
    successBody:
      'Счёт придёт на email в течение часа. Если не нашли письмо — проверьте «Спам» или напишите нам в ответ.',
  },
  retainer: {
    eyebrow: 'Сопровождение от 100 000 ₽/мес',
    h1: 'Записаться на отбор',
    intro:
      'Сначала бесплатный звонок 30 минут — обсудим вашу ситуацию и поймём, подходим ли друг другу. Работаем с 3 компаниями одновременно.',
    successTitle: 'Заявка на отбор принята',
    successBody:
      'В течение рабочего дня свяжемся с вами по email и согласуем удобное время бесплатного 30-минутного звонка.',
  },
}

export const metadata = { title: 'Заявка — AI-Стратег' }

export default function LeadPage({ params }: { params: { type: string } }) {
  if (params.type !== 'paid' && params.type !== 'retainer') notFound()
  const type = params.type as LeadType
  const copy = COPY[type]

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]">
      <nav className="max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
        <Link href="/" className="lp-btn-ghost">
          ← На главную
        </Link>
      </nav>

      <section className="max-w-xl mx-auto px-6 pt-16 pb-24">
        <p className="lp-eyebrow mb-4">{copy.eyebrow}</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-5">
          {copy.h1}
        </h1>
        <p className="text-base text-[#525252] leading-[1.65] mb-10">
          {copy.intro}
        </p>

        <LeadForm
          type={type}
          successTitle={copy.successTitle}
          successBody={copy.successBody}
        />
      </section>

      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-10 flex items-center justify-between text-xs text-[#6b7280]">
          <p>© {new Date().getFullYear()} AI-Стратег</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-[#0a0a0a]">
              Политика
            </Link>
            <Link href="/offer" className="hover:text-[#0a0a0a]">
              Оферта
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
