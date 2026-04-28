# MEMORY — ai-strategist

> Краткий реестр ключевых решений и контекста проекта.
> Детали — в `memory/YYYY-MM-DD.md` и `knowledge/`.

## Клиент

- Проект собственный (не клиентский заказ)
- Целевой рынок: РФ

## Проекты

| ID | Название | Статус | Ссылка |
|----|----------|--------|--------|
| ai-strategist | AI-платформа стратегического анализа | MVP Done — F-001..F-009 завершены, T-010 последняя задача | [docs/PRD.md](docs/PRD.md) |

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
| 2026-04-27 | src/db/index.ts — ленивый getDb() вместо module-level throw | Без этого npm run build падает при импорте из server action |
| 2026-04-27 | Intake flow: /intake → Server Action → redirect /research/[id] | Server Component + Server Action, нет client-side state |
| 2026-04-27 | Intake создаёт: company → intake_submission → research_job (pending) | Единственный flow в MVP; один research_job на компанию |
| 2026-04-27 | Mock adapters в src/lib/research/ — готовая структура под замену на Perplexity | Каждый адаптер реализует ResearchAdapter: collect(query) → RawDataPoint[] |
| 2026-04-27 | Orchestrator: Promise.all() для параллельного запуска 4 адаптеров | Все потоки стартуют одновременно, факты вставляются после завершения всех |
| 2026-04-27 | Факты от mock-адаптеров сохраняются в таблицу facts (без source record) | sourceId nullable — mock-факты вставляются без записи в sources |
| 2026-04-27 | /research/[id] — Server Component, запуск через form + Server Action | Кнопка запуска = HTML form с hidden jobId + triggerResearch action |
| 2026-04-27 | researchMode: mock/real управляется через RESEARCH_MODE env var | mock = default без API-ключа; real = Perplexity sonar-pro с return_citations |
| 2026-04-27 | Real mode создаёт source records (inferSourceType по hostname) | sourceId nullable — mock-факты без source, real-факты с source через sources таблицу |
| 2026-04-27 | Perplexity response: content → абзацы → RawDataPoint[], citations → source field | RS:3 при citations, RS:2 без. Промпты по шаблону per ResearchType на русском |
| 2026-04-27 | Validation Workspace /research/[id]/validation — ручная проверка фактов перед стратегией | Аналитик деактивирует нерелевантные факты; стратегия строится только по is_active=true |
| 2026-04-27 | Фильтры в Validation Workspace — через URL search params, Server Components only | streams/factTypes/confidences/onlyActive в URL; isActive toggle — Server Action + revalidatePath |
| 2026-04-27 | getFactsForJob() + setFactActive() — src/lib/reporting/validation.ts | Drizzle leftJoin facts→sources; onlyActive, streams, factTypes, confidences filters |
| 2026-04-27 | Notification hook заменён на PreToolUse+PostToolUse с timestamp-логикой | Notification не срабатывал при табличке разрешения; PostToolUse пишет timestamp, PreToolUse проверяет > 3 сек |
| 2026-04-27 | RAG Context Layer MVP: SQL-based retrieval без pgvector | При малом объёме фактов vector search не нужен; buildResearchContext(jobId) форматирует контекст для LLM по research_type |
| 2026-04-27 | serializeContext(ctx) — единая точка сборки LLM-промпта из всех 4 потоков | T-009 (AI Strategy Generation) вызывает эту функцию для формирования system-контекста |
| 2026-04-27 | src/lib/rag/context.ts: buildResearchContext, getBlockByType, serializeContext | RAG module; на вход jobId, на выходе ResearchContext с 4 блоками contextText |
| 2026-04-28 | Strategy generation: direct Anthropic API fetch (не Vercel AI SDK provider) | @ai-sdk/anthropic не в deps; используем fetch как в Perplexity; ANTHROPIC_API_KEY → real, иначе mock |
| 2026-04-28 | generateStrategyDraft: insert artifact first, then buildResearchContext inside try | Чтобы ошибки RAG/API всегда помечали artifact status=error (не теряли запись) |
| 2026-04-28 | report_artifacts: статус pending→generating→done/error; contentMarkdown = финальный markdown | Схема уже была в T-002; T-009 реализует запись; T-010 дорабатывает UI |
| 2026-04-28 | /research/[id]/report — полноценный Strategy Workspace: 5 секций, построчный renderer с цветной маркировкой, дисклеймер, CopyButton, ссылка Скачать .md | T-010 Done; T-009 viewer заменён |
| 2026-04-28 | /api/export/[artifactId] — GET-endpoint, отдаёт contentMarkdown как text/markdown attachment | F-009 Export Foundation; filename формируется по имени компании |
| 2026-04-28 | renderSectionContent — построчный renderer: [ФАКТ] зелёный border-l, [ГИПОТЕЗА] жёлтый, [НЕДОСТАТОЧНО ДАННЫХ] красный bg, ### → h4 | Визуальный guardrail прямо в Strategy Workspace |
| 2026-04-28 | Дисклеймер о достоверности: показывается только в real mode (не mock), содержит легенду маркировок | Явное предупреждение про ограничения AI-анализа |
| 2026-04-28 | Антигаллюцинационные правила в STRATEGY_SYSTEM_PROMPT: только факты из контекста, [ФАКТ]/[ГИПОТЕЗА]/[НЕДОСТАТОЧНО ДАННЫХ] обязательны | Ключевой guardrail против LLM-домыслов о конкретной компании |
| 2026-04-28 | MVP-stabilization-pass-01: features F-001..F-009 → Done, plan stages 1..6 → Done, tasks T-006/T-007/T-008/T-011 feature ID исправлены, tech-spec полностью приведён к реальному MVP | Docs были заморожены на Planned, tech-spec описывал устаревшие пути и технологии |

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
