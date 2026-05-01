# Spec: Competitors research stream + verifiability filter

## Problem statement

Стратегический отчёт за 10 000 ₽ должен содержать конкретный анализ конкурентов и опираться только на верифицированные факты. Сейчас конкуренты не имеют статуса первоклассного потока (вшиты в business), а факты без источника попадают в стратегию через `factType=HYPOTHESIS, isActive=true`.

## User stories

1. **Как клиент**, я хочу видеть в research-page отдельный индикатор «Анализ конкурентов», чтобы понимать что эта работа сделана.
2. **Как клиент**, я хочу, чтобы в стратегию попадали только факты с источниками, иначе платить 10 000 ₽ за догадки нет смысла.
3. **Как клиент**, я хочу видеть в validation-workspace, какие факты были автоматически деактивированы из-за отсутствия источника, чтобы при необходимости вручную их включить.
4. **Как разработчик**, я хочу, чтобы старые research_jobs не пытались перезапустить research конкурентов — они должны выглядеть «завершёнными».

## Acceptance criteria

### A1. DB schema
- [ ] `research_type` enum содержит значение `'competitors'`
- [ ] `research_jobs.competitors_status` (text, NOT NULL, default `'pending'`) существует
- [ ] Все строки в `research_jobs`, существующие на момент применения миграции, получают `competitors_status='done'`

### A2. Reliability classify
- [ ] При `source==null && rs<=2` → `factType=INSUFFICIENT_DATA, isActive=false`
- [ ] При `source!=null` или `rs>=3` → текущее поведение сохраняется (isActive=true)

### A3. Research adapter & prompts
- [ ] `competitors-adapter.mock.ts` существует, реализует `ResearchAdapter`, возвращает 3 mock-факта о конкурентах
- [ ] Perplexity-промпт для `competitors` ищет: список конкурентов (если client не указал — найти 3–5 в нише), для каждого — что предлагают, цены если публичны, сильные/слабые стороны
- [ ] Все 5 Perplexity-промптов содержат явное правило: «утверждай только то, что подтверждается публичным URL — иначе пропусти»

### A4. Orchestrator
- [ ] `startResearchJob` запускает 5 потоков параллельно через `Promise.all`
- [ ] При завершении устанавливает `competitors_status='done'` или `'error'`

### A5. RAG context
- [ ] `buildResearchContext` возвращает блок `competitors` как отдельный 5-й блок
- [ ] `serializeContext` форматирует его с заголовком `=== Анализ конкурентов ===`
- [ ] `getBlockByType(ctx, 'competitors')` возвращает корректный блок

### A6. UI updates
- [ ] `/research/[id]/page.tsx` отображает 5-ю строку «Анализ конкурентов» с цветом и статусом
- [ ] `/research/[id]/validation/page.tsx` имеет 5-й вариант в фильтре streams + label «Конкуренты»

### A7. Strategy
- [ ] Strategy-генератор уже ожидает competitors-карточки (из предыдущего коммита) — после изменения RAG они приходят из выделенного блока

## Affected files / modules

```
src/db/schema.ts                                 — enum + новая колонка
src/lib/types.ts                                 — ResearchType union
src/lib/reliability/classify.ts                  — новая логика isActive
src/lib/reliability/__tests__/classify.test.ts   — новые тесты
src/lib/research/competitors-adapter.mock.ts     — новый файл
src/lib/research/__tests__/competitors-adapter.test.ts  — новый файл
src/lib/research/orchestrator.ts                 — 5 потоков вместо 4
src/lib/ai/providers/perplexity-research-provider.ts  — новый промпт + verifiability rule
src/lib/rag/context.ts                           — competitors block
src/lib/rag/__tests__/context.test.ts            — новые тесты
app/research/[id]/page.tsx                       — 5-я строка
app/research/[id]/validation/page.tsx            — 5-й фильтр
drizzle/0001_xxx.sql                             — миграция (генерируется)
docs/features/competitors-stream/                — артефакты этой задачи
```

## Data model changes

### Schema diff

