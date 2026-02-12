
-- Create project_members table
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- SELECT: user_id, invited_by, or project owner
CREATE POLICY "Users can view project memberships"
ON public.project_members FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.uid() = invited_by
  OR EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_members.project_id AND projects.user_id = auth.uid())
);

-- INSERT: only project owner
CREATE POLICY "Project owners can invite members"
ON public.project_members FOR INSERT
WITH CHECK (
  auth.uid() = invited_by
  AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_members.project_id AND projects.user_id = auth.uid())
);

-- UPDATE: only the invited user can accept
CREATE POLICY "Invited users can accept invitations"
ON public.project_members FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: project owner or invited user
CREATE POLICY "Owners and members can remove memberships"
ON public.project_members FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_members.project_id AND projects.user_id = auth.uid())
);

-- Admin full access
CREATE POLICY "Admins can manage project members"
ON public.project_members FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- New SELECT policy on projects: joined members can see project
CREATE POLICY "Project members can view shared projects"
ON public.projects FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid() AND project_members.status = 'joined')
);

-- New SELECT policy on project_recordings: joined members can see
CREATE POLICY "Project members can view shared project recordings"
ON public.project_recordings FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_members.project_id = project_recordings.project_id AND project_members.user_id = auth.uid() AND project_members.status = 'joined')
);

-- New SELECT policy on recordings: via project membership
CREATE POLICY "Project members can view project recordings"
ON public.recordings FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.project_recordings pr
    JOIN public.project_members pm ON pm.project_id = pr.project_id
    WHERE pr.recording_id = recordings.id
    AND pm.user_id = auth.uid()
    AND pm.status = 'joined'
  )
);
