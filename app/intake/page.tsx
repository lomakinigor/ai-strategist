import IntakeForm from './IntakeForm'

export const metadata = {
  title: 'Новое исследование — AI-Стратег',
}

export default function IntakePage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Новое исследование</h1>
          <p className="mt-2 text-gray-600">
            Заполните форму — система автоматически проведёт исследование вашего бизнеса,
            рынка и целевой аудитории.
          </p>
        </div>

        <IntakeForm />

        <p className="mt-4 text-xs text-center text-gray-400">
          После отправки система автоматически запустит исследование по 4 направлениям:
          бизнес, рынок, аудитория, конкуренты.
        </p>
      </div>
    </main>
  )
}