```ts
// src/db/schema.ts (relevant parts)

export const researchType = pgEnum('research_type', [
  'business',
  'market',
  'audience',
  'channels',
  'competitors',  // ← добавляется
])

export const researchJobs = pgTable('research_jobs', {
  // ...existing
  businessStatus: text('business_status').notNull().default('pending'),
  marketStatus: text('market_status').notNull().default('pending'),
  audienceStatus: text('audience_status').notNull().default('pending'),
  channelsStatus: text('channels_status').notNull().default('pending'),
  competitorsStatus: text('competitors_status').notNull().default('pending'),  // ← добавляется
})
```

### SQL migration

```sql
-- Add new enum value
ALTER TYPE research_type ADD VALUE 'competitors';

-- Add new column
ALTER TABLE research_jobs 
  ADD COLUMN competitors_status text NOT NULL DEFAULT 'pending';

-- Backfill existing rows (per decision 1a)
UPDATE research_jobs SET competitors_status = 'done';
```

Note: `UPDATE` без `WHERE` намеренно — все существующие на момент миграции строки помечаются как done.

## API / state changes

- `getFactsForJob(jobId, filters)` существует; добавится stream `'competitors'` в допустимые значения
- `setFactActive(factId, active)` без изменений
- Server actions без изменений в сигнатурах

## Test plan

### Unit tests

| Test | Слой | Что проверяет |
|------|------|---------------|
| `classify` × 4 новых сценария | reliability | (1) source=null, rs=1 → INSUFFICIENT_DATA + isActive=false; (2) source=null, rs=2 → то же; (3) source=null, rs=3 → INSUFFICIENT_DATA + isActive=false (нет date validation); (4) source.url='', rs=2 → trigger; (5) source.url='valid', rs=2 → HYPOTHESIS + isActive=true |
| competitors-adapter × 5 | research | (1) collect возвращает 3 точки; (2) каждая research_type='competitors'; (3) source указан; (4) rs ≥ 3; (5) подстановка company.name |
| context-builder × 3 | RAG | (1) competitors block присутствует; (2) пустой если нет фактов; (3) serialized содержит «=== Анализ конкурентов ===» |
| orchestrator × 1 | research | dispatches 5 streams в `Promise.all` (mock test) |

### Integration / smoke

- Полный flow на dev: intake → research → validation → strategy
- Проверка: в research-page видно 5 потоков, в validation видно competitors-факты, в strategy видны competitor-карточки

### Что не покрываем тестами

- UI rendering — визуальный smoke вместо тестов
- Vercel migration apply — однократное действие, проверяется вручную

## Migration / rollback plan

### Migration apply

1. Локально: `npx drizzle-kit generate` → создаёт `drizzle/0001_xxx.sql`
2. Просмотр SQL вручную
3. Локально применить: `npx drizzle-kit migrate` → проверить state
4. Production: применить тот же SQL через `drizzle-kit migrate` в shell с production `DATABASE_URL`

### Rollback

Если миграция применилась некорректно:

```sql
-- Откатить колонку
ALTER TABLE research_jobs DROP COLUMN competitors_status;

-- Enum value НЕЛЬЗЯ удалить в Postgres (это design limitation).
-- Оставляем 'competitors' в enum даже при откате — он не будет использован.
```

В случае поломки данных — Neon делает auto-snapshot, можно восстановить за последние 7 дней.

## Out of scope

- 152-ФЗ compliance / переезд инфраструктуры в РФ
- Авторизация / paywall
- Async generation strategy (сейчас всё ещё sync)
- URL-validity checking для citation links
- Landing page / marketing
- Отдельная аналитика по «как часто факты деактивируются»

## Acceptance: Definition of Done

- [ ] Все unit-тесты зелёные (текущие + новые)
- [ ] `npx tsc --noEmit` зелёный
- [ ] Миграция применена локально и на production без потери данных
- [ ] End-to-end smoke на dev: intake → research → validation → strategy для тестового кейса (РУЗНАК)
- [ ] Старые отчёты в production показывают «Анализ конкурентов: Завершено»
- [ ] Новый отчёт показывает 5 потоков, конкуренты заполняются
- [ ] Brainstorm + spec + tasks файлы существуют в `docs/features/competitors-stream/`
- [ ] Self-review (`docs/features/competitors-stream/review.md`)
- [ ] Commit + push, deploy успешен
