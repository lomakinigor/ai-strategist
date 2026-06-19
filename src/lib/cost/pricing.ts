// Модельная таблица цен — fallback для расчёта стоимости когда провайдер не
// возвращает usage.cost (например, прямые OpenAI вызовы). Цены — USD за 1M токенов.
// Источник: openrouter.ai/models и platform.openai.com/docs/pricing на 2026-06.
// Обновлять при изменении цен у провайдеров.

interface ModelPricing {
  /** USD per 1M input/prompt tokens */
  input: number
  /** USD per 1M output/completion tokens */
  output: number
}

const PRICES: Record<string, ModelPricing> = {
  // Anthropic Claude через OpenRouter (цена та же, что у Anthropic native)
  'anthropic/claude-sonnet-4.6': { input: 3, output: 15 },
  'anthropic/claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-4-6': { input: 3, output: 15 },

  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-2024-08-06': { input: 2.5, output: 10 },

  // DeepSeek через OpenRouter (V4 Pro / Chat)
  'deepseek/deepseek-chat': { input: 0.27, output: 1.1 },
  'deepseek/deepseek-v4-pro': { input: 0.27, output: 1.1 },
}

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number | null {
  const pricing = PRICES[model] ?? PRICES[model.toLowerCase()]
  if (!pricing) return null
  return (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output
}
