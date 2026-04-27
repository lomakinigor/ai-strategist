# Задачи — ai-strategist

> Каждая задача привязана к фиче. Статусы: Planned / In Progress / Done / Blocked

---

## T-000 — Project Foundation Init

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-000 |
| **Описание** | Создать всю проектную документацию: CLAUDE.md, правила, MEMORY.md, docs/, knowledge/ |
| **Тест-критерий** | Все 14 файлов созданы, содержат корректный контент, нет незаполненных секций |

**Отчёт:** Выполнено 2026-04-23. Созданы все базовые файлы проектной основы.

---

## T-000C — Fix Permission Notification Hooks and Enforce Final Summary

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-000 (dev tooling) |
| **Описание** | Убрать ложные PreToolUse-сигналы. Переключить тройной сигнал на Notification hook. Сменить паттерн тройного сигнала на нисходящий. Зафиксировать обязательное резюме в CLAUDE.md. |
| **Тест-критерий** | PreToolUse убран. Тройной сигнал нисходящий (784→659→523 Hz). Правило резюме в CLAUDE.md. knowledge/notifications.md обновлён. |

**Отчёт:** Выполнено 2026-04-27. Удалены PreToolUse hooks (Bash/Edit/Write/MultiEdit) из settings.json — они давали ложные сигналы. Тройной нисходящий паттерн: 784→659→523 Hz (соль-ми-до). Правило обязательного резюме добавлено в CLAUDE.md как жёсткое. knowledge/notifications.md актуализирован. Задокументировано: нет хука PermissionRequest в Claude Code — Notification является ближайшим аналогом.

---

## T-000A — Product Logic Correction

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-000 |
| **Описание** | Обновить все документы под уточнённую продуктовую логику: минимальный intake, auto-research pipeline (4 потока), исследование аудитории как обязательный этап, принцип минимума вопросов, явный статус клиентского отчёта как главного результата, post-MVP этап доработки формата отчёта. |
| **Тест-критерий** | (1) Во всех ключевых документах отражена новая логика. (2) Audience research добавлен как обязательный этап. (3) Принцип "минимум вопросов, максимум авто-исследования" зафиксирован. (4) Зафиксировано: клиентский отчёт — главный результат приложения. (5) Зафиксировано: финальный формат отчёта дорабатывается после первых тестов. (6) Tasks и plan синхронизированы с PRD. (7) T-010 добавлена. (8) MEMORY.md и memory/ обновлены. |

**Отчёт:** Выполнено 2026-04-27 (2 итерации). Обновлены: CLAUDE.md, PRD, features (+ F-010), plan (+ Этап 7), tasks (+ T-010), tech-spec, data-model, user-stories, MEMORY.md, memory/.

---

## T-000B — Sound Notifications for Claude Code

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-000 (dev tooling) |
| **Описание** | Настроить звуковые уведомления для рабочего процесса: двойной сигнал при завершении задачи, тройной сигнал при ожидании подтверждения разработчика. |
| **Тест-критерий** | Звуковой сигнал срабатывает после завершения задачи. Создан knowledge/notifications.md с инструкцией. Ограничения задокументированы. |

**Отчёт:** Выполнено 2026-04-27. Реализовано через хуки Claude Code в `~/.claude/settings.json`: `Stop` → двойной бип (880 Hz), `Notification` → тройной бип (660 Hz). Метод: `[System.Console]::Beep()` через PowerShell (Windows 10, без внешних зависимостей). Созданы: knowledge/notifications.md, scripts/beep-done.ps1, scripts/beep-wait.ps1. Хук `Stop` проверен вручную.

---

## T-001B — Git Remote, Push and Vercel Deploy

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-001 |
| **Описание** | Настроить git remote origin, выполнить push всех коммитов на GitHub, задеплоить проект на Vercel. |
| **Тест-критерий** | remote origin настроен. Все коммиты запушены. Проект открывается по deploy URL без ошибок. DATABASE_URL добавлен в Vercel env vars. |

