# Spec: Two-stage strategy generation

Дата: 2026-05-01
Брейнсторм: [brainstorm.md](brainstorm.md)

## Acceptance criteria

- **A1.** Env флаг `STRATEGY_TWO_STAGE_REVIEW=true` включает двухстадийный режим. Без флага (или `=false`) — fallback на текущий one-shot вызов.
- **A2.** Stage 1: server action запускает 5 параллельных LLM-запросов (`Promise.all`) — по одному на секцию: business, market, audience, channels, competitors. Каждый получает только свой RAG-блок.
- **A3.** Промежуточный артефакт сохраняется со `status='partial'` и `contentJson={ sections: [{id, title, content, generatedAt}], stage: 1 }`.
- **A4.** UI на `/research/[id]/report?artifactId=X` при `status='partial'`: рендерит 5 секций + информационный баннер «Раздел "Стратегия и рекомендации" будет сгенерирован отдельно» + кнопку «Запустить синтез общей стратегии».
- **A5.** Кнопка синтеза → Stage 2: server action делает 6-й LLM-вызов, передавая в промпт 5 готовых секций как контекст. Пишет в `contentMarkdown` финальный отчёт (5 секций + раздел синтеза), `status='done'`, обнуляет `contentJson` (или сохраняет для дебаг — TBD).
- **A6.** Если хотя бы одна из 5 секций в Stage 1 упала: artifact в `status='partial'` с `contentJson.sections[i].error='...'`. UI рендерит готовые секции + плейсхолдер «Не удалось сгенерировать. [Перегенерировать]» для упавших. Кнопка «Запустить синтез» заблокирована до тех пор, пока все 5 не зелёные.
- **A7.** Retry упавшей секции — отдельный server action `regenerateSectionAction(artifactId, sectionId)`, обновляет одну секцию в `contentJson.sections`.
- **A8.** Mock-режим (нет `OPENROUTER_API_KEY`): единый старый `getMockDraft()` без двух стадий, status сразу `done`.

## Affected files

### Domain
- `src/lib/types.ts` — добавить `StrategySection` и `PartialStrategyContent` типы
- `src/lib/strategy/generator.ts` — major refactor:
  - `generateSectionDraft(jobId, sectionType)` — для Stage 1, единичный вызов
  - `generateAllSectionsParallel(jobId)` — Promise.all по 5 секциям
  - `synthesizeStrategy(artifactId)` — Stage 2
  - `generateStrategyDraft(jobId)` — оркестратор, читает env флаг
- `src/lib/strategy/prompts.ts` — разделить:
  - `STRATEGY_SECTION_PROMPTS: Record<SectionType, string>` — промпт на каждую секцию
  - `buildSectionUserPrompt(sectionType, ragBlock)` — короткий ввод
  - `buildSynthesisUserPrompt(sections, ragSummary)` — для Stage 2

### DB
- `src/db/schema.ts` — добавить `'partial'` в `artifactStatusEnum`
- `drizzle/0002_strategy_partial_status.sql` — миграция

### Server actions
- `app/research/[id]/generate/actions.ts` — `generateStrategyAction` маршрутизирует по статусу: pending→Stage 1, partial→error если все секции готовы (можно вручную вызвать синтез отдельной кнопкой)
- `app/research/[id]/generate/synthesize-actions.ts` — новый файл с `synthesizeStrategyAction(formData)` и `regenerateSectionAction(formData)`

### UI
- `app/research/[id]/ResearchActions.tsx` — без изменений (кнопка «Сгенерировать стратегию» те же)
- `app/research/[id]/report/page.tsx` — обработка `status='partial'`:
  - Рендер `contentJson.sections` через тот же section-renderer
  - Баннер про незавершённый синтез
  - Импорт новых клиент-компонентов кнопок
- `app/research/[id]/report/SynthesizeButton.tsx` — новый client component (кнопка «Запустить синтез» + spinner)
- `app/research/[id]/report/RegenerateSectionButton.tsx` — новый client component (кнопка ретрая секции)

### Config
- `.env.local.example` (если есть) — добавить `STRATEGY_TWO_STAGE_REVIEW=true`
- `src/lib/ai/config.ts` — экспортировать флаг через `AI_CONFIG.strategy.twoStageReview`

## Data model changes

```sql
-- 0002_strategy_partial_status.sql
DO $$ BEGIN
  ALTER TYPE "public"."artifact_status" ADD VALUE 'partial';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
```

`reportArtifacts.contentJson` (уже jsonb) на стадии `partial`:
```typescript
{
  stage: 1,
  sections: [
    { id: 'business',    title: 'Анализ бизнеса',       content: '...', generatedAt: ISO, modelId: '...', error: null },
    { id: 'market',      title: 'Анализ рынка',         content: '...', generatedAt: ISO, modelId: '...', error: null },
    { id: 'audience',    title: 'Анализ целевой аудитории', content: '...', generatedAt: ISO, modelId: '...', error: null },
    { id: 'channels',    title: 'Анализ каналов',       content: '...', generatedAt: ISO, modelId: '...', error: null },
    { id: 'competitors', title: 'Анализ конкурентов',   content: '...', generatedAt: ISO, modelId: '...', error: 'OpenRouter timeout' }, // optional
  ]
}
```

После Stage 2: `contentMarkdown` = полный отчёт (все 5 секций + новый раздел «Стратегия и рекомендации»). `contentJson` оставляем как audit log.

## Test plan

### Unit
- `parseSections(markdown)` — без изменений, тесты остаются зелёными
- `generateSectionDraft` — мокаем callStrategyLLM, проверяем что промпт содержит правильный RAG-блок
- `generateAllSectionsParallel` — мокаем 5 LLM-вызовов, проверяем Promise.all, partial при ошибке одного
- `synthesizeStrategy` — мокаем LLM, проверяем что в промпт переданы все 5 секций

### Integration
- `generateStrategyAction` с `STRATEGY_TWO_STAGE_REVIEW=true` → создаёт artifact `partial`
- `synthesizeStrategyAction` → переводит artifact из `partial` в `done`, contentMarkdown заполнен
- `regenerateSectionAction` → обновляет одну секцию в contentJson

### Manual smoke
- Real Perplexity research → Stage 1 → видны 5 секций → нажать «Запустить синтез» → видна полная стратегия
- Имитировать ошибку секции (например через max_tokens=1) → видна кнопка ретрая

## Rollback

Откат через env: `STRATEGY_TWO_STAGE_REVIEW=false` (или удалить переменную) → код возвращается к одиночному вызову.

Откат миграции БД не нужен: значение `partial` в enum безвредно, существующие artifact'ы не используют его.

## Out of scope

- Streaming response (нужен ReadableStream через server action — не поддерживается на Hobby)
- Полный async-job runner (Inngest/Trigger.dev) — отложено до Pro плана
- Realtime прогресс по 5 секциям (нужен WebSocket или Server-Sent Events) — пользователь подтвердил что один спиннер на Stage 1 ОК
- Удаление флага `STRATEGY_TWO_STAGE_REVIEW` после стабилизации — отдельная задача после получения первых клиентских отчётов
