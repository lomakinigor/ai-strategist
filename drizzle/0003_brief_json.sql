-- Кеш краткого отчёта (BRIEF_REPORT, 6 блоков) в report_artifacts.
-- Генерируется по запросу, повторные просмотры читают из БД, не пересоздавая brief.
ALTER TABLE "report_artifacts" ADD COLUMN IF NOT EXISTS "brief_json" jsonb;
