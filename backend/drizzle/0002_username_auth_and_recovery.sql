-- 1. Modify users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_change_notice_pending boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_change_method varchar(20);

-- Backfill any existing users without a username if present
UPDATE users SET username = 'user_' || substr(replace(id::text, '-', ''), 1, 10) WHERE username IS NULL;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
DROP INDEX IF EXISTS users_lower_email_idx;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (username);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_username_format_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_username_format_check CHECK (username = lower(username) AND username ~ '^[a-z][a-z0-9_]{2,19}$');
  END IF;
END $$;

-- Username immutability trigger
CREATE OR REPLACE FUNCTION users_prevent_username_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username <> OLD.username THEN
    RAISE EXCEPTION 'Username is permanent and cannot be updated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_prevent_username_update ON users;
CREATE TRIGGER trg_users_prevent_username_update
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION users_prevent_username_update();

-- 2. Create recovery_codes table
CREATE TABLE IF NOT EXISTS recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  code_hash varchar(64) NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recovery_codes_user_id_idx ON recovery_codes(user_id);

-- 3. Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_hash varchar(64) NOT NULL,
  code_hash varchar(64) NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_by_admin_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  request_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS password_resets_token_hash_idx ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS password_resets_user_id_idx ON password_resets(user_id);

-- 4. Create reset_requests table
CREATE TABLE IF NOT EXISTS reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  note text,
  status varchar(20) NOT NULL DEFAULT 'open',
  handled_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  handled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reset_requests_user_id_idx ON reset_requests(user_id);
CREATE INDEX IF NOT EXISTS reset_requests_status_idx ON reset_requests(status);

-- 5. Create auth_rate_limits table
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key varchar(255) PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. Add reason to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason text;
