-- Структурные снимки Lighthouse сайта клиента (PageSpeed Insights) для 4 шкал в брифе.
-- Хранит { clientUrl, pagespeed: [...] }. Рисуется напрямую, без дистилляции через LLM.
ALTER TABLE "research_jobs" ADD COLUMN IF NOT EXISTS "metrics_json" jsonb;