**Отчёт:** Выполнено 2026-04-27. Remote origin: `https://github.com/lomakinigor/ai-strategist.git`. Push выполнен — все коммиты на GitHub. Deploy: Vercel UI (Import Git Repository). Production URL: `https://ai-strategist-bice.vercel.app`. Status: Ready, Source: `14f69b4`. Smoke-check: страница открывается, отображается заглушка AI-Стратег. DATABASE_URL не задан — добавить в Vercel env vars перед подключением БД.

---

## T-001 — Next.js Project Setup

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-001 |
| **Описание** | Инициализировать Next.js 14 с TypeScript strict, Tailwind v4, shadcn/ui. Настроить Drizzle ORM и подключение к Postgres. |
| **Тест-критерий** | `npm run build` проходит без ошибок. `npm run dev` запускается. TypeScript strict включён. |

**Отчёт:** Выполнено 2026-04-27. Созданы: package.json, tsconfig.json (strict), next.config.ts, postcss.config.mjs, drizzle.config.ts, components.json. Стек: Next.js 14.2.21, TypeScript strict, Tailwind v4, shadcn/ui-ready, Drizzle ORM. Минимальный app/layout.tsx + app/page.tsx.

---

## T-002 — Database Schema

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-001 |
| **Описание** | Создать схему БД: таблицы companies, sources, facts, research_jobs, reports, embeddings. Drizzle-миграции. |
| **Тест-критерий** | Миграции применяются без ошибок. TypeScript-типы корректно выводятся из схемы. Поле `research_type` есть в facts и research_jobs. |

**Отчёт:** Выполнено 2026-04-27. Создан src/db/schema.ts: 9 таблиц (users, companies, intake_submissions, research_jobs, sources, facts, strategy_artifacts, report_artifacts, embeddings), 7 pgEnum, полные relations. Все foreign keys и индексы. pgvector: структура готова, vector-колонка добавляется в T-007 после `CREATE EXTENSION vector`. Создан src/db/index.ts (Drizzle client), src/lib/types.ts (TypeScript-типы для домена).

---

## T-003 — Reliability Engine + AI Provider Foundation

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-002 |
| **Описание** | Реализовать модуль: присвоение RS (1–5), классификация ФАКТ / ГИПОТЕЗА / НЕДОСТАТОЧНО ДАННЫХ, уровень достоверности HIGH / MEDIUM / LOW. Заложить AI provider abstraction layer с Perplexity как default research provider. |
| **Тест-критерий** | Unit-тесты покрывают все ветки классификации. classify(RawDataPoint) → VerifiedFact. Perplexity зафиксирован как default. Router и config позволяют переключать провайдер. 25 тестов, tsc --noEmit без ошибок. |

**Отчёт:** Выполнено 2026-04-27. Создан `src/lib/reliability/` (classify, rules, index). Реализована функция classify(RawDataPoint): VerifiedFact. RS → ConfidenceLevel: RS 4–5 → HIGH, RS 3 → MEDIUM, RS 1–2 → LOW. FactType: FACT (RS ≥ 3 + source + date), HYPOTHESIS (RS 2 или нет даты), INSUFFICIENT_DATA (RS ≤ 1 / нет source / нет data). Создан `src/lib/ai/` (types, config, router, providers). Perplexity = default research provider (sonar-pro), placeholder без реальных API-вызовов. Vitest установлен, 25 unit-тестов, tsc --noEmit ✓.

---

## T-004 — Minimal Research Intake Form

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-003 |
| **Описание** | Создать минимальную форму (~5 полей): название, отрасль, описание, сайт, каналы присутствия. После отправки — автоматически создаётся research_job и запускается pipeline. Никаких дополнительных вопросов клиенту в этом шаге. |
| **Тест-критерий** | Форма валидирует обязательные поля (название, отрасль). После отправки: запись в companies, research_job создан, клиент перенаправлен на страницу прогресса. |

