ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_color" varchar(20) DEFAULT 'indigo' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "upi_id" varchar(256);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "show_upi" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_payment_mode" varchar(20) DEFAULT 'online' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_split_type" varchar(20) DEFAULT 'equal' NOT NULL;
