-- Intake: направления деятельности (jsonb) и используемые рекламные каналы (text[]).
-- Предотвращает склейку разных ниш и потерю каналов клиента ещё на входе.
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "directions" jsonb;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "ad_channels" text[];
