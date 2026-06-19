import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  numeric,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const researchStatusEnum = pgEnum('research_status', [
  'pending',
  'running',
  'done',
  'error',
])

export const factTypeEnum = pgEnum('fact_type', [
  'FACT',
  'HYPOTHESIS',
  'INSUFFICIENT_DATA',
])

export const confidenceLevelEnum = pgEnum('confidence_level', [
  'HIGH',
  'MEDIUM',
  'LOW',
])

export const researchTypeEnum = pgEnum('research_type', [
  'business',
  'market',
  'audience',
  'channels',
  'competitors',
])

export const sourceTypeEnum = pgEnum('source_type', [
  'registry',
  'official_site',
  'social',
  'ad',
  'aggregator',
])

export const sourceRegionEnum = pgEnum('source_region', ['RU', 'GLOBAL'])

export const artifactStatusEnum = pgEnum('artifact_status', [
  'pending',
  'generating',
  'partial',
  'done',
  'error',
])

// Тарифная классификация артефакта: free (1-страничный пробник),
// paid (полный отчёт 9 999 ₽), retainer (часть пакета сопровождения 100k+/мес).
// Используется для маршрутизации UI (/free-report vs /report) и аналитики воронки.
export const reportTierEnum = pgEnum('report_tier', ['free', 'paid', 'retainer'])

// Тип лида с лендинга: paid (запрос счёта 9 999 ₽) / retainer (заявка на
// собеседование для сопровождения от 100 000 ₽/мес).
export const leadTypeEnum = pgEnum('lead_type', ['paid', 'retainer'])

// ─── Tables ──────────────────────────────────────────────────────────────────

// Placeholder for future auth — not used in single-user MVP
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Central entity — company submitted for analysis
export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    name: text('name').notNull(),
    industry: text('industry').notNull(),
    description: text('description'),
    website: text('website'),
    channels: text('channels').array(),
    // Направления деятельности из intake: { items: string[]; independent: boolean | null }.
    // independent=true → разные ниши (анализировать раздельно), false → одно связанное предложение.
    directions: jsonb('directions'),
    // Рекламные каналы, которые клиент УЖЕ использует (из чеклиста intake). Факт, не гипотеза.
    adChannels: text('ad_channels').array(),
    competitors: text('competitors'),
    goals: text('goals'),
    // Email клиента из intake-формы — для авто-отправки magic-link, когда
    // артефакт готов. Nullable: исторические компании без email.
    clientEmail: text('client_email'),
    region: text('region').default('RU').notNull(),
    status: text('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('companies_user_id_idx').on(table.userId)],
)

// Raw intake payload — preserves original client input for audit/replay
export const intakeSubmissions = pgTable(
  'intake_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    inputPayload: jsonb('input_payload').notNull(),
    fallbackQuestionsNeeded: boolean('fallback_questions_needed').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('intake_company_id_idx').on(table.companyId)],
)

// Auto-research pipeline job — tracks status of all 4 streams
export const researchJobs = pgTable(
  'research_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    status: researchStatusEnum('status').default('pending').notNull(),
    businessStatus: researchStatusEnum('business_status').default('pending'),
    marketStatus: researchStatusEnum('market_status').default('pending'),
    audienceStatus: researchStatusEnum('audience_status').default('pending'),
    channelsStatus: researchStatusEnum('channels_status').default('pending'),
    competitorsStatus: researchStatusEnum('competitors_status').default('pending').notNull(),
    // Тариф intake: free → research стартует сразу. paid → research ждёт оплаты (paid=true)
    // и ручного approve администратором через secret-ссылку.
    tier: reportTierEnum('tier').default('free').notNull(),
    // Подтверждена ли оплата администратором. Для free всегда true (оплата не требуется).
    paid: boolean('paid').default(true).notNull(),
    // Когда админ нажал Approve. NULL для free и для paid в ожидании.
    paidAt: timestamp('paid_at', { withTimezone: true }),
    // Структурные снимки Lighthouse сайта клиента (PageSpeed): { clientUrl, pagespeed: [...] }
    metricsJson: jsonb('metrics_json'),
    // Гейт «Подтверди и поправь»: подтверждённые клиентом 5 блоков (направления,
    // каналы клиента, клиенты/кейсы, отзывы, конкуренты). Перекрывают домыслы при генерации.
    confirmationsJson: jsonb('confirmations_json'),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('research_jobs_company_id_idx').on(table.companyId)],
)

