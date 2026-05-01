-- Migration: add competitors research stream
-- Date: 2026-04-30
-- Per spec docs/features/competitors-stream/spec.md (A1)
--
-- Three changes:
--   1. Extend research_type enum with 'competitors'
--   2. Add research_jobs.competitors_status column (research_status enum, default 'pending')
--   3. Backfill: mark all existing rows as 'done' (per decision 1a)

-- 1. Add new enum value (idempotent guard)
DO $$ BEGIN
  ALTER TYPE "public"."research_type" ADD VALUE 'competitors';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add new column with default 'pending'
ALTER TABLE "research_jobs"
  ADD COLUMN IF NOT EXISTS "competitors_status" "research_status" NOT NULL DEFAULT 'pending';

-- 3. Backfill: existing rows get 'done' so old jobs don't trigger competitor research
UPDATE "research_jobs" SET "competitors_status" = 'done' WHERE "competitors_status" = 'pending';
