-- usage_events: лог использования отчётов для админ-дашборда /admin/usage.
-- Фронт пишет через POST /api/usage-event при mount FullV2View / BriefV2View
-- и при клике «Скачать PDF».
--
-- Типы событий:
--   brief_viewed     — пользователь открыл /free-report/[artifactId]?version=v2
--   full_viewed      — пользователь открыл /research/[jobId]/report?version=v2
--   pdf_downloaded   — клик кнопки PDF в FullV2View / BriefV2View
--
-- Один из идентификаторов (research_job_id ИЛИ artifact_id) обязателен.
-- Дубликаты не фильтруются на insert — все события сохраняются;
-- дедупликация на запросе через MIN(created_at) в админ-дашборде.

CREATE TABLE IF NOT EXISTS "usage_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_job_id" uuid REFERENCES "research_jobs"("id"),
  "artifact_id" uuid REFERENCES "report_artifacts"("id"),
  "event_type" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "usage_events_research_job_id_idx" ON "usage_events" ("research_job_id");
CREATE INDEX IF NOT EXISTS "usage_events_artifact_id_idx" ON "usage_events" ("artifact_id");
CREATE INDEX IF NOT EXISTS "usage_events_event_type_idx" ON "usage_events" ("event_type");
CREATE INDEX IF NOT EXISTS "usage_events_created_at_idx" ON "usage_events" ("created_at");
