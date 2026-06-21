# Админ-панель — backlog и план

> **Живой документ.** Любые новые фичи, идеи и доработки админки добавляются сюда.
> Структура: 3 этапа (Сейчас / Базовая / Расширенная) + Backlog open + История.
> Claude периодически напоминает что сделано/не сделано (правило закреплено в memory).

---

## Принципы процесса

1. **Пользователь сказал — Claude записал.** Любая идея сначала уходит в «Backlog open» внизу, потом Claude по запросу или при следующем большом сеансе расставляет по этапам.
2. **Не строить раньше, чем спросил.** Документ — это план, реализация только после явного «начинай Этап X».
3. **Периодическое напоминание.** В начале новой большой сессии или после длинного перерыва Claude сам показывает: «Сделано / Осталось / Что полезно сейчас».
4. **История фиксируется.** Каждый закрытый пункт переезжает в «История» с commit-hash и датой.

---

## Этап 1 — Сейчас (приоритет пользователя)

### 1.1 — Dashboard стоимости этапов (Cost Dashboard) ✅ DONE

Реализовано в commit `76f8ced` (2026-06-19). Доступно: `/admin/costs` (логин через ADMIN_ARCHIVE_PASSWORD).

Что работает:

- Таблица `llm_calls` + хелпер `recordLlmCall()` fire-and-forget
- Инструментация: full-v2 (8 частей) + brief-v2 + research (5 streams + site_marketing + competitor_single) + intake_parse
- 4 KPI: сегодня / 7д / 30д / всё время в ₽ + USD + токены + вызовы
- Разбивка по этапам и по job'ам с переходом на отчёт
- Баланс OpenRouter с цветом (🟢🟡🔴) и кнопкой пополнения
- Курс ЦБ с кешем 6ч

Что НЕ реализовано (можно добавить позже):

- Точность OpenAI direct (cost считается по pricing.ts — не идеально, но в пределах ±10%)
- Алерты по TG/email при остатке < $5 (сейчас только баннер в UI)
- Сравнение средней стоимости full v2 на компанию (можно добавить вычисление)
- Экспорт CSV всех llm_calls для глубокого анализа

---

### 1.1 (legacy spec — оставлен для истории)

**Зачем:** видеть, во сколько обходится каждый этап pipeline в рублях/токенах, и в разрезе провайдеров.

**Что показывать в UI:**

Таблица по каждой `research_job` (свежие наверху):

| Этап | Провайдер | Модель | Tokens (prompt/completion) | Стоимость $ | Стоимость ₽ |
|---|---|---|---|---|---|
| Парсинг intake | OpenRouter | DeepSeek V4 Pro | 1.2K / 0.4K | $0.0012 | 0,12 ₽ |
| Парсинг intake (сканер OCR) | OpenAI | gpt-4o-mini | 5K / 1K | $0.0009 | 0,09 ₽ |
| Research (4 потока) | OpenAI | gpt-4o-mini + web_search | 20K / 8K | $0.05 | 5,00 ₽ |
| Краткий отчёт v2 | OpenRouter (Anthropic) | claude-sonnet-4.6 | 8K / 2K | $0.054 | 5,40 ₽ |
| Полный отчёт v2 (8 параллельных) | OpenRouter (Anthropic) | claude-sonnet-4.6 | 60K / 30K | $0.63 | 63,00 ₽ |
| **Итого по job** | | | **94.2K / 41.4K** | **$0.736** | **73,61 ₽** |

Плюс:
- Агрегаты сверху: «Всего за сегодня / за неделю / за месяц»
- Топ-5 самых дорогих job'ов
- Сравнение: средняя стоимость full v2 на одну компанию
- Бюджет-алерт: остаток на OpenRouter (через `/api/v1/credits`) и на OpenAI (через тест-запрос). При остатке < $10 — баннер сверху

**Что нужно сделать (тех. план):**

