-- CRM-lite поля для /admin/leads (Этап 2.2):
-- 1. lead_status enum + leads.status — статус ведения (new/in_progress/closed)
-- 2. leads.utm jsonb — UTM-метки с лендинга (saved from POST /api/lead body.utm)
-- 3. leads.admin_notes text — заметки оператора при ведении
-- 4. leads.updated_at — для отслеживания последнего касания
-- 5. индексы по status и created_at для быстрых фильтров

DO $$ BEGIN
  CREATE TYPE "lead_status" AS ENUM ('new', 'in_progress', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "status" "lead_status" DEFAULT 'new' NOT NULL,
  ADD COLUMN IF NOT EXISTS "utm" jsonb,
  ADD COLUMN IF NOT EXISTS "admin_notes" text,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- Бэкфилл: исторические лиды получают status='new' (по дефолту), updated_at=created_at
UPDATE "leads" SET "updated_at" = "created_at" WHERE "updated_at" = "created_at";

CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads" ("status");
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads" ("created_at");
