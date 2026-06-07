'use client'

import { useEffect } from 'react'
import { ymGoal } from '../../YandexMetrica'

export default function FreeReportGoal() {
  useEffect(() => {
    ymGoal('free_report_view')
  }, [])
  return null
}
