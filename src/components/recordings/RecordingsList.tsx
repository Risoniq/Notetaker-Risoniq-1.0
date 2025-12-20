import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Recording } from "@/types/recording";
import { RecordingCard } from "./RecordingCard";
import { RecordingDetailSheet } from "./RecordingDetailSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen } from "lucide-react";

export const RecordingsList = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecordings(data as Recording[]);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();

    // Realtime subscription for updates
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
  }, []);

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
            onClick={() => setSelectedRecording(recording)}
          />
        ))}
      </div>

      <RecordingDetailSheet
        recording={selectedRecording}
        open={!!selectedRecording}
        onOpenChange={(open) => !open && setSelectedRecording(null)}
      />
    </div>
  );
};