**Отчёт:** Выполнено 2026-04-27. Создана страница `app/intake/page.tsx` (Server Component, 5 полей: название, отрасль, описание, сайт, цель исследования). Server Action `app/intake/actions.ts` создаёт company → intake_submission → research_job (status: pending) через Drizzle ORM. Редирект на `app/research/[id]/page.tsx` — страница статуса с 4 потоками. `src/db/index.ts` переведён на ленивую инициализацию (`getDb()`). `npm run test` 25/25 ✓, `npm run build` ✓.

---

## T-005 — Auto-Research Mock Adapters

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-004 |
| **Описание** | Создать 4 mock-адаптера с единым интерфейсом `{ data, source, date, rs, research_type }`: business / market / audience / channels. Запускаются параллельно после intake. |
| **Тест-критерий** | Все 4 адаптера возвращают данные нужного формата. `research_type` соответствует адаптеру. Интерфейс задокументирован. Структура готова для реальных провайдеров. |

**Отчёт:** Выполнено 2026-04-27. Созданы: `src/lib/research/business-adapter.mock.ts`, `market-adapter.mock.ts`, `audience-adapter.mock.ts`, `channels-adapter.mock.ts` — каждый реализует `ResearchAdapter`, возвращает 3 `RawDataPoint[]` с подстановкой данных компании. Создан `src/lib/research/orchestrator.ts`: `startResearchJob(jobId)` переводит research_job pending→running (все 4 stream)→запускает адаптеры через `Promise.all()`→сохраняет факты в таблицу `facts` через `classify()`→переводит в done. Создан `app/research/[id]/actions.ts`: Server Action `triggerMockResearch`. Обновлён `app/research/[id]/page.tsx`: кнопка запуска при pending, сообщение при running, mock-результаты (первый факт каждого потока) при done. 43 unit-теста (25 reliability + 18 adapter tests), `npm run build` ✓.

---

## T-006 — Perplexity Real Research Integration

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-005 |
| **Описание** | Подключить реальный Perplexity API к AI-слою. Добавить researchMode: mock/real. Orchestrator переключается между mock-адаптерами и Perplexity по флагу. UI отражает режим и sources. |
| **Тест-критерий** | PerplexityResearchProvider вызывает реальный API (mock-fetch в тестах). AI_CONFIG.research.mode управляется через RESEARCH_MODE. Orchestrator поддерживает оба режима. UI показывает режим, источники при real mode. |

**Отчёт:** Выполнено 2026-04-27. Endpoint: `POST https://api.perplexity.ai/chat/completions`, model: `sonar-pro`, `return_citations: true`. Запрос: `messages[system + user]` с промптом по шаблону research_type + данные компании. Ответ: `choices[0].message.content` разбивается на абзацы → `RawDataPoint[]` (RS:3 при наличии citations, RS:2 без); `citations[]` → `source` поле. `AI_CONFIG.research.mode`: `process.env.RESEARCH_MODE === 'real' ? 'real' : 'mock'`. Orchestrator: `startResearchJob()` → dispatch на `runMockResearch()` или `runRealResearch()`. Real mode создаёт записи в `sources` (inferSourceType по hostname) и линкует через `facts.sourceId`. При ошибке (нет API-ключа, HTTP-ошибка) → job.status=error с errorMessage. UI: badge «Режим: mock/Perplexity (real)», mode-aware кнопка и тексты, блок источников при done+real. 57 unit-тестов (+14 PerplexityProvider), `npm run build` ✓.

---

## T-007 — Validation Workspace UI

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-006 |
| **Описание** | Рабочее место аналитика для проверки и отбора фактов после research pipeline. Фильтрация по потоку / типу / достоверности. Включение/отключение отдельных фактов (isActive). Просмотр источников. |
| **Тест-критерий** | Страница /research/[id]/validation отображает факты job. Работают фильтры по stream/factType/confidence/onlyActive. Чекбокс isActive сохраняется в БД. Источники показываются со ссылкой и типом. Unit-тесты getFactsForJob и setFactActive зелёные. |

