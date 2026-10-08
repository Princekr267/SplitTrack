CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."group_status" AS ENUM('active', 'settled');--> statement-breakpoint
CREATE TYPE "public"."split_type" AS ENUM('equal', 'exact', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."created_by_type" AS ENUM('host', 'friend');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('cash', 'online');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "group_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50) DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"linked_user_id" uuid,
	"share_token_hash" varchar(255),
	"share_enabled" boolean DEFAULT false NOT NULL,
	"invite_code_hash" varchar(255),
	"invite_expires_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_id_group_id_unique" UNIQUE("id","group_id")
);
--> statement-breakpoint
CREATE TABLE "expense_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"basis_points" integer,
	"exact_amount" integer,
	CONSTRAINT "expense_splits_expense_person_unique" UNIQUE("expense_id","person_id"),
	CONSTRAINT "expense_splits_amount_non_negative" CHECK ("expense_splits"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"total_amount" integer NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_by_person_id" uuid NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"split_type" "split_type" DEFAULT 'equal' NOT NULL,
	"created_by" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_id_group_id_unique" UNIQUE("id","group_id"),
	CONSTRAINT "expenses_total_amount_positive" CHECK ("expenses"."total_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"from_person_id" uuid NOT NULL,
	"to_person_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"mode" "payment_mode" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"reference" varchar(255) DEFAULT '' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"reject_reason" text DEFAULT '' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_by_type" "created_by_type" NOT NULL,
	"created_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0),
	CONSTRAINT "payments_from_ne_to" CHECK ("payments"."from_person_id" <> "payments"."to_person_id"),
	CONSTRAINT "payments_friend_decision_check" CHECK (("payments"."created_by_type" <> 'friend' OR "payments"."status" <> 'accepted' OR "payments"."decided_by" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_role" varchar(50) DEFAULT 'anonymous' NOT NULL,
	"actor_name" varchar(255) DEFAULT 'System' NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"group_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip_address" varchar(100) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_linked_user_id_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_group_fk" FOREIGN KEY ("expense_id","group_id") REFERENCES "public"."expenses"("id","group_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_person_group_fk" FOREIGN KEY ("person_id","group_id") REFERENCES "public"."people"("id","group_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_person_group_fk" FOREIGN KEY ("paid_by_person_id","group_id") REFERENCES "public"."people"("id","group_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_from_person_group_fk" FOREIGN KEY ("from_person_id","group_id") REFERENCES "public"."people"("id","group_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_to_person_group_fk" FOREIGN KEY ("to_person_id","group_id") REFERENCES "public"."people"("id","group_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_lower_email_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "groups_created_by_idx" ON "groups" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "groups_status_idx" ON "groups" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "people_unique_host_per_group_idx" ON "people" USING btree ("group_id") WHERE "people"."is_host" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "people_group_linked_user_idx" ON "people" USING btree ("group_id","linked_user_id") WHERE "people"."linked_user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "people_share_token_hash_idx" ON "people" USING btree ("share_token_hash") WHERE "people"."share_token_hash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "people_invite_code_hash_idx" ON "people" USING btree ("invite_code_hash") WHERE "people"."invite_code_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "people_group_id_idx" ON "people" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "expense_splits_expense_id_idx" ON "expense_splits" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "expense_splits_person_id_idx" ON "expense_splits" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "expense_splits_group_id_idx" ON "expense_splits" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "expenses_group_id_idx" ON "expenses" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "payments_group_id_idx" ON "payments" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "payments_from_person_idx" ON "payments" USING btree ("from_person_id");--> statement-breakpoint
CREATE INDEX "payments_to_person_idx" ON "payments" USING btree ("to_person_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_group_id_idx" ON "audit_logs" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit_logs_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs rows are append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update_delete
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();