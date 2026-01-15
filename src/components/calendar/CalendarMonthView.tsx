import { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { de } from 'date-fns/locale';
import { RecallMeeting } from '@/hooks/useRecallCalendarMeetings';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff } from 'lucide-react';

interface CalendarMonthViewProps {
  meetings: RecallMeeting[];
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export const CalendarMonthView = ({ 
  meetings, 
  selectedDate, 
  onDateSelect 
}: CalendarMonthViewProps) => {
  // Group meetings by date and track which have links
  const { meetingsByDate, datesWithLink, datesWithoutLink } = useMemo(() => {
    const map = new Map<string, RecallMeeting[]>();
    const withLink = new Set<string>();
    const withoutLink = new Set<string>();
    
    meetings.forEach(meeting => {
      const dateKey = format(new Date(meeting.start_time), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, meeting]);
      
      // Track if this date has meetings with/without links
      if (meeting.meeting_url) {
        withLink.add(dateKey);
      } else {
        withoutLink.add(dateKey);
      }
    });
    
    return {
      meetingsByDate: map,
      datesWithLink: Array.from(withLink).map(dateStr => parse(dateStr, 'yyyy-MM-dd', new Date())),
      datesWithoutLink: Array.from(withoutLink).map(dateStr => parse(dateStr, 'yyyy-MM-dd', new Date())),
    };
  }, [meetings]);

  // Count meetings for selected date
  const selectedDateMeetings = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return meetingsByDate.get(dateKey) || [];
  }, [selectedDate, meetingsByDate]);

  // Count meetings with/without links for selected date
  const { withLinkCount, withoutLinkCount } = useMemo(() => {
    const withLink = selectedDateMeetings.filter(m => m.meeting_url).length;
    const withoutLink = selectedDateMeetings.filter(m => !m.meeting_url).length;
    return { withLinkCount: withLink, withoutLinkCount: withoutLink };
  }, [selectedDateMeetings]);

  return (
    <div className="bg-card rounded-lg border border-border p-2 w-full">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-foreground">Kalender</h3>
          {/* Legend inline with title - larger markers */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/30" />
              <span>Mit Link</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-500 bg-transparent" />
              <span>Ohne</span>
            </div>
          </div>
        </div>
        {selectedDate && selectedDateMeetings.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {format(selectedDate, 'd. MMM', { locale: de })}:
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {selectedDateMeetings.length} {selectedDateMeetings.length === 1 ? 'Termin' : 'Termine'}
            </Badge>
            {withLinkCount > 0 && (
              <span className="text-[10px] text-foreground flex items-center gap-0.5">
                <Video className="h-2.5 w-2.5 text-primary" />
                {withLinkCount}
              </span>
            )}
            {withoutLinkCount > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <VideoOff className="h-2.5 w-2.5 text-amber-500" />
                {withoutLinkCount}
              </span>
            )}
          </div>
        )}
      </div>
      
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onDateSelect}
        locale={de}
        modifiers={{
          hasLinkMeeting: datesWithLink,
          hasNoLinkMeeting: datesWithoutLink,
        }}
        modifiersClassNames={{
          // Mit Link: Gefüllter Punkt mit Ring-Effekt (größer und deutlicher)
          hasLinkMeeting: 'after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-2 after:h-2 after:rounded-full after:bg-primary after:ring-2 after:ring-primary/30',
          // Ohne Link: Umrandeter Punkt, innen transparent (klar unterscheidbar)
          hasNoLinkMeeting: 'before:absolute before:bottom-0.5 before:left-1/2 before:-translate-x-1/2 before:w-2 before:h-2 before:rounded-full before:border-2 before:border-amber-500 before:bg-transparent',
        }}
        className="rounded-md text-xs w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-cell]:flex-1 [&_.rdp-head_th]:text-[10px] [&_.rdp-head_th]:p-1 [&_.rdp-head_th]:flex-1 [&_.rdp-cell]:p-0 [&_.rdp-day]:h-7 [&_.rdp-day]:w-full [&_.rdp-day]:text-[11px] [&_.rdp-day]:relative [&_.rdp-caption]:text-xs [&_.rdp-nav_button]:h-5 [&_.rdp-nav_button]:w-5"
      />
    </div>
  );
};