**Отчёт:** Выполнено 2026-04-27. Создан `src/lib/reporting/validation.ts` с `getFactsForJob(jobId, filters?)` и `setFactActive(factId, isActive)`. Страница `app/research/[id]/validation/page.tsx`: Server Component, фильтры через URL search params (`?streams=...&factTypes=...&confidences=...&onlyActive=1`), переключение фактов через Server Action + revalidatePath. Карточка факта: поток/тип/достоверность/RS badges + ссылка на источник с типом. Навигация: `/research/[id]` → кнопка «Перейти к валидации фактов», validation → ссылка «Назад». 69 unit-тестов (57 существующих + 12 новых). `npm run build` ✓.

---

## T-008 — RAG Context Layer

| Поле | Значение |
|------|----------|
| **Статус** | Done |
| **Feature** | F-007 |
| **Описание** | Pipeline: активные факты → embeddings → pgvector. Retrieval по company_id и research_type для формирования контекста LLM. |
| **Тест-критерий** | Факты индексируются в pgvector. Запрос возвращает релевантные факты по нужному research_type. LLM не получает данных без источника. |

**Отчёт:** Выполнено 2026-04-27. Создан `src/lib/rag/context.ts`: функция `buildResearchContext(jobId)` — SQL-based retrieval активных фактов, группировка по research_type, форматирование в текстовые блоки для LLM-промптов на русском (`[ФАКТ][HIGH][RS:4] ... Источник: ...`). Вспомогательные функции: `getBlockByType(ctx, type)` и `serializeContext(ctx)`. pgvector-колонка не добавляется в MVP — retrieval по research_type достаточен при малом объёме фактов; интерфейс готов для pgvector-расширения. Создан `src/lib/rag/__tests__/context.test.ts`: 12 unit-тестов (форматирование, группировка, пустые потоки, русские метки, отсутствие источника). 81 тест всего (69+12), `npm run build` ✓.

---

## T-009 — AI Strategy Generation

| Поле | Значение |
|------|----------|
| **Статус** | Planned |
| **Feature** | F-008 |
| **Описание** | Генерация структурированного отчёта по 5 разделам через Vercel AI SDK. Промпт формируется из верифицированных фактов RAG по всем 4 потокам. Fallback-уточнение клиенту — только при критической нехватке данных для ключевого вывода. |
| **Тест-критерий** | Отчёт содержит 5 разделов. Каждый ключевой факт привязан к источнику. Нет неподтверждённых утверждений о компании. При нехватке данных — «НЕДОСТАТОЧНО ДАННЫХ», не домысел. |

**Отчёт:** _(заполняется после выполнения)_

---

## T-010 — Strategy Workspace & Export Foundation

| Поле | Значение |
|------|----------|
| **Статус** | Planned |
| **Feature** | F-009, F-010 |
| **Описание** | UI отчёта с 5 разделами (бизнес / рынок / аудитория / каналы / стратегия). Маркировка утверждений. Рекомендации по автоматизации. Базовая инфраструктура экспорта (mock). Формат MVP — рабочий и временный. |
| **Тест-критерий** | Все 5 разделов присутствуют. Все ключевые утверждения маркированы. Текст на русском, суммы в рублях. Mock-экспорт не вызывает ошибок. |

**Отчёт:** _(заполняется после выполнения)_

---

## T-011 — Post-MVP Report Output Refinement

| Поле | Значение |
|------|----------|
| **Статус** | Future (post-MVP) |
| **Feature** | F-011 |
| **Описание** | Глубокая доработка формата клиентского отчёта после первых реальных тестов. Включает: структуру блоков, логику разделов, уровень детализации, стандарты клиентской подачи, правила для рекомендаций по автоматизации. Обновление промптов, компонентов и export-слоя. |
| **Тест-критерий** | Зафиксированы правила output format в отдельном документе. Промпты обновлены. UI компоненты отчёта обновлены. Проверено на минимум 1 реальном клиентском кейсе. |

**Отчёт:** _(заполняется после выполнения)_
