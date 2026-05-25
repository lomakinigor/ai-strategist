'use client'

import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import type { StatusCounts, GrowthPoint } from '@/lib/strategy/brief-derive'

// ─── Neon-палитра (синхронна с .neon-report в globals.css) ──────────────────────
const C = {
  green: '#00d4aa',
  amber: '#f5a623',
  red: '#ff6b6b',
  blue: '#5b9cf6',
  purple: '#c084fc',
  text: '#e8e8f0',
  muted: '#8888a0',
  surface: '#16161c',
  border: 'rgba(255,255,255,0.12)',
}

// ─── useInView — общий триггер появления в зоне видимости ───────────────────────
function useInView<T extends HTMLElement>(once = true) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          if (once) io.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once])
  return { ref, inView }
}

// ─── Reveal — плавное появление секции при скролле ──────────────────────────────
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`nr-reveal ${inView ? 'is-vis' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

// ─── CountUp — анимация числа от 0 при появлении ────────────────────────────────
function formatNum(n: number, decimals: number) {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function CountUp({
  value,
  prefix = '',
  suffix = '',
  raw,
  duration = 1100,
}: {
  value: number | null
  prefix?: string
  suffix?: string
  /** Фолбэк-текст, если число не распозналось. */
  raw?: string
  duration?: number
}) {
  const { ref, inView } = useInView<HTMLSpanElement>()
  const [display, setDisplay] = useState(0)

  const decimals = value != null && !Number.isInteger(value) ? 1 : 0

  useEffect(() => {
    if (!inView || value == null) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setDisplay(value * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration])

  if (value == null) {
    return <span ref={ref}>{raw ?? '—'}</span>
  }

  return (
    <span ref={ref}>
      {prefix}
      {formatNum(display, decimals)}
      {suffix}
    </span>
  )
}

// ─── StatusDoughnut — распределение метрик по светофору ─────────────────────────
export function StatusDoughnut({ counts }: { counts: StatusCounts }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { ref: wrapRef, inView } = useInView<HTMLDivElement>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !inView) return
    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['В норме', 'Внимание', 'Критично'],
        datasets: [
          {
            data: [counts.green, counts.yellow, counts.red],
            backgroundColor: [C.green, C.amber, C.red],
            borderColor: C.surface,
            borderWidth: 3,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: { animateRotate: true, duration: 900 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: C.muted, font: { size: 11 }, padding: 14, boxWidth: 10, usePointStyle: true },
          },
          tooltip: {
            backgroundColor: '#0d0d0f',
            borderColor: C.border,
            borderWidth: 1,
            titleColor: C.text,
            bodyColor: C.muted,
            padding: 10,
          },
        },
      },
    })
    return () => chart.destroy()
  }, [inView, counts.green, counts.yellow, counts.red])

  return (
    <div ref={wrapRef} className="relative" style={{ height: 200 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

// ─── GrowthBar — горизонтальный bar потенциала по направлениям ──────────────────
const PRIORITY_COLOR: Record<GrowthPoint['priority'], string> = {
  high: C.green,
  medium: C.blue,
  low: C.amber,
}

export function GrowthBar({ points }: { points: GrowthPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { ref: wrapRef, inView } = useInView<HTMLDivElement>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !inView) return
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: points.map((p) => p.label),
        datasets: [
          {
            data: points.map((p) => p.value),
            backgroundColor: points.map((p) => PRIORITY_COLOR[p.priority] + 'cc'),
            borderColor: points.map((p) => PRIORITY_COLOR[p.priority]),
            borderWidth: 1,
            borderRadius: 6,
            barThickness: 18,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0d0d0f',
            borderColor: C.border,
            borderWidth: 1,
            titleColor: C.text,
            bodyColor: C.muted,
            padding: 10,
            callbacks: { label: (ctx) => ` +${ctx.parsed.x}% потенциал роста` },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: C.muted, font: { size: 11 }, callback: (v) => `${v}%` },
            border: { display: false },
          },
          y: {
            grid: { display: false },
            ticks: { color: C.text, font: { size: 12 } },
            border: { display: false },
          },
        },
      },
    })
    return () => chart.destroy()
  }, [inView, points])

  return (
    <div ref={wrapRef} className="relative" style={{ height: Math.max(140, points.length * 46) }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
