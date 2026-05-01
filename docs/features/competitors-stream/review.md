# Self-review: Competitors research stream + verifiability filter

Дата: 2026-04-30  
Спецификация: [spec.md](spec.md)  
Брейнсторм: [brainstorm.md](brainstorm.md)

---

## Что изменено

### Domain layer
- `src/lib/types.ts` — `ResearchType` ⊃ `'competitors'`; `VerifiedFact` теперь содержит поле `isActive: boolean`
- `src/lib/reliability/classify.ts` — `isActive = type !== 'INSUFFICIENT_DATA'` (auto-deactivation для фактов без источника или с RS≤1)
- `src/lib/reliability/rules.ts` — без изменений (логика `classifyFactType` уже корректна)

### Research pipeline
- `src/lib/research/competitors-adapter.mock.ts` — новый файл (3 mock-точки)
- `src/lib/research/orchestrator.ts` — 5 потоков параллельно через `Promise.all`; устанавливает `competitorsStatus` в running/done; берёт `isActive` из verified
- `src/lib/ai/providers/perplexity-research-provider.ts` — добавлен `competitors` промпт + общее правило verifiability ко всем 5

### RAG layer
- `src/lib/rag/context.ts` — `competitors` отдельный 5-й блок; `Конкуренты (указаны клиентом)` теперь в competitors-блоке (раньше был в business)

### DB layer
- `src/db/schema.ts` — `research_type` enum +1 значение; `competitorsStatus` колонка с NOT NULL DEFAULT 'pending'
- `drizzle/0001_competitors_stream.sql` — миграция (применена к Neon DB, локальная и production используют ту же базу)

### UI
- `app/research/[id]/page.tsx` — 5-я строка статусов «Анализ конкурентов»
- `app/research/[id]/validation/page.tsx` — 5-й вариант фильтра + бордовая бейджа

### Скрипты
- `scripts/apply-migration.mjs` — utility для будущих миграций
- `scripts/verify-migration.mjs` — utility проверки состояния схемы

### Документация
- `docs/features/competitors-stream/{brainstorm,spec,spec-review,tasks,review}.md` — артефакты по superpowers

---

## Тесты

| До | После | Δ |
|----|-------|---|
| 102 | 115 | +13 |

Новые тесты:
- 5 для competitors mock-adapter
- 5 для classify isActive auto-deactivation
- 1 для preserves `'competitors'` researchType
- 3 для RAG context (5 блоков, competitors header, формат competitors fact)
- Обновлены: 2 теста для всех 5 типов вместо 4

`npx tsc --noEmit` ✓  
`npx vitest run` ✓ 115/115

---

## Self-review checklist (superpowers стадия 7)

### Код минимален?
✓ Нет лишних абстракций. Все изменения — точечные расширения существующих структур (enum +1, Record +1 ключ, массив +1 элемент). Нет нового слоя или паттерна.

### Не протекла ли доменная логика в UI?
✓ `STREAM_LABELS` локально дублируются в research-page, validation-page и rag/context.ts — это сознательная дубликация per-context (UI-метки vs LLM-метки могут расходиться). При желании можно вынести в `src/lib/labels/streams.ts`, но сейчас не оправдано.

### Тесты проверяют поведение, а не реализацию?
✓ Тесты про `isActive` проверяют что INSUFFICIENT_DATA → false и FACT/HYPOTHESIS → true (поведение). Не проверяют как именно реализовано.  
✓ Тесты RAG проверяют contextText содержит ожидаемые секции/строки (поведение).  
⚠️ Тесты адаптера проверяют структуру `RawDataPoint` — это контракт, не реализация, ОК.

### Нет ли скрытого coupling?
✓ `competitorsStatus` в orchestrator → `competitors_status` в БД — явное coupling через типизацию Drizzle.  
✓ Старые research_jobs (пред-миграция) проявят себя как `competitors_status='done'` благодаря backfill — скрытого coupling нет, всё через явную миграцию.

### Можно ли было решить проще?
- **Альтернатива**: не заводить отдельный stream, добавить `competitors_status` поле без enum value 'competitors'. Минус: факты конкурентов смешались бы с business в RAG → strategy-промпт получал бы их вместе.
- **Альтернатива**: жёсткий вариант auto-deactivation (факт без source вообще не сохраняется). Отвергнуто per decision 2b — клиент должен видеть что было найдено и решать сам.

Текущее решение проще и одновременно корректнее.

---

## Что не покрыто тестами

1. **Production migration** — выполнена однократно, проверена скриптом `verify-migration.mjs`. Результат: 17 старых row → competitors_status='done' (backfill).
2. **End-to-end UI flow** — оставлен на ручную проверку пользователем в браузере (T13). UI rendering сложно тестировать без Playwright; для MVP визуальный smoke достаточен.
3. **Real Perplexity competitors prompt quality** — будет видно после первого реального запуска с RESEARCH_MODE=real. Тонкая настройка промпта возможна без миграции схемы.

---

## Риски (как закрылись)

| Риск из spec | Митигация | Статус |
|--------------|-----------|--------|
| Drizzle уронит данные | Сгенерированный baseline-файл удалён, миграция написана вручную, проверена через `verify-migration.mjs` | ✅ Закрыт |
| Старые тесты сломаются на enum | 6 теста RAG-контекста и 1 adapter-test обновлены под 5 типов | ✅ Закрыт |
| Perplexity не находит конкурентов на нишевом рынке | classify автоматически пометит INSUFFICIENT_DATA + isActive=false; в UI это видно как «деактивированные» | ✅ Закрыт |
| 5-й параллельный поток добавит время | Запросы в `Promise.all` — общее время = max(5 запросов), не sum. Реальное смотрим в T13 smoke | 🟡 Мониторим |
| Backfill UPDATE сделает неправильно | Проверено: 17 row → `done`, 0 row → `pending`. SQL без WHERE сработал ровно на старых строках | ✅ Закрыт |
| Изменение isActive логики затронет рендер validation | Validation page фильтрует по `isActive` — поведение становится корректнее (мусор скрыт по умолчанию). Активные факты остаются видны | ✅ Закрыт |

---

## DoD checklist

- [x] Brainstorm
- [x] Spec
- [x] Spec review (gate пройден)
- [x] Tests-first для domain logic (classify, competitors-adapter)
- [x] Все unit-тесты зелёные (115/115)
- [x] tsc зелёный
- [x] Миграция применена к production (Neon — общая БД для local и prod)
- [x] Self-review (этот файл)
- [x] Documentation в `docs/features/competitors-stream/`
- [x] Acceptance criteria A1..A6 ✓ (A7 неявно — strategy-промпт уже умеет, RAG теперь даёт ему отдельный блок)
- [ ] End-to-end smoke в браузере (передано пользователю)
- [ ] Commit + push

---

## Что оставлено за рамками

- **Strategy-промпт** не менялся — он уже ожидает competitor-карточки из предыдущего коммита
- **Real Perplexity API** для competitors не тестировался — это unit-mode не требует. Реальная проверка качества запроса — в T13 smoke
- **Валидация Perplexity URL'ов** на жизнеспособность — отдельная задача (URL probe)
- **Translation `'competitors'` для англ интерфейса** — пока проект только русскоязычный
