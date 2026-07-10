-- Кеш интерактивного «рабочего отчёта» (InteractiveV2) — дистилляция FullV2/BriefV2
-- в формат innodor-report.html (sticky-сайдбар, hero, pain-flow, roadmap, ROI и т.д.).
-- Показывается paid-клиенту первым экраном после оплаты, до 70–80-стр. FullV2.
-- Кешируется по той же схеме, что content_json/brief_json — первый просмотр
-- генерирует, последующие читают из БД без повторного LLM-вызова.

ALTER TABLE "report_artifacts"
  ADD COLUMN IF NOT EXISTS "interactive_json" jsonb;
