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
/intake          → клиент заполняет минимальную форму
/research/[id]   → страница прогресса auto-research (4 потока)
/workspace/[id]/validation  → просмотр и проверка собранных фактов
/workspace/[id]/report      → готовый структурированный отчёт
```

### App Router структура

```
app/
  (public)/
    page.tsx                  — лендинг
  (app)/
    intake/
      page.tsx                — F-003: минимальная форма
    research/
      [id]/
        page.tsx              — F-004: прогресс auto-research pipeline
    workspace/
      [id]/
        validation/
          page.tsx            — F-005: проверка данных
        report/
          page.tsx            — F-008: отчёт
  api/
    research/
      start/route.ts          — запуск pipeline после intake
      status/[id]/route.ts    — статус research_job
    generate/route.ts         — генерация отчёта (F-007)
    export/route.ts           — экспорт (F-009, mock)
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
- `reports` — сгенерированные отчёты
- `embeddings` — векторные представления фактов (pgvector)

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

## RAG Pipeline

```
facts → embed(fact.content) → store in pgvector (с research_type)
query → embed(query) → similarity search (фильтр по company_id, research_type) → top-K → LLM context
```

Embeddings: Vercel AI SDK `embed()` (провайдер — уточнить при реализации).

## AI Generation

Vercel AI SDK `streamText()`:
- System prompt включает методологию RS, правила достоверности, список допустимых РФ-каналов
- User context формируется только из RAG-фактов компании (по всем 4 потокам)
- LLM не добавляет неверифицированных утверждений
- При нехватке данных — явно выводить «НЕДОСТАТОЧНО ДАННЫХ»
- Fallback-уточнение клиенту: только при критическом пробеле, не в процессе обычной генерации

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
DATABASE_URL=
OPENAI_API_KEY=         # или другой AI провайдер
```

## Требования к производительности

- Весь flow intake → отчёт: < 5 минут
- Mock research pipeline: < 3 секунд
- UI: Core Web Vitals в зелёной зоне на финальном этапе

## Safe MVP Assumptions

- Один пользователь, одна компания (авторизация добавляется позже)
- Все данные — публичные (нет закрытых API в MVP)
- Формат отчёта будет уточнён в отдельном промпте после MVP
- 4 потока research в MVP запускаются последовательно (не параллельно) для простоты, параллельность — в следующей итерации
