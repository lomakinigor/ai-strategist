# Архитектура MVP — ai-strategist

## Обзор

ai-strategist — frontend-first SaaS-приложение. MVP строится итерационно: сначала UI и mock-данные, затем реальные интеграции.

## Слои архитектуры

```
┌─────────────────────────────────────────────┐
│                   UI Layer                   │
│  Next.js 14 App Router · shadcn/ui           │
│  Tailwind CSS v4 · TypeScript strict         │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│               Application Layer              │
│  Server Actions · API Routes                 │
│  Vercel AI SDK (streaming, tools)            │
└──────────────┬───────────────┬──────────────┘
               │               │
┌──────────────▼──────┐ ┌──────▼───────────────┐
│   Domain Logic      │ │   Research Adapters   │
│   Reliability Engine│ │   (mock → real)       │
│   Strategy Builder  │ │   Source collectors   │
└──────────────┬──────┘ └──────┬───────────────┘
               │               │
┌──────────────▼───────────────▼──────────────┐
│               Data Layer                     │
│  Drizzle ORM · Postgres · pgvector           │
│  RAG context (embeddings + vector search)    │
└─────────────────────────────────────────────┘
```

## Ключевые модули

### Reliability Engine (`src/lib/reliability/`)
- `classify(rawPoint: RawDataPoint): VerifiedFact` — единая точка входа
- RS → ConfidenceLevel: RS 4–5 → HIGH, RS 3 → MEDIUM, RS 1–2 → LOW
- FactType: FACT (RS ≥ 3 + source + date), HYPOTHESIS (RS 2 или нет даты), INSUFFICIENT_DATA (RS ≤ 1 / нет source / нет data)
- Не допускает выводов без источников

### AI Provider Abstraction (`src/lib/ai/`)
- **Default research provider:** Perplexity Sonar (`sonar-pro`) — real-time web search с citations
- **Strategy provider:** Anthropic Claude (`claude-sonnet-4-6`) через Vercel AI SDK
- **Router:** `getResearchProvider(providerId?)` — возвращает провайдер, fallback → mock
- **Config:** `AI_CONFIG` в `config.ts` — одна точка изменения провайдера/модели
- **Принцип:** бизнес-логика не вызывает провайдера напрямую — только через router
- **Perplexity placeholder:** интерфейс готов, реальные вызовы подключаются в T-005 (PERPLEXITY_API_KEY)

### Research Adapters
- Абстракция над типами исследований (business/market/audience/channels)
- MVP: mock-адаптеры; далее — реальные вызовы через AI Provider layer
- Каждый адаптер возвращает `RawDataPoint[]` → classify() → `VerifiedFact[]`

### RAG Context Layer
- pgvector для хранения и поиска по embeddings
- Только данные, собранные по конкретной компании — не общие "знания" LLM
- Контекст формируется на основе загруженных клиентом данных

### Strategy Builder
- Получает верифицированные факты из RAG
- Генерирует структурированный отчёт через Vercel AI SDK
- Формат отчёта нейтральный, будет уточняться

## Принципы

- **Mock-first:** все внешние зависимости заменяются mock-адаптерами до реализации реальных
- **Domain isolation:** бизнес-логика не смешивается с UI
- **Verifiable data only:** LLM не генерирует факты о компании без источника
- **Russian-first:** все тексты на русском, суммы в рублях

## Технический долг MVP (известный)

- Форматы итоговых отчётов будут уточнены в отдельном промпте
- Реальные research-провайдеры добавляются после F-004
- Система авторизации — после фиксации базового flow
