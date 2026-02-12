import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Props {
  projectId: string;
}

export function InviteToProjectDialog({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("project-invite", {
        body: { action: "list", projectId },
      });
      if (error) throw error;
      return data.members as Array<{ id: string; email: string; status: string; user_id: string }>;
    },
    enabled: open,
  });

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("project-invite", {
        body: { action: "invite", projectId, email: email.trim() },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success("Einladung gesendet");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
    } catch (e: any) {
      toast.error(e.message || "Einladung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("project-invite", {
        body: { action: "remove", memberId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success("Mitglied entfernt");
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Einladen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Team-Mitglied einladen</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="E-Mail des Team-Mitglieds"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <Button onClick={handleInvite} disabled={loading || !email.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Einladen"}
          </Button>
        </div>

        <div className="space-y-2 mt-4">
          <p className="text-sm font-medium text-muted-foreground">Mitglieder</p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laden...</p>
          ) : !members?.length ? (
            <p className="text-sm text-muted-foreground">Noch keine Mitglieder eingeladen</p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{m.email}</span>
                  <Badge variant={m.status === "joined" ? "default" : "secondary"}>
                    {m.status === "joined" ? "Beigetreten" : "Eingeladen"}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemove(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
