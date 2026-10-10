ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "is_frozen" boolean DEFAULT false NOT NULL;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "frozen_reason" text;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "frozen_at" timestamp with time zone;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "frozen_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" varchar(100) PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
