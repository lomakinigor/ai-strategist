'use client'

import { useEffect } from 'react'
import { captureUtmFromUrl } from '@/lib/utm'

// Глобальный компонент в layout.tsx: при первом маунте на любой странице
// сайта парсит UTM-параметры из URL и сохраняет в sessionStorage. Дальше
// формы (lead, intake) читают оттуда — UTM переживает навигацию.
export default function UtmCapture() {
  useEffect(() => {
    captureUtmFromUrl()
  }, [])
  return null
}
