import { NextRequest, NextResponse } from 'next/server'

const RF_CHANNELS = [
  'ВКонтакте', 'Telegram', 'YouTube', 'Instagram',
  'TikTok', 'Одноклассники', 'Яндекс.Дзен', 'Авито', 'MAX',
]

interface DeepSeekResponse {
  choices: Array<{ message: { content: string } }>
}

export async function POST(req: NextRequest) {
  if (!process.env.PERPLEXITY_API_KEY) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 })
  }

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({})

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Извлеки структурированную информацию о компании из текста ниже. Верни ТОЛЬКО валидный JSON без markdown-обёртки со следующими полями (пустая строка если данных нет):
- company_name: название компании
- industry: отрасль или ниша
- description: краткое описание бизнеса и продукта
- website: URL сайта (если есть)
- goals: цель исследования или стратегии
- competitors: конкуренты, перечисленные через запятую
- channels: массив строк только из этого списка, если они упомянуты: ${RF_CHANNELS.join(', ')}

Текст:
${text}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[parse-context] DeepSeek error', response.status, errText)
      return NextResponse.json({ error: true, detail: errText, status: response.status }, { status: 500 })
    }

    const data = (await response.json()) as DeepSeekResponse
    const raw = data.choices[0]?.message?.content?.trim() ?? '{}'
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: true }, { status: 500 })
  }
}
