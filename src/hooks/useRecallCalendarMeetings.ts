import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

export interface RecallMeeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_url: string | null;
  platform: string | null;
  bot_id: string | null;
  will_record: boolean;
  will_record_reason: string | null;
  override_should_record: boolean | null;
  attendees: { email: string; name?: string }[];
  organizer: string | null;
  is_organizer: boolean;
}

export interface RecordingPreferences {
  record_all: boolean;
  record_only_owned: boolean;
  record_external: boolean;
  auto_record: boolean;
}

const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds

export function useRecallCalendarMeetings() {
  const [isLoading, setIsLoading] = useState(false);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<RecallMeeting[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [preferences, setPreferences] = useState<RecordingPreferences>({
    record_all: true,
    record_only_owned: false,
    record_external: true,
    auto_record: true,
  });
  
  const lastFetchRef = useRef<number>(0);
  const pendingFetchRef = useRef<boolean>(false);

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setAuthUser(newUser);
      
      // Clear meetings when user logs out to prevent stale data/errors
      if (event === 'SIGNED_OUT' || !newUser) {
        setMeetings([]);
        setMeetingsError(null);
        pendingFetchRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMeetings = useCallback(async () => {
    // If authUser not ready, mark pending and return
    if (!authUser?.id) {
      pendingFetchRef.current = true;
      console.log('[useRecallCalendarMeetings] fetchMeetings called but authUser not ready, marking pending');
      return;
    }

    try {
      setIsLoading(true);
      setMeetingsError(null);
      console.log('[useRecallCalendarMeetings] Fetching meetings for user:', authUser.id);
      const { data, error: funcError } = await supabase.functions.invoke('recall-calendar-meetings', {
        body: { action: 'list', supabase_user_id: authUser.id },
      });

      if (funcError) throw funcError;

      if (data.success) {
        console.log('[useRecallCalendarMeetings] Loaded meetings:', data.meetings?.length || 0);
        setMeetings(data.meetings || []);
        setMeetingsError(null);
      } else {
        const errorMsg = data.error || '';
        let friendlyError = 'Meetings konnten nicht geladen werden.';

        if (errorMsg.includes('not_authenticated') || errorMsg.includes('credentials')) {
          friendlyError = 'Die Kalender-Verbindung muss möglicherweise erneuert werden.';
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          friendlyError = 'Verbindung zum Server fehlgeschlagen.';
        }

        setMeetingsError(friendlyError);
      }
    } catch (err: any) {
      console.error('[useRecallCalendarMeetings] Error fetching meetings:', err);
      const errorMsg = err.message || '';
      
      // Handle 401 Unauthorized - user session expired/invalid
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        // Don't show error, just clear state - user needs to re-authenticate
        setMeetings([]);
        setMeetingsError(null);
        return;
      }
      
      let friendlyError = 'Meetings konnten nicht geladen werden.';

      if (errorMsg.includes('not_authenticated') || errorMsg.includes('credentials')) {
        friendlyError = 'Die Kalender-Verbindung muss möglicherweise erneuert werden.';
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        friendlyError = 'Verbindung zum Server fehlgeschlagen.';
      }

      setMeetingsError(friendlyError);
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.id]);

  // Execute pending fetch when authUser becomes available
  useEffect(() => {
    if (authUser?.id && pendingFetchRef.current) {
      console.log('[useRecallCalendarMeetings] authUser now available, executing pending fetch');
      pendingFetchRef.current = false;
      fetchMeetings();
    }
  }, [authUser?.id, fetchMeetings]);

  const updateMeetingRecording = useCallback(async (meetingId: string, shouldRecord: boolean) => {
    if (!authUser?.id) return;

    try {
      const { data, error: funcError } = await supabase.functions.invoke('recall-calendar-meetings', {
        body: { 
          action: 'update_recording', 
          supabase_user_id: authUser.id, 
          meeting_id: meetingId,
          auto_record: shouldRecord,
        },
      });

      if (funcError) throw funcError;

      if (data.success) {
        setMeetings(prev => 
          prev.map(m => 
            m.id === meetingId 
              ? { ...m, override_should_record: shouldRecord, will_record: shouldRecord }
              : m
          )
        );
        toast.success(shouldRecord ? 'Aufnahme aktiviert' : 'Aufnahme deaktiviert');
      }
    } catch (err: any) {
      console.error('[useRecallCalendarMeetings] Error updating meeting:', err);
      toast.error('Fehler beim Aktualisieren des Meetings');
    }
  }, [authUser?.id]);

  const updatePreferences = useCallback(async (newPrefs: Partial<RecordingPreferences>) => {
    if (!authUser?.id) return;

    try {
      const mergedPrefs = { ...preferences, ...newPrefs };
      
      const { data, error: funcError } = await supabase.functions.invoke('recall-calendar-meetings', {
        body: { 
          action: 'update_preferences', 
          supabase_user_id: authUser.id, 
          preferences: mergedPrefs,
        },
      });

      if (funcError) throw funcError;

      if (data.success) {
        setPreferences(mergedPrefs);
        toast.success('Einstellungen gespeichert');
      }
    } catch (err: any) {
      console.error('[useRecallCalendarMeetings] Error updating preferences:', err);
      toast.error('Fehler beim Speichern der Einstellungen');
    }
  }, [authUser?.id, preferences]);

  const initPreferences = useCallback(async () => {
    if (!authUser?.id) return false;

    try {
      const { data, error: funcError } = await supabase.functions.invoke('recall-calendar-meetings', {
        body: { 
          action: 'init_preferences', 
          supabase_user_id: authUser.id,
        },
      });

      if (funcError) throw funcError;

      if (data.success) {
        setPreferences(data.preferences);
        toast.success('Aufnahme-Einstellungen aktiviert');
        return true;
      } else {
        toast.error(data.message || 'Fehler beim Aktivieren');
        return false;
      }
    } catch (err: any) {
      console.error('[useRecallCalendarMeetings] Error initializing preferences:', err);
      toast.error('Fehler beim Aktivieren der Aufnahme-Einstellungen');
      return false;
    }
  }, [authUser?.id]);

  // Auto-refresh meetings every 15 seconds
  useEffect(() => {
    if (!authUser?.id || !autoRefreshEnabled) return;

    console.log('[useRecallCalendarMeetings] Setting up auto-refresh interval (15s)');
    
    const intervalId = setInterval(() => {
      const now = Date.now();
      // Prevent fetching more often than every 10 seconds (debounce)
      if (now - lastFetchRef.current < 10000) {
        return;
      }
      
      console.log('[useRecallCalendarMeetings] Auto-refresh triggered');
      lastFetchRef.current = now;
      fetchMeetings();
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      console.log('[useRecallCalendarMeetings] Cleaning up auto-refresh interval');
      clearInterval(intervalId);
    };
  }, [authUser?.id, autoRefreshEnabled, fetchMeetings]);

  return {
    isLoading,
    meetingsError,
    meetings,
    preferences,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    fetchMeetings,
    updateMeetingRecording,
    updatePreferences,
    initPreferences,
  };
}
