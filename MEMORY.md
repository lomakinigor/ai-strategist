# MEMORY — ai-strategist

> Краткий реестр ключевых решений и контекста проекта.
> Детали — в `memory/YYYY-MM-DD.md` и `knowledge/`.

## Клиент

- Проект собственный (не клиентский заказ)
- Целевой рынок: РФ

## Проекты

| ID | Название | Статус | Ссылка |
|----|----------|--------|--------|
| ai-strategist | AI-платформа стратегического анализа | In Progress — F-000A завершён | [docs/PRD.md](docs/PRD.md) |

## Стек

- Next.js 14 App Router · TypeScript strict · Tailwind CSS v4 · shadcn/ui
- Vercel AI SDK · Drizzle ORM · Postgres + pgvector
- Mock/in-memory для MVP, потом реальные провайдеры

## Предпочтения

- Spec-driven: один промпт = одна задача
- analyze → plan → files → implementation → next step
- Не строить всё сразу, предпочитать безопасные MVP-решения
- Формат ответа зафиксирован в CLAUDE.md

## Решения

| Дата | Решение | Обоснование |
|------|---------|-------------|
| 2026-04-23 | Frontend-first Next.js 14 | Быстрый старт MVP, удобный DX |
| 2026-04-23 | Mock/in-memory первым | Не блокировать UI на внешних зависимостях |
| 2026-04-23 | Нейтральный формат отчёта | Формат уточняется после MVP — закладываем flexible структуру |
| 2026-04-23 | RS 1–5 как единая шкала достоверности | Прозрачность данных, защита от галлюцинаций LLM |
| 2026-04-27 | Минимальный intake + auto-research pipeline | MVP — не чат-интервью, а автоматизированный workflow |
| 2026-04-27 | 4 потока research: business/market/audience/channels | Исследование аудитории обязательно, не опционально |
| 2026-04-27 | research_jobs таблица для tracking pipeline | Нужен явный статус каждого из 4 потоков |
| 2026-04-27 | Fallback-вопросы только при критической нехватке данных | Не прерывать flow, при нехватке — НЕДОСТАТОЧНО ДАННЫХ |
| 2026-04-27 | Клиентский отчёт — главный результат приложения | Вся техническая цепочка существует ради качественного отчёта |
| 2026-04-27 | MVP-формат отчёта рабочий и временный | Финальные правила формата — после первых реальных тестов (F-010) |
| 2026-04-27 | Report/export layer — изолированный модуль | Можно переработать без ломки research pipeline и RAG |
| 2026-04-27 | DB schema: 9 таблиц, facts.research_type покрывает 4 потока | Избегаем дублирующих таблиц market_insights/audience_insights |
| 2026-04-27 | pgvector vector-колонка — отдельный шаг в T-007 | Требует CREATE EXTENSION vector перед alter table |
| 2026-04-27 | Perplexity Sonar (sonar-pro) — default research provider | Real-time web + citations = соответствие RS-принципу; Anthropic — для стратегии |
| 2026-04-27 | AI provider abstraction layer в src/lib/ai/ | Router + config — одна точка переключения провайдера/модели без ломки бизнес-логики |
| 2026-04-27 | RS → Confidence: RS 4–5 HIGH, RS 3 MEDIUM, RS 1–2 LOW | Зафиксировано в rules.ts, покрыто тестами |
| 2026-04-27 | Vitest установлен, test-скрипт добавлен в package.json | npm run test = vitest run |
| 2026-04-27 | PreToolUse hooks удалены — давали ложные тройные сигналы | PreToolUse срабатывает при каждом вызове, не только при permission dialog |
| 2026-04-27 | Тройной сигнал нисходящий: 784→659→523 Hz | Нет хука PermissionRequest в Claude Code; Notification — ближайший аналог |
| 2026-04-27 | Обязательное резюме зафиксировано в CLAUDE.md как жёсткое правило | Задача не завершена без блока «РЕЗЮМЕ ДЛЯ ПЕРЕДАЧИ В ЧАТ» |

## Ссылки

- [CLAUDE.md](CLAUDE.md) — правила работы с проектом
- [docs/PRD.md](docs/PRD.md) — Product Requirements Document
- [docs/features.md](docs/features.md) — фичи F-000..F-009
- [docs/tasks.md](docs/tasks.md) — задачи T-000..T-009
- [docs/plan.md](docs/plan.md) — план этапов
- [docs/tech-spec.md](docs/tech-spec.md) — технический spec
- [docs/data-model.md](docs/data-model.md) — модель данных
- [.claude/rules/data-reliability.md](.claude/rules/data-reliability.md) — RS и методология
- [.claude/rules/russia-context.md](.claude/rules/russia-context.md) — РФ-контекст