1. **Schema:** добавить таблицу `llm_calls`:
   ```sql
   id uuid PK
   research_job_id uuid FK
   stage text  -- 'intake_parse' | 'intake_scanner' | 'research_business' | ...
                -- | 'brief_v1' | 'brief_v2' | 'full_v1' | 'full_v2_part_N'
   provider text  -- 'openrouter' | 'openai' | 'deepseek'
   model text     -- 'anthropic/claude-sonnet-4.6' | 'gpt-4o-mini' | ...
   prompt_tokens int
   completion_tokens int
   cost_usd decimal(10,6)
   cost_rub decimal(10,2)   -- курс на момент записи
   created_at timestamp
   metadata jsonb           -- attempt, finish_reason, error если есть
   ```

2. **Инструментация callOpenRouterForJSON и openai-провайдеров:**
   - В [src/lib/strategy/full-v2.ts](src/lib/strategy/full-v2.ts) — после каждого OpenRouter ответа писать в `llm_calls`
   - В [src/lib/strategy/brief-v2.ts](src/lib/strategy/brief-v2.ts) — то же
   - В [src/lib/research/](src/lib/research/) (web_search provider) — то же
   - В [app/intake/actions.ts](app/intake/actions.ts) → парсер intake — то же
   - Курс USD→RUB: брать ежедневно с ЦБ РФ (https://www.cbr-xml-daily.ru/daily_json.js) и кешировать в env-переменную / редис / `app_config` таблицу

3. **UI:** `app/admin/costs/page.tsx` — server component, агрегация через SQL.

4. **Балансы провайдеров:**
   - OpenRouter: `GET /api/v1/credits` (уже знаем как)
   - OpenAI: нет публичного credits API — оставить как «карточка с ссылкой на https://platform.openai.com/usage»

**Готовность:**
- [ ] Schema + migration
- [ ] Курс ЦБ → кеш
- [ ] Инструментация всех LLM-вызовов
- [ ] UI `/admin/costs`
- [ ] Алерт по остатку

---

### 1.2 — Dashboard использования приложения (Usage Dashboard) ✅ DONE

Реализовано в коммите этой сессии (см. git log). Доступно: `/admin/usage`.

Что работает:

- Таблица `usage_events(research_job_id, artifact_id, event_type, metadata, created_at)`, индексы созданы
- API endpoint `POST /api/usage-event` с дедупликацией artifact→job
- Хелпер `trackUsage()` для фронта (fire-and-forget, keepalive)
- Инструментация:
  * `BriefV2View` mount → `brief_viewed`
  * `FullV2View` mount → `full_viewed`
  * Обе кнопки «Скачать PDF» → `pdf_downloaded`
- Воронка intake → бриф → полный → PDF с конверсиями
- Гистограмма «время возврата за полным» (7 корзин: 0-5мин / 5-30мин / 30мин-6ч / 6-24ч / 1-7дн / >7дн / не вернулись)
- Топ ниш по числу intake с долей %
- Таблица последних 50 компаний с временами всех 4 событий и Δ (бриф→полный) с цветовой подсветкой

Что НЕ реализовано (можно добавить позже):

- UTM-разбивка событий (UTM уже собирается в SessionStorage, но не пишется в usage_events)
- Фильтры по периоду (сейчас всё время)
- Click-through на ячейку Δ → раскрыть таблицу всех событий компании
- Сравнение когорт (по неделям/месяцам)

---

### 1.2 (legacy spec — оставлен для истории)

**Зачем:** видеть, кто и как использует приложение — какие компании, какие отчёты сформировали, был ли возврат за полным после краткого.

**Что показывать в UI:**

Таблица по компаниям (свежие наверху):

| Дата intake | Время | Компания | Industry | Tier | Краткий | Полный | Δ между ними | Сохранили |
|---|---|---|---|---|---|---|---|---|
| 19.06.2026 | 01:25 | ГПК «Репутация» | Юр.услуги | free | ✅ 01:27 | ✅ 01:30 | 3 мин | PDF ✅ |
| 19.06.2026 | 14:10 | Завод X | Industrial | paid | ✅ 14:12 | ❌ — | — | — |
| 18.06.2026 | 22:05 | Кафе Y | F&B | free | ✅ 22:07 | ✅ 11:30 (19.06) | **13 ч 23 мин** | — |

Плюс:
- Конверсия `intake → brief`: % компаний, дошедших до брифа
- Конверсия `brief → full`: % компаний, открывших полный после брифа
- **Распределение «время возврата за полным»** (гистограмма):
  - 0-5 мин: N компаний
  - 5-30 мин: M
  - 30 мин - 6 ч: K
  - 6-24 ч: …
  - 1-7 дней: …
  - > 7 дней / не вернулись: …
- Топ ниш по числу intake
- UTM-разбивка (по уже захваченным utm_source/medium/campaign)

**Что нужно сделать (тех. план):**

1. **События для трекинга** (уже частично в БД):
   - `intake_submitted` → есть (`intake_submissions.createdAt`)
   - `research_done` → есть (`research_jobs.status='done'` + updated_at)
   - `brief_viewed` → НУЖНО логировать (когда пользователь открыл `/free-report/[id]`)
   - `full_generated` → есть (`reportArtifacts.fullJson IS NOT NULL`, нужен timestamp)
   - `pdf_downloaded` → НУЖНО логировать (по клику «Скачать PDF» в FullV2View, BriefV2View)
   - `archive_saved` → есть (`reportArtifacts.archivedAt`)

2. **Schema:** добавить таблицу `usage_events`:
   ```sql
   id uuid PK
   research_job_id uuid FK
   event_type text  -- 'brief_viewed' | 'full_viewed' | 'pdf_downloaded' | ...
   created_at timestamp
   metadata jsonb   -- utm_source, user_agent, ip_hash и т.п.
   ```
   ИЛИ просто добавить колонки в существующие таблицы (проще, но менее гибко).

3. **Инструментация фронта:**
   - В `BriefV2View.tsx` и `FullV2View.tsx` — useEffect при mount → fetch `/api/usage-event { type: 'brief_viewed' }`
   - В PrintButton (PDF) — fetch перед `window.print()`

4. **SQL-агрегаты для UI:**
   - JOIN companies + research_jobs + report_artifacts + usage_events
   - Группировка по `research_job_id`, выбор `MIN(intake)`, `MIN(brief_viewed)`, `MIN(full_viewed)`, `MIN(pdf_downloaded)`
   - Расчёт `full_viewed - brief_viewed` → диапазон в гистограмму

5. **UI:** `app/admin/usage/page.tsx` — таблица + гистограмма (Chart.js уже подключён в проекте для brief v1)

**Готовность:**
- [ ] Schema migration `usage_events`
- [ ] API `/api/usage-event` POST endpoint
- [ ] Фронт-инструментация BriefV2View, FullV2View, PrintButton
- [ ] UI `/admin/usage` с таблицей и гистограммой возврата

---

### 1.3 — Backlog tracking (процесс — НЕ код)

**Зачем:** не терять идеи, периодически возвращаться к недосделанному.

**Что сделать:**
- ✅ Этот файл (`docs/admin-panel.md`) — готов
- ✅ Memory entry о rolling backlog — сохранена (см. `project_admin_panel_backlog`)
- ✅ Правило: каждая новая идея от пользователя → Claude добавляет в «Backlog open» внизу
- ✅ Правило: при следующем большом сеансе Claude напоминает: «Сделано / Осталось / Что полезно сейчас»

---

### 1.4 — Расширяемость провайдеров оплаты ✅ DONE

Реализовано в этой же сессии. Любой новый провайдер автоматически появляется в `/admin/costs`.

Как добавить новый провайдер:

1. Передавай его имя в `recordLlmCall({ provider: '<имя>' })` при инструментации (например, `'anthropic'` для прямого Anthropic API)
2. Добавь запись в `PROVIDER_CONFIG` в [app/admin/costs/page.tsx](app/admin/costs/page.tsx) — label, dashboardUrl, emoji
3. (опционально) если у провайдера есть публичный API баланса — реализуй `getXxxBalance()` в [src/lib/cost/queries.ts](src/lib/cost/queries.ts) и подключи как у OpenRouter

Что произойдёт автоматически без шагов 1-3:
- Виджет с дефолтным названием (= provider key) и баннером «провайдер не зарегистрирован в PROVIDER_CONFIG»
- Расходы и разбивка по периодам считаются в обычном порядке
- Попадает в таблицы «Разбивка по этапам» и «Последние jobs»

Предзагруженные конфиги (виджеты появятся при первом вызове):

- `openrouter` 🟦 — с API баланса
- `openai` 🟢 — без API баланса
- `anthropic` 🟧 — без API баланса
- `deepseek` 🐋 — без API баланса
- `yookassa` 💳 — для будущих платежей по приёму денег от клиентов

---

## Этап 2 — Базовая админка (после Этапа 1)

### 2.1 — Аутентификация админа
- NextAuth с одним email-владельцем
- middleware на `/admin/*` (включая `/archive`, `/admin/costs`, `/admin/usage`)
- Заменить `ADMIN_ARCHIVE_PASSWORD` на полноценный логин

### 2.2 — Лиды (CRM-lite)
- Таблица `/admin/leads` со списком из `lead_submissions` (форма уже есть в `/lead/retainer`)
- Поля: дата, UTM-метка, контакт, статус (новый / в работе / закрыт)
- Inline-редактирование статуса
- Поиск, фильтр по статусу

### 2.3 — Управление отчётами
- Расширить `/archive`: фильтр по дате/нише/статусу, кнопка «Пересгенерировать full v2», кнопка «Удалить»
- Просмотр raw briefJson и fullJson (для отладки)

### 2.4 — Замена TG-approve flow
- Сейчас: бот шлёт ссылку с `?secret=...` → админ кликает в браузере
- Стало: кнопка «Подтвердить оплату» в `/admin/payments` (требует логин)
- TG-уведомление с deep-link на эту страницу

---

## Этап 3 — Расширенная (когда появятся деньги клиентов)

### 3.1 — Cost alerts
- Cron-job: каждый час проверяет баланс OpenRouter
- Алерт в TG если < $5

### 3.2 — Sentry интеграция
- Backend + frontend errors
- Source-map upload через Vercel build

### 3.3 — Multi-niche editor
- CRUD для `knowledge/report-requirements/*.md` через UI
- Подсказка LLM при создании новой ниши

### 3.4 — A/B-инфраструктура
- Feature flags (GrowthBook self-hosted или Vercel Edge Config)
- Split-traffic между v1/v2 версиями отчётов
- Аналитика конверсии по варианту

### 3.5 — Anti-vibe-citing Level 2-3 (из CLAUDE.md)
- Реальный fetch ссылок в g1_sources (статус 200 OK, резолв редиректов)
- LLM citation matching (отдельный вызов: «source description vs page title — match?»)
- Audit-log в Postgres
- Триггер: первый платный клиент / инцидент

### 3.6 — Платежи: автоматизация
- Интеграция с **ЮKassa** (приоритет) или СберID / Робокасса
- Webhooks на подтверждение
- Замена TG-approve flow целиком

---

## Backlog open (не отсортировано)

> Сюда Claude добавляет новые идеи от пользователя в порядке поступления.
> Периодически перемещается в соответствующий этап.

_(пусто — первые идеи попадут сюда после новых запросов пользователя)_

---

## История (закрытые пункты)

> Заполняется по мере выполнения. Формат: `commit-hash · дата · что сделано`.

_(пусто)_
