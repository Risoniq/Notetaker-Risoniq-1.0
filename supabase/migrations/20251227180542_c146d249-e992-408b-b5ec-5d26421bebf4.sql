-- Add supabase_user_id column to link Recall calendar users to authenticated Supabase users
ALTER TABLE public.recall_calendar_users 
ADD COLUMN IF NOT EXISTS supabase_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index to ensure one Recall user per Supabase user
CREATE UNIQUE INDEX IF NOT EXISTS idx_recall_calendar_users_supabase_user_id 
ON public.recall_calendar_users(supabase_user_id) 
WHERE supabase_user_id IS NOT NULL;

-- Update RLS policies to be user-specific
DROP POLICY IF EXISTS "Anyone can insert calendar users" ON public.recall_calendar_users;
DROP POLICY IF EXISTS "Anyone can update calendar users" ON public.recall_calendar_users;
DROP POLICY IF EXISTS "Anyone can view calendar users" ON public.recall_calendar_users;

-- Users can view their own calendar connection
CREATE POLICY "Users can view own calendar users" 
ON public.recall_calendar_users 
FOR SELECT 
USING (supabase_user_id = auth.uid() OR supabase_user_id IS NULL);

-- Users can insert their own calendar connection
CREATE POLICY "Users can insert own calendar users" 
ON public.recall_calendar_users 
FOR INSERT 
WITH CHECK (supabase_user_id = auth.uid() OR supabase_user_id IS NULL);

-- Users can update their own calendar connection
CREATE POLICY "Users can update own calendar users" 
ON public.recall_calendar_users 
FOR UPDATE 
USING (supabase_user_id = auth.uid() OR supabase_user_id IS NULL);

-- Service role can manage all records (for edge functions)
CREATE POLICY "Service role full access" 
ON public.recall_calendar_users 
FOR ALL 
USING (true) 
WITH CHECK (true);