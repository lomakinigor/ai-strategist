# Tech Spec — ai-strategist MVP

> Черновой технический spec. Уточняется по мере реализации.

## Стек

| Слой | Технология | Версия |
|------|------------|--------|
| Framework | Next.js | 14 (App Router) |
| Language | TypeScript | strict |
| Styling | Tailwind CSS | v4 |
| UI Components | shadcn/ui | latest |
| AI SDK | Vercel AI SDK | latest |
| ORM | Drizzle ORM | latest |
| Database | Postgres | 16+ |
| Vector search | pgvector | latest |
| Runtime | Node.js | 20+ |

## Архитектура приложения

### Основной пользовательский flow

```
/intake                        → клиент заполняет минимальную форму
/research/[id]                 → страница прогресса auto-research (4 потока)
/research/[id]/validation      → просмотр и проверка собранных фактов
/research/[id]/report          → готовый структурированный отчёт (Strategy Workspace)
```

### App Router структура (реализованная)

```
app/
  page.tsx                              — лендинг
  intake/
    page.tsx                            — F-003: минимальная форма
    actions.ts                          — Server Action: создание company/job, редирект
  research/
    [id]/
      page.tsx                          — F-004: прогресс auto-research pipeline
      actions.ts                        — Server Action: triggerResearch
      generate/
        actions.ts                      — Server Action: generateStrategyAction → redirect report
      validation/
        page.tsx                        — F-005: проверка фактов (фильтры, isActive toggle)
        actions.ts                      — Server Action: setFactActive
      report/
        page.tsx                        — F-008: Strategy Workspace (5 секций, маркировка)
        CopyButton.tsx                  — 'use client': копирование markdown в буфер
  api/
    export/
      [artifactId]/
        route.ts                        — F-009: GET → contentMarkdown как .md attachment
```

### Серверные компоненты и Server Actions

- Данные загружаются через Server Components где возможно
- Мутации — через Server Actions
- Streaming — через `useChat` / `useCompletion` из Vercel AI SDK
- Прогресс research — polling или Server-Sent Events

## Auto-Research Pipeline

После intake система запускает 4 потока параллельно:

```
intake submit
    │
    ├── business_adapter.collect()   → факты о компании
    ├── market_adapter.collect()     → факты о рынке/нише
    ├── audience_adapter.collect()   → факты об аудитории
    └── channels_adapter.collect()   → факты о каналах
           │
           ↓
    ReliabilityEngine.classify()    → RS + тип (ФАКТ/ГИПОТЕЗА/НЕДОСТАТОЧНО ДАННЫХ)
           │
           ↓
    facts → embeddings → pgvector
           │
           ↓
    Генерация отчёта (LLM + RAG)
```

**Уточняющие вопросы (fallback):** допускаются только если после сбора данных критически не хватает информации для ключевого раздела отчёта. Реализуются как отдельный шаг, не как интерактивный чат.

## База данных

Подробнее: [data-model.md](data-model.md)

### Ключевые таблицы

- `companies` — информация о компании (intake)
- `research_jobs` — задания на исследование с 4 потоками и статусами
- `sources` — источники данных (URL, тип, дата, RS)
- `facts` — верифицированные факты с research_type и привязкой к источнику
- `report_artifacts` — сгенерированные отчёты (статус pending/generating/done/error, contentMarkdown)
- `strategy_artifacts` — промежуточные AI-артефакты по типу
- `embeddings` — векторные представления фактов (pgvector; MVP: колонка добавляется post-MVP)

## Reliability Engine

Отдельный модуль в `lib/reliability/`:

```typescript
type FactType = 'FACT' | 'HYPOTHESIS' | 'INSUFFICIENT_DATA'
type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'
type ReliabilityScore = 1 | 2 | 3 | 4 | 5
type ResearchType = 'business' | 'market' | 'audience' | 'channels'

interface VerifiedFact {
  content: string
  source: string
  date: string
  rs: ReliabilityScore
  type: FactType
  confidence: ConfidenceLevel
  researchType: ResearchType
}
```

## Research Adapters

Единый интерфейс для всех 4 потоков:

```typescript
interface ResearchAdapter {
  name: string
  researchType: ResearchType
  collect(query: ResearchQuery): Promise<RawDataPoint[]>
}

interface RawDataPoint {
  data: string
  source: string
  date: string
  rs: ReliabilityScore
  researchType: ResearchType
}
```

MVP: все 4 адаптера — mock. Структура готова для реальных реализаций.

## RAG Pipeline (MVP — SQL-based)

```
facts (is_active=true) → группировка по research_type → текстовые блоки для LLM
```

MVP реализован через SQL-retrieval (`buildResearchContext(jobId)` в `src/lib/rag/context.ts`) без pgvector/embeddings. При малом объёме фактов vector search не нужен. pgvector-колонка в таблице `embeddings` добавляется отдельным шагом после MVP при реальной нагрузке.

## AI Generation

Direct `fetch` к Anthropic API (`https://api.anthropic.com/v1/messages`, модель `claude-sonnet-4-6`):
- System prompt включает 7 антигаллюцинационных правил, методологию RS, список допустимых РФ-каналов
- User context формируется из `serializeContext(buildResearchContext(jobId))` — только активные факты
- LLM не добавляет неверифицированных утверждений
- При нехватке данных — явно выводить «НЕДОСТАТОЧНО ДАННЫХ»
- Mock-режим при отсутствии `ANTHROPIC_API_KEY`: безопасный дефолт с явными метками

## Report / Export Layer

Слой вывода отчёта (`lib/report/` + `src/components/report/`) спроектирован как **изолированный модуль**:

- Принимает на вход структурированный output от AI Generation
- Не знает ничего о research pipeline или RAG — только об отображении данных
- Может быть полностью переработан (структура, блоки, формат) без изменения ядра
- Export-модуль (`lib/export/`) аналогично изолирован

**MVP-формат отчёта — рабочий и временный.** Глубокая доработка формата (структура блоков, стандарты подачи, уровень детализации) — отдельный post-MVP этап после первых тестов с реальными клиентами (F-010 / T-010).

> **Архитектурное правило:** Не жёстко кодировать структуру разделов в промптах или компонентах — использовать конфигурируемые шаблоны, чтобы F-010 можно было выполнить без переписывания ядра.

## Переменные окружения

```env
DATABASE_URL=                 # Postgres connection string
ANTHROPIC_API_KEY=            # Anthropic API (claude-sonnet-4-6); без ключа — mock mode
PERPLEXITY_API_KEY=           # Perplexity sonar-pro; без ключа — mock research
RESEARCH_MODE=real            # 'real' = Perplexity; иначе mock adapters (default)
```

## Требования к производительности

- Весь flow intake → отчёт: < 5 минут
- Mock research pipeline: < 3 секунд
- UI: Core Web Vitals в зелёной зоне на финальном этапе

## Safe MVP Assumptions

- Один пользователь, одна компания (авторизация добавляется позже)
- Все данные — публичные (нет закрытых API в MVP)
- Формат отчёта будет уточнён в отдельном промпте после MVP (F-010/T-011)
- 4 потока research запускаются параллельно через `Promise.all()` в `orchestrator.ts`
