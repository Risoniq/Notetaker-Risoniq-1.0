import { AppLayout } from "@/components/layout/AppLayout";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban } from "lucide-react";

export default function Projects() {
  const { projects, isLoading, deleteProject } = useProjects();

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Projekte</h1>
          </div>
          <CreateProjectDialog />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Noch keine Projekte</p>
            <p className="text-sm">Erstelle ein Projekt, um Meetings zu gruppieren und übergreifend zu analysieren.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onDelete={(id) => deleteProject.mutate(id)} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
