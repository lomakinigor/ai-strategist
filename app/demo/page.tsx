import type { Metadata } from 'next'
import DemoExperience from './DemoExperience'

export const metadata: Metadata = {
  title: 'Демонстрация отчёта',
  description: 'Обезличенный пример исследования компании и стратегического отчёта AI-Стратега.',
  robots: { index: false, follow: false },
}

export default function DemoPage() {
  return <DemoExperience />
}
