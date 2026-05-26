import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
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
    competitors: text('competitors'),
    goals: text('goals'),
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
    contentJson: jsonb('content_json'),
    contentMarkdown: text('content_markdown'),
    // Кеш краткого отчёта (BRIEF_REPORT, 6 блоков) — генерируется по запросу,
    // чтобы не пересоздавать дорогостоящий brief при каждом просмотре.
    briefJson: jsonb('brief_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('report_artifacts_company_id_idx').on(table.companyId)],
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