// Data sources with reliability score (RS 1–5)
export const sources = pgTable(
  'sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    sourceType: sourceTypeEnum('source_type').notNull(),
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url'),
    sourceRegion: sourceRegionEnum('source_region').default('RU').notNull(),
    sourceDate: timestamp('source_date', { withTimezone: true }),
    reliabilityScore: integer('reliability_score').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('sources_company_id_idx').on(table.companyId)],
)

// Verified facts — covers all 4 research streams via research_type
export const facts = pgTable(
  'facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    sourceId: uuid('source_id').references(() => sources.id),
    researchJobId: uuid('research_job_id').references(() => researchJobs.id),
    content: text('content').notNull(),
    factType: factTypeEnum('fact_type').notNull(),
    confidence: confidenceLevelEnum('confidence').notNull(),
    reliabilityScore: integer('reliability_score').notNull(),
    researchType: researchTypeEnum('research_type').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    language: text('language').default('ru').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('facts_company_id_idx').on(table.companyId),
    index('facts_research_type_idx').on(table.researchType),
    index('facts_company_research_type_idx').on(table.companyId, table.researchType),
  ],
)

// Strategy generation artifacts (AI output per section or combined)
export const strategyArtifacts = pgTable(
  'strategy_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    researchJobId: uuid('research_job_id').references(() => researchJobs.id),
    artifactType: text('artifact_type').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('strategy_artifacts_company_id_idx').on(table.companyId)],
)

// Client report output — MVP format is working/temporary (F-010 refines after first real tests)
export const reportArtifacts = pgTable(
  'report_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    researchJobId: uuid('research_job_id').references(() => researchJobs.id),
    status: artifactStatusEnum('status').default('pending').notNull(),
    // Тариф: free → 1-страничный пробник (2 конкурента, 2 точки, тизер УТП);
    // paid → полный отчёт 9 999 ₽ (4–6 конкурентов, все точки, 3 УТП, план);
    // retainer → часть пакета сопровождения. По умолчанию 'paid' для исторических артефактов.
    tier: reportTierEnum('tier').default('paid').notNull(),
    contentJson: jsonb('content_json'),
    contentMarkdown: text('content_markdown'),
    // Кеш краткого отчёта (BRIEF_REPORT, 6 блоков) — генерируется по запросу,
    // чтобы не пересоздавать дорогостоящий brief при каждом просмотре.
    briefJson: jsonb('brief_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('report_artifacts_company_id_idx').on(table.companyId),
    index('report_artifacts_tier_idx').on(table.tier),
  ],
)

// Лиды с лендинга для платных тарифов (Сопровождение / 9 999 ₽). Free-тариф
// сразу идёт в /intake — таблица leads используется только для тарифов,
// требующих ручного контакта с оператором.
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadType: leadTypeEnum('lead_type').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    company: text('company'),
    message: text('message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('leads_lead_type_idx').on(table.leadType),
    index('leads_email_idx').on(table.email),
  ],
)

// Magic links — токены доступа к артефакту по email-ссылке без пароля.
// Auth-токен TTL 30 дней; артефакт по UUID-URL — бессрочно.
export const magicLinks = pgTable(
  'magic_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: text('token').notNull().unique(),
    email: text('email').notNull(),
    artifactId: uuid('artifact_id')
      .references(() => reportArtifacts.id, { onDelete: 'cascade' })
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('magic_links_token_idx').on(table.token),
    index('magic_links_email_idx').on(table.email),
    index('magic_links_artifact_id_idx').on(table.artifactId),
  ],
)

