
CREATE TABLE public.onboarding_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding status"
  ON public.onboarding_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding status"
  ON public.onboarding_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding status"
  ON public.onboarding_status FOR UPDATE
  USING (auth.uid() = user_id);
