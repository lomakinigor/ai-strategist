-- Платная воронка с QR + ручной approve:
-- 1. research_jobs.tier — тариф из intake (?tier=free|paid). Прокидывается в reportArtifacts.tier
--    после генерации. Default 'free' — большинство истории это бесплатные пробники.
-- 2. research_jobs.paid — флаг подтверждения оплаты администратором.
--    Для free всегда true (оплата не нужна). Для paid — false до approve по secret-ссылке.
-- 3. research_jobs.paid_at — timestamp когда админ нажал Approve. Аудит-трейл.

ALTER TABLE "research_jobs"
  ADD COLUMN IF NOT EXISTS "tier" "report_tier" DEFAULT 'free' NOT NULL;

ALTER TABLE "research_jobs"
  ADD COLUMN IF NOT EXISTS "paid" boolean DEFAULT true NOT NULL;

ALTER TABLE "research_jobs"
  ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone;

-- Backfill: исторические записи — все free и оплачены (free не требует оплаты).
UPDATE "research_jobs" SET "tier" = 'free' WHERE "tier" IS NULL;
UPDATE "research_jobs" SET "paid" = true WHERE "paid" IS NULL;

CREATE INDEX IF NOT EXISTS "research_jobs_tier_paid_idx" ON "research_jobs" ("tier", "paid");
