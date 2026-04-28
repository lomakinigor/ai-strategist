import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const RF_CHANNELS = [
  'ВКонтакте', 'Telegram', 'YouTube', 'Instagram',
  'TikTok', 'Одноклассники', 'Яндекс.Дзен', 'Авито', 'MAX',
]

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({})

  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'
    const parsed = JSON.parse(raw)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({})
  }
}
