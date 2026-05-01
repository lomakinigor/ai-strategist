# ai-strategist — CLAUDE.md

## Идентичность

SaaS для российских компаний. Минимальный intake → автоматический research pipeline → отчёт из 5 разделов:
1. Бизнес клиента 2. Рынок и ниша 3. Целевая аудитория 4. Каналы и присутствие 5. Стратегия с AI-рекомендациями

## Ключевой принцип

> Каждый факт — с источником, датой и reliability score. Нет данных — нет вывода.

Подробнее: [.claude/rules/data-reliability.md](.claude/rules/data-reliability.md), [.claude/rules/russia-context.md](.claude/rules/russia-context.md), [.claude/rules/hooks.md](.claude/rules/hooks.md)

## Стек

Next.js 14 App Router · TypeScript strict · Tailwind v4 · shadcn/ui · Drizzle · Postgres+pgvector · Vercel AI SDK + OpenRouter (DeepSeek). Детали: [docs/tech-spec.md](docs/tech-spec.md), [docs/directory-structure.md](docs/directory-structure.md)

## Рабочий процесс

- Один промпт = одна задача
- analyze → plan → files → implementation → next step
- Опираться на [docs/](docs/) и [.claude/rules/](.claude/rules/)
- Не строить весь продукт сразу, предпочитать MVP-решения
- Не добавлять функциональность сверх задачи
- Суммы — в рублях

## opusplan-стратегия (экономия токенов)

> План и архитектура — Opus. Реализация кода — Sonnet.

После завершения планирования переключать модель: `/model claude-sonnet-4-6`. Возвращаться к Opus только для review, спорных архитектурных решений, отладки сложных багов.

## MVP-скоуп

Входные данные — минимальная форма (intake). Процесс — автоматический research pipeline без лишних вопросов клиенту. Уточняющие вопросы — fallback при критической нехватке данных. Выход — отчёт + стратегические рекомендации (PRD: [docs/PRD.md](docs/PRD.md)).

> Клиентский отчёт — главный результат работы приложения. MVP-формат отчёта временный, финальные правила фиксируются после первых реальных клиентских тестов.

## Формат ответа

```
1. Brief analysis
2. Implementation plan
3. Files created/changed
4. Implementation summary
5. Recommended next step
6. РЕЗЮМЕ ДЛЯ ПЕРЕДАЧИ В ЧАТ
```

## Обязательное резюме

> Задача завершена только если ответ содержит блок «РЕЗЮМЕ ДЛЯ ПЕРЕДАЧИ В ЧАТ».

Минимум: изменённые файлы, суть, статус (Done/Partial/Failed), commit hash, push (success/failed), deploy (required/not), assumptions, следующий шаг.

## Память

Старт сессии: читать [MEMORY.md](MEMORY.md), `memory/` за 3 дня. Создавать `memory/YYYY-MM-DD.md` если нет. Решения → MEMORY.md, прогресс → дневной файл, повторяемые чек-листы → `knowledge/`.

## Динамический план

В [docs/plan.md](docs/plan.md) и [docs/tasks.md](docs/tasks.md) можно в любой момент добавить пункт. Каждый — с описанием, тест-критерием и шаблоном отчёта.

## Принцип достоверности (кратко)

Разделять: ФАКТ · ГИПОТЕЗА · НЕДОСТАТОЧНО ДАННЫХ. Уровни: HIGH · MEDIUM · LOW. LLM не опирается на внутренние «знания» о конкретной компании — только собранные данные и RAG. Полные правила: [.claude/rules/data-reliability.md](.claude/rules/data-reliability.md)

## Российский контекст (кратко)

Все тексты — на русском. Каналы и рынок — РФ. Допустимые термины без перевода: API, SEO, SMM, CRM, KPI, ROI, MVP, SaaS, RAG, LLM. Полные правила: [.claude/rules/russia-context.md](.claude/rules/russia-context.md)
