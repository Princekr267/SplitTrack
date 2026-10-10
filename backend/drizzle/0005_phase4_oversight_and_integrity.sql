ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "last_viewed_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "integrity_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(20) NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_ms" integer NOT NULL,
	"run_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
);
