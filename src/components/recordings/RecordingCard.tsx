import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Recording, getStatusLabel, getStatusColor } from "@/types/recording";
import { Calendar, Clock, FileText, Target, CheckSquare, Loader2, Upload } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface RecordingCardProps {
  recording: Recording;
  onClick: () => void;
}

export const RecordingCard = ({ recording, onClick }: RecordingCardProps) => {
  const formattedDate = format(new Date(recording.created_at), "dd. MMM yyyy, HH:mm", { locale: de });
  const duration = recording.duration ? `${Math.floor(recording.duration / 60)} Min` : null;
  
  const isAnalyzing = recording.status === 'processing';
  const hasActiveStatus = ['pending', 'joining', 'recording'].includes(recording.status);
  
  // Erkennung von veralteten Meetings (älter als 4 Stunden mit aktivem Status)
  const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 Stunden
  const isStale = hasActiveStatus && 
    (Date.now() - new Date(recording.created_at).getTime()) > STALE_THRESHOLD_MS;
  
  // Nur als aktiv anzeigen, wenn nicht veraltet
  const isActive = hasActiveStatus && !isStale;
  
  // Effektiven Status für die Anzeige bestimmen
  const displayStatus = isStale ? 'timeout' : recording.status;
  
  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            {isAnalyzing && !recording.title ? (
              <Skeleton className="h-5 w-3/4" />
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                {recording.source === 'manual' && (
                  <Upload className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Hochgeladene Datei" />
                )}
                <h3 className="font-semibold text-foreground line-clamp-2">
                  {recording.title || `Meeting ${recording.meeting_id.slice(0, 8)}`}
                </h3>
              </div>
            )}
            <Badge className={`shrink-0 ${getStatusColor(displayStatus)}`}>
              {isAnalyzing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {getStatusLabel(displayStatus)}
            </Badge>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formattedDate}</span>
            </div>
            {isAnalyzing && !duration ? (
              <Skeleton className="h-4 w-16" />
            ) : duration ? (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{duration}</span>
              </div>
            ) : null}
          </div>

          {/* Stats - Show placeholders when analyzing */}
          {isAnalyzing ? (
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileText className="h-3.5 w-3.5 opacity-50" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Target className="h-3.5 w-3.5 opacity-50" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckSquare className="h-3.5 w-3.5 opacity-50" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ) : recording.status === 'done' ? (
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
              {recording.word_count && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{recording.word_count.toLocaleString('de-DE')} Wörter</span>
                </div>
              )}
              {recording.key_points && recording.key_points.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  <span>{recording.key_points.length} Key Points</span>
                </div>
              )}
              {recording.action_items && recording.action_items.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>{recording.action_items.length} Action Items</span>
                </div>
              )}
            </div>
          ) : isActive ? (
            <div className="flex items-center gap-2 pt-2 border-t border-border text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Meeting läuft...</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
