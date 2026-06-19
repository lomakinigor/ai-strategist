-- llm_calls: cost-учёт каждого LLM-вызова pipeline для админ-дашборда /admin/costs.
-- Все этапы (intake_parse, research_*, brief_v2, full_v2_part_N) логируют сюда
-- через хелпер recordLlmCall().
--
-- cost_usd: берём из ответа OpenRouter (usage.cost — реальная стоимость)
--           или считаем по модельной таблице цен (для OpenAI/прямых вызовов).
-- cost_rub: cost_usd × курс ЦБ на момент записи (исторически фиксируется,
--           курс может меняться, но запись остаётся точной для прошлого).

CREATE TABLE IF NOT EXISTS "llm_calls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_job_id" uuid REFERENCES "research_jobs"("id"),
  "stage" text NOT NULL,
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "prompt_tokens" integer,
  "completion_tokens" integer,
  "cost_usd" numeric(12, 6),
  "cost_rub" numeric(12, 2),
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "llm_calls_research_job_id_idx" ON "llm_calls" ("research_job_id");
CREATE INDEX IF NOT EXISTS "llm_calls_created_at_idx" ON "llm_calls" ("created_at");
CREATE INDEX IF NOT EXISTS "llm_calls_stage_idx" ON "llm_calls" ("stage");
