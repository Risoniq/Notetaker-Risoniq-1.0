import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProjects, useProjectRecordings } from "@/hooks/useProjects";

interface Props {
  projectId: string;
}

export function AssignRecordingsDialog({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { assignRecording } = useProjects();
  const { data: assigned } = useProjectRecordings(projectId);

  const { data: allRecordings } = useQuery({
    queryKey: ["all-recordings-for-assign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recordings")
        .select("id, title, created_at, status")
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const assignedIds = new Set(assigned?.map((r: any) => r.id) ?? []);
  const filtered = (allRecordings ?? []).filter(
    (r) => !assignedIds.has(r.id) && (r.title?.toLowerCase().includes(search.toLowerCase()) || !search)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Meetings zuordnen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Meetings zuordnen</DialogTitle>
        </DialogHeader>
        <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="space-y-2 max-h-[50vh] overflow-y-auto mt-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Keine Meetings verfügbar</p>
          )}
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{r.title || "Ohne Titel"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("de-DE")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => assignRecording.mutateAsync({ projectId, recordingId: r.id })}
                disabled={assignRecording.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
