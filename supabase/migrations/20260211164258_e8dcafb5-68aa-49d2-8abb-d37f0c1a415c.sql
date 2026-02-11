
-- Add soft-delete column
ALTER TABLE public.recordings ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Update RLS: Users can only see non-deleted recordings
DROP POLICY IF EXISTS "Users can view own recordings" ON public.recordings;
CREATE POLICY "Users can view own recordings"
ON public.recordings FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Update RLS: Teamleads can only see non-deleted recordings
DROP POLICY IF EXISTS "Teamleads can view team recordings" ON public.recordings;
CREATE POLICY "Teamleads can view team recordings"
ON public.recordings FOR SELECT
USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1
    FROM team_members my_membership
    JOIN team_members target_membership ON my_membership.team_id = target_membership.team_id
    WHERE my_membership.user_id = auth.uid()
      AND my_membership.role = 'lead'
      AND target_membership.user_id = recordings.user_id
  )
);

-- Admin policy stays unchanged (can see all including deleted)
