-- Tier классификация report_artifacts: free (1-страничный пробник) / paid
-- (9 999 ₽ полный отчёт) / retainer (часть пакета сопровождения).
-- Существующие артефакты получают 'paid' по умолчанию — это «полные отчёты»,
-- которые генерировались до введения тарифов.
DO $$ BEGIN
  CREATE TYPE "report_tier" AS ENUM ('free', 'paid', 'retainer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "report_artifacts"
  ADD COLUMN IF NOT EXISTS "tier" "report_tier" DEFAULT 'paid' NOT NULL;

CREATE INDEX IF NOT EXISTS "report_artifacts_tier_idx"
  ON "report_artifacts" ("tier");
