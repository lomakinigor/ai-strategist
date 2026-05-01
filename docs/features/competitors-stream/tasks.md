# Tasks: Competitors research stream

Разбивка на проверяемые шаги 5–15 минут. Каждый шаг — отдельный TDD-цикл (red → green → refactor).

## T1. Types: добавить 'competitors' в ResearchType
- Файл: `src/lib/types.ts`
- Действие: расширить union
- Проверка: `npx tsc --noEmit` ⇒ ловит места где надо обновить
- ETA: 2 мин

## T2. Schema: добавить enum value + colonка в Drizzle
- Файл: `src/db/schema.ts`
- Действие: добавить `'competitors'` в pgEnum, `competitorsStatus` в researchJobs
- Проверка: tsc зелёный
- ETA: 5 мин

## T3. Generate миграцию через Drizzle
- Команда: `npx drizzle-kit generate`
- Просмотр сгенерированного SQL
- Дописать `UPDATE research_jobs SET competitors_status = 'done';` в файл миграции если drizzle не сгенерировал
- ETA: 5 мин

## T4. Применить миграцию локально
- Команда: `npx drizzle-kit migrate`
- Проверка: `psql` или Neon UI показывает новую колонку
- ETA: 3 мин

## T5. Reliability classify — TDD
- Файл: `src/lib/reliability/__tests__/classify.test.ts`
- Шаг 5.1: написать failing тест: `source=null, rs=2 → INSUFFICIENT_DATA + isActive=false`
- Шаг 5.2: убедиться red
- Шаг 5.3: обновить `classify.ts` — добавить условие `!source || rs <= 2 → isActive=false` (точные правила в spec A2)
- Шаг 5.4: green
- Шаг 5.5: добавить остальные 4 теста для полноты (RS=1 без source, RS=3 без source, source.url='' и т.п.)
- ETA: 15 мин

## T6. Competitors mock-adapter — TDD
- Файл: `src/lib/research/__tests__/competitors-adapter.test.ts`
- Шаг 6.1: тест «collect возвращает 3 точки research_type=competitors»
- Шаг 6.2: red (адаптер ещё не существует)
- Шаг 6.3: создать `src/lib/research/competitors-adapter.mock.ts` по образцу business-adapter
- Шаг 6.4: green
- Шаг 6.5: добавить тесты на подстановку company.name, на rs ≥ 3
- ETA: 12 мин

## T7. Perplexity-промпт для competitors + verifiability rule
- Файл: `src/lib/ai/providers/perplexity-research-provider.ts`
- Шаг 7.1: добавить case `'competitors'` в switch-statement промптов
- Шаг 7.2: дописать к каждому из 5 промптов: «утверждай только то, что подтверждается публичным URL — иначе пропусти»
- Тесты для этого файла уже есть — обновить если падают
- ETA: 10 мин

## T8. Orchestrator — 5 потоков
- Файл: `src/lib/research/orchestrator.ts`
- Шаг 8.1: импорт competitorsMock + Perplexity-call
- Шаг 8.2: добавить 5-й параметр в `Promise.all`
- Шаг 8.3: установка `competitors_status` в `done`/`error`
- Шаг 8.4: запустить тесты orchestrator (если есть) — обновить
- ETA: 10 мин

## T9. RAG context — competitors block
- Файл: `src/lib/rag/context.ts` + `src/lib/rag/__tests__/context.test.ts`
- Шаг 9.1: failing тест «buildResearchContext возвращает 5 блоков»
- Шаг 9.2: red
- Шаг 9.3: добавить group для 'competitors' в `buildResearchContext`, обновить `serializeContext` с заголовком «=== Анализ конкурентов ===»
- Шаг 9.4: green
- Шаг 9.5: тест на `getBlockByType(ctx, 'competitors')`
- ETA: 12 мин

## T10. UI: research page (5-я строка)
- Файл: `app/research/[id]/page.tsx`
- Действие: добавить `'competitors'` в `STREAM_LABELS`, `STREAM_COLORS`, `RESEARCH_TYPES`
- Добавить 5-й объект в массив `streams` с `key='competitors'`
- ETA: 8 мин

## T11. UI: validation page (5-й фильтр)
- Файл: `app/research/[id]/validation/page.tsx`
- Действие: добавить `'competitors'` в `STREAM_LABELS`, `STREAM_COLORS`, `ALL_STREAMS`
- ETA: 5 мин

## T12. Прогон полного test suite + tsc
- Команды: `npx tsc --noEmit`, `npx vitest run`
- Цель: всё зелёное (102 + новые ≈ 117)
- ETA: 5 мин

## T13. End-to-end smoke на dev
- Запустить dev server (если не запущен)
- Создать новое исследование тестовой компании
- Запустить research → дождаться 5/5 done
- Перейти в validation → проверить что есть competitors-факты
- Сгенерировать стратегию → проверить competitor-карточки в отчёте
- ETA: 15 мин

## T14. Self-review + commit
- Файл: `docs/features/competitors-stream/review.md`
- Описать: что изменено, риски, что не покрыто
- Commit + push с conventional message
- ETA: 8 мин

## T15. Применить миграцию на production
- Решение: применять только ПОСЛЕ деплоя нового кода (новый код устойчив к старой схеме? Нет, требует колонку → значит ДО деплоя)
- Альтернатива: применить миграцию вручную через `drizzle-kit migrate` против production DATABASE_URL до коммита кода
- Корректный порядок: (a) применить миграцию на production вручную → (b) commit + push кода → Vercel задеплоит
- ETA: 5 мин

---

## Итог
~120 минут чистого времени, разбитого на 15 шагов. Каждый шаг проверяется отдельно.

## Порядок выполнения
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T15 → T14

T15 (production migration) идёт ДО финального commit'a, чтобы push не уронил production.
