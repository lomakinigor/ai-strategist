'use client'

import { useEffect } from 'react'
import { ymGoal } from '../YandexMetrica'

export default function OpenIntakeGoal() {
  useEffect(() => {
    ymGoal('open_intake')
  }, [])
  return null
}