// Cost-tracking каждого LLM-вызова pipeline (для админ-дашборда /admin/costs).
// stage — этап ('intake_parse' | 'research_business' | 'brief_v2' |
//          'full_v2_part_1' | ...).
// provider — 'openrouter' | 'openai'.
// cost_usd — берётся из ответа OpenRouter usage.cost когда доступно,
//           иначе считается по модельной таблице цен.
// cost_rub — cost_usd × курс ЦБ на момент записи (исторически фиксированный).
export const llmCalls = pgTable(
  'llm_calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    researchJobId: uuid('research_job_id').references(() => researchJobs.id),
    stage: text('stage').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    costUsd: numeric('cost_usd', { precision: 12, scale: 6 }),
    costRub: numeric('cost_rub', { precision: 12, scale: 2 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('llm_calls_research_job_id_idx').on(table.researchJobId),
    index('llm_calls_created_at_idx').on(table.createdAt),
    index('llm_calls_stage_idx').on(table.stage),
  ],
)

// Embeddings for RAG pipeline
// NOTE: vector column added in T-007 after pgvector extension is configured.
// Run: CREATE EXTENSION IF NOT EXISTS vector;
export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    factId: uuid('fact_id').references(() => facts.id),
    sourceId: uuid('source_id').references(() => sources.id),
    contentChunk: text('content_chunk').notNull(),
    // embedding vector(1536) — added in T-007 when pgvector is configured
    embeddingModel: text('embedding_model'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('embeddings_company_id_idx').on(table.companyId)],
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  companies: many(companies),
}))

export const companiesRelations = relations(companies, ({ one, many }) => ({
  user: one(users, { fields: [companies.userId], references: [users.id] }),
  intakeSubmissions: many(intakeSubmissions),
  researchJobs: many(researchJobs),
  sources: many(sources),
  facts: many(facts),
  strategyArtifacts: many(strategyArtifacts),
  reportArtifacts: many(reportArtifacts),
  embeddings: many(embeddings),
}))

export const intakeSubmissionsRelations = relations(intakeSubmissions, ({ one }) => ({
  company: one(companies, {
    fields: [intakeSubmissions.companyId],
    references: [companies.id],
  }),
}))

export const researchJobsRelations = relations(researchJobs, ({ one, many }) => ({
  company: one(companies, {
    fields: [researchJobs.companyId],
    references: [companies.id],
  }),
  facts: many(facts),
  strategyArtifacts: many(strategyArtifacts),
  reportArtifacts: many(reportArtifacts),
  llmCalls: many(llmCalls),
}))

export const llmCallsRelations = relations(llmCalls, ({ one }) => ({
  researchJob: one(researchJobs, {
    fields: [llmCalls.researchJobId],
    references: [researchJobs.id],
  }),
}))

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  company: one(companies, {
    fields: [sources.companyId],
    references: [companies.id],
  }),
  facts: many(facts),
  embeddings: many(embeddings),
}))

export const factsRelations = relations(facts, ({ one, many }) => ({
  company: one(companies, {
    fields: [facts.companyId],
    references: [companies.id],
  }),
  source: one(sources, {
    fields: [facts.sourceId],
    references: [sources.id],
  }),
  researchJob: one(researchJobs, {
    fields: [facts.researchJobId],
    references: [researchJobs.id],
  }),
  embeddings: many(embeddings),
}))

export const strategyArtifactsRelations = relations(strategyArtifacts, ({ one }) => ({
  company: one(companies, {
    fields: [strategyArtifacts.companyId],
    references: [companies.id],
  }),
  researchJob: one(researchJobs, {
    fields: [strategyArtifacts.researchJobId],
    references: [researchJobs.id],
  }),
}))

export const reportArtifactsRelations = relations(reportArtifacts, ({ one }) => ({
  company: one(companies, {
    fields: [reportArtifacts.companyId],
    references: [companies.id],
  }),
  researchJob: one(researchJobs, {
    fields: [reportArtifacts.researchJobId],
    references: [researchJobs.id],
  }),
}))

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  company: one(companies, {
    fields: [embeddings.companyId],
    references: [companies.id],
  }),
  fact: one(facts, {
    fields: [embeddings.factId],
    references: [facts.id],
  }),
  source: one(sources, {
    fields: [embeddings.sourceId],
    references: [sources.id],
  }),
}))
