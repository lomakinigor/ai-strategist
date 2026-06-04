import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ArchiveHotkey } from './ArchiveHotkey'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-strategist-bice.vercel.app'
const DESCRIPTION =
  'Автоматизированный стратегический анализ для российских компаний: исследование бизнеса, рынка, аудитории и каналов с маркировкой достоверности данных.'

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AI-Стратег — стратегический анализ для российских компаний',
    template: '%s · AI-Стратег',
  },
  description: DESCRIPTION,
  applicationName: 'AI-Стратег',
  keywords: [
    'AI-стратег',
    'стратегический анализ',
    'AI-исследование рынка',
    'российские компании',
    'автоматизация бизнеса',
    'AI стратегия',
    'анализ конкурентов',
  ],
  authors: [{ name: 'AI-Стратег' }],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'AI-Стратег',
    title: 'AI-Стратег — стратегический анализ для российских компаний',
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI-Стратег — стратегический анализ для российских компаний',
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body>
        <ArchiveHotkey />
        {children}
      </body>
    </html>
  )
}
