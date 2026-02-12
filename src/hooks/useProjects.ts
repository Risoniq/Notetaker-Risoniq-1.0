import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  analysis: any;
  created_at: string;
  updated_at: string;
  recording_count?: number;
  membership_status?: "owner" | "pending" | "joined";
  membership_id?: string;
}

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      // Fetch own projects
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get recording counts
      const { data: counts, error: countError } = await supabase
        .from("project_recordings")
        .select("project_id");
      if (countError) throw countError;

      const countMap: Record<string, number> = {};
      counts?.forEach((r: any) => {
        countMap[r.project_id] = (countMap[r.project_id] || 0) + 1;
      });

      // Get memberships for this user (pending + joined)
      const { data: memberships } = await supabase
        .from("project_members" as any)
        .select("id, project_id, status")
        .eq("user_id", user!.id);

      const membershipMap = new Map<string, { status: string; id: string }>();
      (memberships ?? []).forEach((m: any) => {
        membershipMap.set(m.project_id, { status: m.status, id: m.id });
      });

      return (data as any[]).map((p) => {
        const mem = membershipMap.get(p.id);
        const isOwner = p.user_id === user!.id;
        return {
          ...p,
          recording_count: countMap[p.id] || 0,
          membership_status: isOwner ? "owner" : (mem?.status as "pending" | "joined") ?? "owner",
          membership_id: mem?.id,
        } as Project;
      });
    },
    enabled: !!user,
  });

  const createProject = useMutation({
    mutationFn: async (project: { name: string; description?: string; color?: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...project, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt erstellt");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; color?: string; status?: string }) => {
      const { error } = await supabase.from("projects").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt gelöscht");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignRecording = useMutation({
    mutationFn: async ({ projectId, recordingId }: { projectId: string; recordingId: string }) => {
      const { error } = await supabase
        .from("project_recordings")
        .insert({ project_id: projectId, recording_id: recordingId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-recordings"] });
      toast.success("Meeting zugeordnet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeRecording = useMutation({
    mutationFn: async ({ projectId, recordingId }: { projectId: string; recordingId: string }) => {
      const { error } = await supabase
        .from("project_recordings")
        .delete()
        .eq("project_id", projectId)
        .eq("recording_id", recordingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-recordings"] });
      toast.success("Meeting entfernt");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const joinProject = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from("project_members" as any)
        .update({ status: "joined" })
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt beigetreten");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    projects: projectsQuery.data ?? [],
    isLoading: projectsQuery.isLoading,
    createProject,
    updateProject,
    deleteProject,
    assignRecording,
    removeRecording,
    joinProject,
  };
}

export function useProjectRecordings(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-recordings", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_recordings")
        .select("recording_id, added_at")
        .eq("project_id", projectId);
      if (error) throw error;

      if (!data?.length) return [];

      const recordingIds = data.map((r: any) => r.recording_id);
      const { data: recordings, error: recError } = await supabase
        .from("recordings")
        .select("*")
        .in("id", recordingIds)
        .order("created_at", { ascending: true });
      if (recError) throw recError;
      return recordings ?? [];
    },
    enabled: !!projectId,
  });
}
