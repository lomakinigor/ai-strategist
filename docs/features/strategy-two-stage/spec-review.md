# Spec review

Дата: 2026-05-01

## Checklist

- [x] **Acceptance criteria измеримы** — A1..A8, каждое можно проверить
- [x] **Affected files перечислены** — domain, db, actions, UI, config
- [x] **Изменения БД минимальны** — только +1 значение enum, без новых колонок
- [x] **Mock-режим описан** — A8 явно указывает fallback
- [x] **Rollback понятен** — env-флаг + enum value безопасен
- [x] **Тесты-первые подход возможен** — unit (mock LLM), integration (server actions), manual smoke
- [x] **Out of scope зафиксирован** — стриминг, jobs, realtime прогресс, удаление флага
- [x] **Out of scope не содержит того, что критично для feature** — каждый пункт обоснован
- [x] **Совместимость с текущей кодовой базой** — `parseSections`, `STRATEGY_SYSTEM_PROMPT` остаются, генератор расширяется без breaking change для one-shot режима

## Возможные риски / вопросы

1. **Mock-режим всегда `done`** (A8) — а если флаг включён, нужен ли mock в двух стадиях для тестирования UI? Решение: оставить mock одношаговым, для тестирования UI перейти на real-режим (или добавить отдельный тест-флаг позже). Не блокирует.

2. **`generateStrategyAction` маршрутизирует по статусу** — но при первом вызове artifact ещё не существует. Решение: action остаётся entry point для Stage 1; для Stage 2 — отдельный action `synthesizeStrategyAction`, вызываемый отдельной кнопкой. Уточнено в spec.

3. **Промпты для секций** — нужно вытащить из существующего `STRATEGY_SYSTEM_PROMPT` правила asset-card, anti-platitude и применить к каждой секции отдельно. Не нарушает существующий one-shot режим.

4. **Контекст для синтеза** — 5 секций × ~2000 токенов = ~10K токенов на вход. DeepSeek-v4-flash контекст ≥64K, проблем не будет.

## Gate

✅ **Проходит** — переход к Tasks.
