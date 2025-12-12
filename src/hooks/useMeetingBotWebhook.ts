import { useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CalendarEvent } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';

export const useMeetingBotWebhook = () => {
  const { toast } = useToast();
  const triggeredWebhooks = useRef<Set<string>>(new Set());

  const triggerBotWebhook = useCallback(async (event: CalendarEvent) => {
    // Prevent duplicate webhook calls for the same meeting
    if (triggeredWebhooks.current.has(event.id)) {
      console.log('Webhook already triggered for meeting:', event.id);
      return;
    }

    triggeredWebhooks.current.add(event.id);

    const meetingUrl = event.meetingUrl || event.hangoutLink || null;

    const payload = {
      meeting_id: event.id,
      meeting_url: meetingUrl,
      title: event.summary,
      start_time: event.start,
      end_time: event.end,
      attendees: event.attendees || [],
      triggered_at: new Date().toISOString(),
    };

    console.log('Triggering meeting bot webhook:', payload);

    try {
      const { data, error } = await supabase.functions.invoke('meeting-bot-webhook', {
        body: payload,
      });

      if (error) {
        throw error;
      }

      console.log('Webhook response:', data);
      
      toast({
        title: "Bot benachrichtigt",
        description: `Meeting-Bot wurde für "${event.summary}" aktiviert`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Failed to trigger webhook:', error);
      
      // Remove from triggered set so it can be retried
      triggeredWebhooks.current.delete(event.id);
      
      toast({
        title: "Webhook-Fehler",
        description: "Meeting-Bot konnte nicht benachrichtigt werden",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [toast]);

  // Clean up triggered webhooks for events that no longer exist
  const cleanupWebhooks = useCallback((currentEventIds: string[]) => {
    const currentIds = new Set(currentEventIds);
    triggeredWebhooks.current = new Set(
      [...triggeredWebhooks.current].filter(id => currentIds.has(id))
    );
  }, []);

  return {
    triggerBotWebhook,
    cleanupWebhooks,
  };
};
