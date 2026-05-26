-- Гейт «Подтверди и поправь»: подтверждённые клиентом данные (5 блоков)
-- хранятся как jsonb на research_jobs. Перекрывают домыслы при генерации отчёта.
ALTER TABLE "research_jobs" ADD COLUMN IF NOT EXISTS "confirmations_json" jsonb;
