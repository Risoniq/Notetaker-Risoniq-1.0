import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Recording, getStatusLabel, getStatusColor } from "@/types/recording";
import { Calendar, Clock, FileText, Target, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface RecordingCardProps {
  recording: Recording;
  onClick: () => void;
}

export const RecordingCard = ({ recording, onClick }: RecordingCardProps) => {
  const formattedDate = format(new Date(recording.created_at), "dd. MMM yyyy, HH:mm", { locale: de });
  const duration = recording.duration ? `${Math.floor(recording.duration / 60)} Min` : null;
  
  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground line-clamp-2">
              {recording.title || `Meeting ${recording.meeting_id.slice(0, 8)}`}
            </h3>
            <Badge className={`shrink-0 ${getStatusColor(recording.status)}`}>
              {getStatusLabel(recording.status)}
            </Badge>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formattedDate}</span>
            </div>
            {duration && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{duration}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          {recording.status === 'done' && (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};
