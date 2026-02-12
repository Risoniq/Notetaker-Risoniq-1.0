
-- Fix: Remove circular dependency in project_members RLS policies

-- 1. Drop the SELECT policy that references projects table
DROP POLICY IF EXISTS "Users can view project memberships" ON public.project_members;

-- Recreate without projects subquery
CREATE POLICY "Users can view project memberships"
ON public.project_members
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR auth.uid() = invited_by);

-- 2. Drop the DELETE policy that references projects table
DROP POLICY IF EXISTS "Owners and members can remove memberships" ON public.project_members;

-- Recreate without projects subquery
CREATE POLICY "Owners and members can remove memberships"
ON public.project_members
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR auth.uid() = invited_by);
