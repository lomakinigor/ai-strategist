'use client'

import Link from 'next/link'
import { ymGoal, type YMGoal } from './YandexMetrica'

interface CTALinkProps {
  href: string
  goal?: YMGoal
  className?: string
  children: React.ReactNode
}

export default function CTALink({ href, goal, className, children }: CTALinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (goal) ymGoal(goal)
      }}
    >
      {children}
    </Link>
  )
}
