# Структура проекта — ai-strategist

> Желаемая структура для MVP. Создаётся итерационно, начиная с T-001.

```
ai-strategist/
│
├── CLAUDE.md                         # Правила работы с проектом
├── MEMORY.md                         # Индекс ключевых решений
│
├── .claude/
│   └── rules/
│       ├── data-reliability.md       # RS, методология достоверности
│       └── russia-context.md         # РФ-контекст, каналы, язык
│
├── memory/
│   └── YYYY-MM-DD.md                 # Записи сессий
│
├── knowledge/
│   └── architecture.md               # Архитектура MVP
│
├── docs/
│   ├── PRD.md                        # Product Requirements Document
│   ├── features.md                   # Фичи F-000..F-009
│   ├── plan.md                       # Этапы разработки
│   ├── tasks.md                      # Задачи T-000..T-009
│   ├── tech-spec.md                  # Технический spec
│   ├── data-model.md                 # Модель данных
│   ├── user-stories.md               # User stories
│   └── directory-structure.md        # Этот файл
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/
│   │   │   └── page.tsx              # Лендинг
│   │   ├── (app)/
│   │   │   ├── intake/
│   │   │   │   └── page.tsx          # Форма загрузки компании (F-003)
│   │   │   └── workspace/
│   │   │       └── [id]/
│   │   │           ├── validation/
│   │   │           │   └── page.tsx  # Проверка данных (F-005)
│   │   │           └── report/
│   │   │               └── page.tsx  # Отчёт (F-008)
│   │   ├── api/
│   │   │   ├── research/
│   │   │   │   └── route.ts          # Сбор данных (F-004)
│   │   │   ├── generate/
│   │   │   │   └── route.ts          # Генерация отчёта (F-007)
│   │   │   └── export/
│   │   │       └── route.ts          # Экспорт (F-009, mock)
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── lib/
│   │   ├── reliability/
│   │   │   ├── index.ts              # Публичный API модуля
│   │   │   ├── score.ts              # Логика RS и классификации (F-002)
│   │   │   └── types.ts              # VerifiedFact, FactType и др.
│   │   │
│   │   ├── research/
│   │   │   ├── adapters/
│   │   │   │   ├── base.ts           # Интерфейс ResearchAdapter
│   │   │   │   └── mock.ts           # Mock-реализация (F-004)
│   │   │   └── index.ts
│   │   │
│   │   ├── rag/
│   │   │   ├── embed.ts              # Создание embeddings (F-006)
│   │   │   ├── retrieve.ts           # Similarity search
│   │   │   └── index.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── generate.ts           # Генерация отчёта (F-007)
│   │   │   └── prompts.ts            # System prompts
│   │   │
│   │   └── db/
│   │       ├── schema.ts             # Drizzle schema (F-001)
│   │       ├── index.ts              # DB client
│   │       └── migrations/           # Drizzle migrations
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui компоненты
│   │   ├── intake/                   # Компоненты формы загрузки
│   │   ├── validation/               # Компоненты workspace проверки
│   │   └── report/                   # Компоненты отчёта
│   │
│   └── types/
│       └── index.ts                  # Общие типы
│
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

## Ключевые соглашения

- `src/lib/` — только domain logic, без UI
- `src/components/` — только UI, без прямых DB-запросов
- `src/app/api/` — тонкие маршруты, делегируют в `lib/`
- Все типы из `src/lib/reliability/types.ts` используются по всему проекту
- Mock-адаптеры и реальные — одинаковый интерфейс, легко заменяются
