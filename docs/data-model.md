# Модель данных — ai-strategist MVP

> Реализована в `src/db/schema.ts`. Версия: T-001/T-002 (2026-04-27).

## Таблицы

### users

Placeholder для будущей авторизации. В single-user MVP не используется активно.

```sql
users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  name       text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
)
```

---

### companies

Центральная сущность — компания, поданная на анализ. Соответствует intake.

```sql
companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id),
  name        text NOT NULL,
  industry    text NOT NULL,
  description text,
  website     text,
  channels    text[],            -- каналы присутствия (ВКонтакте, Telegram и др.)
  goals       text,
  region      text DEFAULT 'RU' NOT NULL,
  status      text DEFAULT 'active' NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
)
INDEX: companies_user_id_idx ON (user_id)
```

---

### intake_submissions

Сырые данные intake — сохраняет оригинальный ввод клиента для аудита и replay.

```sql
intake_submissions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               uuid REFERENCES companies(id) NOT NULL,
  input_payload            jsonb NOT NULL,
  fallback_questions_needed boolean DEFAULT false NOT NULL,
  created_at               timestamptz DEFAULT now() NOT NULL
)
INDEX: intake_company_id_idx ON (company_id)
```

---

### research_jobs

Задание на автоматическое исследование. Создаётся сразу после intake. Отслеживает статус всех 4 потоков.

```sql
research_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid REFERENCES companies(id) NOT NULL,
  status           research_status DEFAULT 'pending' NOT NULL,
  business_status  research_status DEFAULT 'pending',
  market_status    research_status DEFAULT 'pending',
  audience_status  research_status DEFAULT 'pending',
  channels_status  research_status DEFAULT 'pending',
  error_message    text,
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz DEFAULT now() NOT NULL
)
INDEX: research_jobs_company_id_idx ON (company_id)

ENUM research_status: 'pending' | 'running' | 'done' | 'error'
```

---

### sources

Источники данных с reliability score (RS 1–5).

```sql
sources (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid REFERENCES companies(id) NOT NULL,
  source_type       source_type NOT NULL,
  source_name       text NOT NULL,
  source_url        text,
  source_region     source_region DEFAULT 'RU' NOT NULL,
  source_date       timestamptz,
  reliability_score integer NOT NULL,         -- RS 1–5
  is_active         boolean DEFAULT true NOT NULL,
  metadata          jsonb,
  created_at        timestamptz DEFAULT now() NOT NULL
)
INDEX: sources_company_id_idx ON (company_id)

ENUM source_type:   'registry' | 'official_site' | 'social' | 'ad' | 'aggregator'
ENUM source_region: 'RU' | 'GLOBAL'
```

---

### facts

Верифицированные утверждения. Покрывают все 4 потока исследования через `research_type`.

```sql
facts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid REFERENCES companies(id) NOT NULL,
  source_id        uuid REFERENCES sources(id),
  research_job_id  uuid REFERENCES research_jobs(id),
  content          text NOT NULL,
  fact_type        fact_type NOT NULL,
  confidence       confidence_level NOT NULL,
  reliability_score integer NOT NULL,
  research_type    research_type NOT NULL,
  is_active        boolean DEFAULT true NOT NULL,  -- клиент может деактивировать
  language         text DEFAULT 'ru' NOT NULL,
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL
)
INDEX: facts_company_id_idx ON (company_id)
INDEX: facts_research_type_idx ON (research_type)
INDEX: facts_company_research_type_idx ON (company_id, research_type)

ENUM fact_type:        'FACT' | 'HYPOTHESIS' | 'INSUFFICIENT_DATA'
ENUM confidence_level: 'HIGH' | 'MEDIUM' | 'LOW'
ENUM research_type:    'business' | 'market' | 'audience' | 'channels'
```

**research_type — 4 потока:**
- `business` — факты о компании: продукты, позиционирование, конкуренты, вакансии
- `market` — факты о рынке/нише: объём, тренды, динамика
- `audience` — факты о целевой аудитории: сегменты, потребности, поведение, боли
- `channels` — факты о каналах: присутствие, активность, охват

---

### strategy_artifacts

Выходы генерации стратегии (AI output). Хранит результаты по типу.

```sql
strategy_artifacts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid REFERENCES companies(id) NOT NULL,
  research_job_id  uuid REFERENCES research_jobs(id),
  artifact_type    text NOT NULL,    -- 'business' | 'market' | 'audience' | 'channels' | 'strategy'
  title            text NOT NULL,
  content          text NOT NULL,
  version          integer DEFAULT 1 NOT NULL,
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL
)
INDEX: strategy_artifacts_company_id_idx ON (company_id)
```

---

### report_artifacts

Клиентский отчёт. **MVP-формат рабочий и временный** — финальный формат уточняется в F-010/T-010.

```sql
report_artifacts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid REFERENCES companies(id) NOT NULL,
  research_job_id  uuid REFERENCES research_jobs(id),
  status           artifact_status DEFAULT 'pending' NOT NULL,
  content_json     jsonb,      -- структурированный отчёт (схема уточняется в F-010)
  content_markdown text,       -- полный текст отчёта
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL
)
INDEX: report_artifacts_company_id_idx ON (company_id)

ENUM artifact_status: 'pending' | 'generating' | 'done' | 'error'
```

---

### embeddings

Векторные представления фактов для RAG pipeline.

```sql
embeddings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id) NOT NULL,
  fact_id         uuid REFERENCES facts(id),
  source_id       uuid REFERENCES sources(id),
  content_chunk   text NOT NULL,
  -- embedding vector(1536) — добавляется в T-007 после CREATE EXTENSION vector
  embedding_model text,
  created_at      timestamptz DEFAULT now() NOT NULL
)
INDEX: embeddings_company_id_idx ON (company_id)
```

**pgvector setup (T-007):**
1. `CREATE EXTENSION IF NOT EXISTS vector;`
2. Добавить колонку: `ALTER TABLE embeddings ADD COLUMN embedding vector(1536);`
3. Добавить HNSW-индекс: `CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops);`

---

## Связи

```
users
  └── companies (1:N)
        ├── intake_submissions (1:N)
        ├── research_jobs (1:N)
        │     ├── facts (1:N)
        │     │     └── embeddings (1:N)
        │     ├── strategy_artifacts (1:N)
        │     └── report_artifacts (1:N)
        ├── sources (1:N)
        │     └── facts (1:N via source_id)
        └── embeddings (1:N)
```

## Safe MVP Assumptions

- `companies.region` всегда 'RU' в MVP
- `users` — placeholder, авторизация добавляется после MVP
- Размерность embeddings (1536) = OpenAI text-embedding-3-small; уточняется при выборе провайдера
- `report_artifacts.content_json` — без жёсткой схемы, формат фиксируется в F-010/T-010
- В MVP research_jobs создаётся по одному на company_id
- pgvector vector-колонка добавляется в T-007 (требует отдельного шага с расширением)
