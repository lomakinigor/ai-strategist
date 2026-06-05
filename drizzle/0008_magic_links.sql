-- Magic links — токены для возврата к отчёту по email-ссылке без пароля.
-- TTL раздельный: ссылка /access?token=… действует 30 дней (auth-токен),
-- а сам артефакт по UUID-URL /free-report/[id] или /brief/[id] доступен
-- бессрочно (UUID непредсказуем, не индексируется поисковиками).
-- При истечении токена пользователь может запросить новый по email.
CREATE TABLE IF NOT EXISTS "magic_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" text NOT NULL UNIQUE,
  "email" text NOT NULL,
  "artifact_id" uuid NOT NULL REFERENCES "report_artifacts"("id") ON DELETE CASCADE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "magic_links_token_idx" ON "magic_links" ("token");
CREATE INDEX IF NOT EXISTS "magic_links_email_idx" ON "magic_links" ("email");
CREATE INDEX IF NOT EXISTS "magic_links_artifact_id_idx" ON "magic_links" ("artifact_id");
