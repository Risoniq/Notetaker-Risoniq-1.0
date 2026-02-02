import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Recording } from "@/types/recording";
import { RecordingCard } from "./RecordingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen } from "lucide-react";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";

export const RecordingsList = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { isImpersonating, impersonatedUserId } = useImpersonation();
  const { isAdmin } = useAdminCheck();

  const fetchRecordings = async () => {
    try {
      // If admin is impersonating, use edge function to fetch target user's recordings
      if (isAdmin && isImpersonating && impersonatedUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('admin-view-user-data', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { 
            target_user_id: impersonatedUserId, 
            data_type: 'recordings' 
          },
        });

        if (error) {
          console.error('Error fetching impersonated recordings:', error);
        } else {
          setRecordings((data?.recordings || []) as unknown as Recording[]);
        }
        setIsLoading(false);
        return;
      }

      // Normal flow for current user
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecordings(data as unknown as Recording[]);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();

    // Realtime subscription for updates (only for non-impersonated view)
    if (!isImpersonating) {
      const channel = supabase
        .channel('recordings-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'recordings' },
          () => {
            fetchRecordings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, isImpersonating, impersonatedUserId]);

  if (isLoading) {
    return (
      <div className="w-full">
        <h2 className="text-xl font-semibold text-foreground mb-4">Aufnahmen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="w-full">
        <h2 className="text-xl font-semibold text-foreground mb-4">Aufnahmen</h2>
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-border rounded-xl bg-muted/30">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-center">
            Noch keine Aufnahmen vorhanden.<br />
            Starte deinen ersten Meeting-Bot oben.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Aufnahmen ({recordings.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recordings.map((recording) => (
          <RecordingCard
            key={recording.id}
            recording={recording}
            onClick={() => navigate(`/meeting/${recording.id}`)}
          />
        ))}
      </div>
    </div>
  );
};
