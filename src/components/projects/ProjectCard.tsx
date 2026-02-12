import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, LogIn, Users } from "lucide-react";
import type { Project } from "@/hooks/useProjects";

const statusLabels: Record<string, string> = {
  active: "Aktiv",
  completed: "Abgeschlossen",
  archived: "Archiviert",
};

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  completed: "secondary",
  archived: "outline",
};

interface Props {
  project: Project;
  onDelete: (id: string) => void;
  onJoin?: (membershipId: string) => void;
}

export function ProjectCard({ project, onDelete, onJoin }: Props) {
  const navigate = useNavigate();
  const isOwner = project.membership_status === "owner";
  const isPending = project.membership_status === "pending";
  const isJoined = project.membership_status === "joined";

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => {
        if (isPending) return; // Don't navigate for pending invites
        navigate(`/projects/${project.id}`);
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            <CardTitle className="text-lg">{project.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            {isPending && <Badge variant="secondary">Einladung</Badge>}
            {isJoined && (
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                Geteilt
              </Badge>
            )}
            <Badge variant={statusVariants[project.status] ?? "outline"}>
              {statusLabels[project.status] ?? project.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {project.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{project.recording_count ?? 0} Meetings</span>
          </div>

          {isPending && onJoin && project.membership_id && (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onJoin(project.membership_id!);
              }}
            >
              <LogIn className="h-4 w-4 mr-1" />
              Beitreten
            </Button>
          )}

          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
