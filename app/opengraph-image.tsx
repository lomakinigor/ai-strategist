import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AI-Стратег — автоматический стратегический анализ для российских компаний'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
          fontFamily: 'system-ui, sans-serif',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            AI
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>AI-Стратег</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            Стратегический анализ
            <br />
            для российских компаний
          </div>
          <div style={{ fontSize: 28, opacity: 0.85, letterSpacing: -0.3 }}>
            Минимум вопросов · максимум данных · отчёт за минуты
          </div>
        </div>

        <div style={{ fontSize: 22, opacity: 0.7, letterSpacing: -0.2 }}>
          ai-strategist-bice.vercel.app
        </div>
      </div>
    ),
    size,
  )
}
