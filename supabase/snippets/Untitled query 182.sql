-- Tablas de la aplicación, extraídas de la migración TypeORM InitialSchema.
-- Incluye también el registro en la tabla "migrations" de TypeORM para que
-- `npm run migration:run` no intente volver a aplicar InitialSchema.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== TYPES =====
CREATE TYPE "public"."priority_enum" AS ENUM('alta', 'media', 'baja');
CREATE TYPE "public"."commitment_status_enum" AS ENUM('pendiente', 'en_progreso', 'cumplido', 'vencido');
CREATE TYPE "public"."meeting_status_enum" AS ENUM('SCHEDULED', 'ONGOING', 'FINISHED', 'CANCELLED');
CREATE TYPE "public"."minute_status_enum" AS ENUM('DRAFT', 'SIGNING', 'SIGNED', 'CLOSED');
CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'secretary', 'auditor');

-- ===== TABLES =====
CREATE TABLE "users" (
  "id"         uuid        NOT NULL,
  "email"      text        NOT NULL,
  "role"       "public"."user_role_enum" NOT NULL DEFAULT 'secretary',
  "is_active"  boolean     NOT NULL DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email");

CREATE TABLE "meetings" (
  "id"           uuid        NOT NULL DEFAULT uuid_generate_v4(),
  "title"        text        NOT NULL,
  "agenda"       text,
  "location"     text,
  "scheduled_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "status"       "public"."meeting_status_enum" NOT NULL DEFAULT 'SCHEDULED',
  "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "organizer_id" uuid        NOT NULL,
  CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id")
);
CREATE INDEX "idx_meetings_scheduled_at" ON "meetings" ("scheduled_at");
CREATE INDEX "idx_meetings_organizer"    ON "meetings" ("organizer_id");
CREATE INDEX "idx_meetings_status"       ON "meetings" ("status");

CREATE TABLE "meeting_attendees" (
  "meeting_id" uuid    NOT NULL,
  "user_id"    uuid    NOT NULL,
  "role"       text,
  "attended"   boolean,
  CONSTRAINT "PK_fc6865479832a3f91764918a012" PRIMARY KEY ("meeting_id", "user_id")
);
CREATE INDEX "idx_meeting_attendees_meeting" ON "meeting_attendees" ("meeting_id");
CREATE INDEX "idx_meeting_attendees_user"    ON "meeting_attendees" ("user_id");

CREATE TABLE "minutes" (
  "id"             uuid    NOT NULL DEFAULT uuid_generate_v4(),
  "content"        jsonb   NOT NULL,
  "version"        integer NOT NULL DEFAULT '1',
  "status"         "public"."minute_status_enum" NOT NULL DEFAULT 'DRAFT',
  "content_hash"   text,
  "signed_pdf_url" text,
  "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "meeting_id"     uuid    NOT NULL,
  CONSTRAINT "PK_6430e69788e26236b493d6fcc7e" PRIMARY KEY ("id")
);
CREATE INDEX "idx_minutes_meeting" ON "minutes" ("meeting_id");
CREATE INDEX "idx_minutes_status"  ON "minutes" ("status");

CREATE TABLE "commitments" (
  "id"          uuid    NOT NULL DEFAULT uuid_generate_v4(),
  "description" text    NOT NULL,
  "due_date"    date,
  "priority"    "public"."priority_enum" NOT NULL DEFAULT 'media',
  "status"      "public"."commitment_status_enum" NOT NULL DEFAULT 'pendiente',
  "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "minute_id"   uuid    NOT NULL,
  "assignee_id" uuid    NOT NULL,
  CONSTRAINT "PK_82060edcfe810ce82b7565521af" PRIMARY KEY ("id")
);
CREATE INDEX "idx_commitments_minute"   ON "commitments" ("minute_id");
CREATE INDEX "idx_commitments_assignee" ON "commitments" ("assignee_id");
CREATE INDEX "idx_commitments_due_date" ON "commitments" ("due_date");
CREATE INDEX "idx_commitments_status"   ON "commitments" ("status");

CREATE TABLE "signatures" (
  "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
  "signature_svg" text,
  "signature_png" text,
  "metadata"      jsonb,
  "signed_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "minute_id"     uuid NOT NULL,
  "signer_id"     uuid NOT NULL,
  CONSTRAINT "PK_f56eb3cd344ce7f9ae28ce814eb" PRIMARY KEY ("id")
);
CREATE INDEX "idx_signatures_minute" ON "signatures" ("minute_id");
CREATE INDEX "idx_signatures_signer" ON "signatures" ("signer_id");

CREATE TABLE "attachments" (
  "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
  "filename"    text NOT NULL,
  "mime_type"   text NOT NULL,
  "storage_key" text NOT NULL,
  "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "minute_id"   uuid NOT NULL,
  "uploaded_by" uuid NOT NULL,
  CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id")
);
CREATE INDEX "idx_attachments_minute"      ON "attachments" ("minute_id");
CREATE INDEX "idx_attachments_uploaded_by" ON "attachments" ("uploaded_by");

CREATE TABLE "audit_log" (
  "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
  "action"        text NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id"   uuid,
  "ip"            text,
  "created_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "actor_id"      uuid,
  CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id")
);
CREATE INDEX "idx_audit_log_actor"  ON "audit_log" ("actor_id");
CREATE INDEX "idx_audit_log_action" ON "audit_log" ("action");

-- ===== FOREIGN KEYS =====
ALTER TABLE "meetings"
  ADD CONSTRAINT "FK_51783596c43363cc8fe4b6e3f84"
  FOREIGN KEY ("organizer_id") REFERENCES "users"("id");

ALTER TABLE "meeting_attendees"
  ADD CONSTRAINT "FK_8643679c49d7234b266433bc201"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "FK_edda203440a111ad016876f8737"
  FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "minutes"
  ADD CONSTRAINT "FK_b5f85480864d8582430e488a93d"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE;

ALTER TABLE "commitments"
  ADD CONSTRAINT "FK_54bbc8ff066e5c9ea62928c966a"
  FOREIGN KEY ("minute_id") REFERENCES "minutes"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "FK_9140a66fc9a807d5401a2143313"
  FOREIGN KEY ("assignee_id") REFERENCES "users"("id");

ALTER TABLE "signatures"
  ADD CONSTRAINT "FK_896952c6da180cbd3b4d0744caf"
  FOREIGN KEY ("minute_id") REFERENCES "minutes"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "FK_3756743fa6af1eb364101368d7d"
  FOREIGN KEY ("signer_id") REFERENCES "users"("id");

ALTER TABLE "attachments"
  ADD CONSTRAINT "FK_046b6629f2d139b3aebaadbd4a1"
  FOREIGN KEY ("minute_id") REFERENCES "minutes"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "FK_e25812e3fd9b3f3edf11b2c5d58"
  FOREIGN KEY ("uploaded_by") REFERENCES "users"("id");

ALTER TABLE "audit_log"
  ADD CONSTRAINT "FK_15a6f5aad57db494c17986ed2e2"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id");

-- ===== TYPEORM MIGRATION TRACKING =====
-- Evita que `npm run migration:run` vuelva a aplicar InitialSchema.
CREATE TABLE IF NOT EXISTS "migrations" (
  "id"        SERIAL PRIMARY KEY,
  "timestamp" bigint  NOT NULL,
  "name"      varchar NOT NULL
);
INSERT INTO "migrations" ("timestamp", "name")
VALUES (1778341464265, 'InitialSchema1778341464265');
