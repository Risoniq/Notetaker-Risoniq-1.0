import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RecordingsList } from "@/components/recordings/RecordingsList";
import { useTeamleadCheck } from "@/hooks/useTeamleadCheck";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Users } from "lucide-react";

const Recordings = () => {
  const { isTeamlead, isLoading: teamleadLoading } = useTeamleadCheck();
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Aufnahmen</h1>
            <p className="text-muted-foreground">
              Alle deine Meeting-Aufnahmen und Transkriptionen
            </p>
          </div>
          
          {/* Team Toggle for Teamleads */}
          {isTeamlead && !teamleadLoading && (
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as 'personal' | 'team')}
            >
              <ToggleGroupItem value="personal" aria-label="Meine Meetings">
                Meine
              </ToggleGroupItem>
              <ToggleGroupItem value="team" aria-label="Team-Meetings">
                <Users className="h-4 w-4 mr-1" />
                Team
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>

        {/* Recordings List */}
        <RecordingsList viewMode={isTeamlead ? viewMode : 'personal'} />
      </div>
    </AppLayout>
  );
};

export default Recordings;
