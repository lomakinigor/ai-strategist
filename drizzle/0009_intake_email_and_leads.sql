-- Коммит 7 — обвязка вокруг тарифной воронки:
-- 1. companies.client_email — email клиента из intake (для auto-send magic link
--    после готовности артефакта). Nullable: исторические компании без email.
-- 2. leads — заявки с тарифов «9 999 ₽» и «Сопровождение». Лид-форма перед
--    оплатой/собеседованием (тариф free сразу идёт в /intake, не в leads).

ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "client_email" text;

DO $$ BEGIN
  CREATE TYPE "lead_type" AS ENUM ('paid', 'retainer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_type" "lead_type" NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "company" text,
  "message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "leads_lead_type_idx" ON "leads" ("lead_type");
CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads" ("email");
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads" ("created_at" DESC);
