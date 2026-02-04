-- API Keys Tabelle für externe API-Authentifizierung
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{"dashboard": true, "transcripts": true, "team_stats": true}'::jsonb,
  created_by uuid NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Webhook Konfigurationen für automatische Reports
CREATE TABLE public.webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  name text NOT NULL,
  webhook_url text NOT NULL,
  frequency text NOT NULL DEFAULT 'manual',
  schedule_time time,
  schedule_day integer,
  threshold_type text,
  threshold_value integer,
  report_type text NOT NULL DEFAULT 'dashboard',
  is_active boolean NOT NULL DEFAULT true,
  last_triggered timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies für api_keys (nur Admins)
CREATE POLICY "Admins can view all api_keys"
ON public.api_keys FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert api_keys"
ON public.api_keys FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update api_keys"
ON public.api_keys FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete api_keys"
ON public.api_keys FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies für webhook_configs (nur Admins)
CREATE POLICY "Admins can view all webhook_configs"
ON public.webhook_configs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert webhook_configs"
ON public.webhook_configs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update webhook_configs"
ON public.webhook_configs FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete webhook_configs"
ON public.webhook_configs FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes für Performance
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON public.api_keys(is_active);
CREATE INDEX idx_webhook_configs_api_key_id ON public.webhook_configs(api_key_id);
CREATE INDEX idx_webhook_configs_frequency ON public.webhook_configs(frequency) WHERE is_active = true;