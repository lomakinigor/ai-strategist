-- Add 'partial' status for two-stage strategy generation:
-- Stage 1 produces 5 section drafts → status='partial' → user reviews → Stage 2 synthesizes → 'done'.
DO $$ BEGIN
  ALTER TYPE "public"."artifact_status" ADD VALUE 'partial' BEFORE 'done';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
