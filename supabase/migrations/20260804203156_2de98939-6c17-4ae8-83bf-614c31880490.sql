ALTER TABLE public.calcom_connections
  ADD COLUMN IF NOT EXISTS auth_type text NOT NULL DEFAULT 'api_key',
  ADD COLUMN IF NOT EXISTS calcom_access_token text,
  ADD COLUMN IF NOT EXISTS calcom_refresh_token text,
  ADD COLUMN IF NOT EXISTS calcom_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS calcom_scopes text;

ALTER TABLE public.calcom_connections ALTER COLUMN calcom_api_key DROP NOT NULL;

ALTER TABLE public.calcom_connections
  ADD CONSTRAINT calcom_connections_auth_type_check
  CHECK (auth_type IN ('api_key', 'oauth'));