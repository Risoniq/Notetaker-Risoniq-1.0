import { useState, useEffect, useCallback } from 'react';
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

export type CalendarStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useRecallCalendar() {
  const [status, setStatus] = useState<CalendarStatus>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<RecallMeeting[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [preferences, setPreferences] = useState<RecordingPreferences>({
    record_all: true,
    record_only_owned: false,
    record_external: true,
    auto_record: true,
  });

  // Get authenticated user from Supabase
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check connection status when authenticated user is available
  useEffect(() => {
    if (authUser?.id) {
      checkStatus();
    }
  }, [authUser?.id]);

  const checkStatus = useCallback(async () => {
    if (!authUser?.id) return;

    try {
      setIsLoading(true);
      const { data, error: funcError } = await supabase.functions.invoke('recall-calendar-auth', {
        body: { action: 'status', supabase_user_id: authUser.id },
      });

      if (funcError) throw funcError;

      if (data.success) {
        setGoogleConnected(data.google_connected);
        setMicrosoftConnected(data.microsoft_connected);
        
        if (data.google_connected || data.microsoft_connected) {
          setStatus('connected');
          // Fetch meetings when connected
          await fetchMeetings();
        } else {
          setStatus('disconnected');
        }
      }
    } catch (err: any) {
      console.error('Error checking status:', err);
      setError(err.message || 'Fehler beim Prüfen des Status');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.id]);

  // Check for OAuth callback on mount (for redirect flow)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthComplete = urlParams.get('oauth_complete');
    const oauthError = urlParams.get('oauth_error');
    const provider = urlParams.get('provider');
    
    if (oauthComplete === 'true') {
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Show success message
      toast.success(`${provider === 'microsoft' ? 'Microsoft' : 'Google'} Kalender erfolgreich verbunden!`);
      
      // Check status immediately - the OAuth should be complete now
      console.log('[useRecallCalendar] OAuth complete, checking status for user:', authUser?.id);
      
      if (authUser?.id) {
        // Delay slightly to ensure Recall.ai has processed the OAuth
        setTimeout(async () => {
          console.log('[useRecallCalendar] Checking status after OAuth...');
          await checkStatus();
        }, 2000);
      }
    }
    
    if (oauthError === 'true') {
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      toast.error('Kalender-Verbindung fehlgeschlagen. Bitte versuche es erneut.');
    }
  }, [authUser?.id, checkStatus]);

  const connect = useCallback(async (provider: 'google' | 'microsoft' = 'google') => {
    if (!authUser?.id) {
      toast.error('Du musst angemeldet sein, um deinen Kalender zu verbinden.');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('connecting');
      setError(null);

      // Build redirect URI for callback
      const redirectUri = `${window.location.origin}/calendar-callback`;

      const { data, error: funcError } = await supabase.functions.invoke('recall-calendar-auth', {
        body: { 
          action: 'authenticate', 
          supabase_user_id: authUser.id,
          provider, 
          redirect_uri: redirectUri 
        },
      });

      if (funcError) throw funcError;

      if (data.success && data.oauth_url) {
        // For Microsoft: Use redirect flow (popups are often blocked)
        if (provider === 'microsoft') {
          // Store that we're in the middle of connecting
          sessionStorage.setItem('recall_oauth_provider', 'microsoft');
          // Redirect to OAuth URL
          window.location.href = data.oauth_url;
          return;
        }

        // For Google: Try popup first, fallback to redirect
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.oauth_url,
          `recall-calendar-oauth-${provider}`,
          `width=${width},height=${height},left=${left},top=${top},popup=1`
        );

        if (!popup) {
          // Fallback to redirect flow if popup is blocked
          sessionStorage.setItem('recall_oauth_provider', 'google');
          window.location.href = data.oauth_url;
          return;
        }

        // Poll for popup close
        const pollTimer = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            // Check status after popup closes
            await checkStatus();
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollTimer);
          if (!popup?.closed) {
            popup?.close();
          }
          setStatus(googleConnected || microsoftConnected ? 'connected' : 'disconnected');
          setIsLoading(false);
        }, 300000);
      }
    } catch (err: any) {
      console.error('Error connecting:', err);
      setError(err.message || 'Fehler beim Verbinden');
      setStatus('error');
      setIsLoading(false);
    }
  }, [authUser?.id, checkStatus, googleConnected, microsoftConnected]);

  const disconnectProvider = useCallback(async (provider: 'google' | 'microsoft') => {
    if (!authUser?.id) return;

    try {
      setIsLoading(true);
      const { data, error: funcError } = await supabase.functions.invoke('recall-calendar-auth', {
        body: { action: 'disconnect_provider', supabase_user_id: authUser.id, provider },
      });

      if (funcError) throw funcError;

      if (data.success) {
        if (provider === 'google') {
          setGoogleConnected(false);
        } else {
          setMicrosoftConnected(false);
        }
        
        // Check if still connected to any provider
        if (!data.still_connected) {
          setStatus('disconnected');
          setMeetings([]);
        }
        
        toast.success(`${provider === 'google' ? 'Google' : 'Microsoft'} Kalender getrennt`);
      }
    } catch (err: any) {
      console.error('Error disconnecting provider:', err);
      toast.error(`Fehler beim Trennen des ${provider === 'google' ? 'Google' : 'Microsoft'} Kalenders`);
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.id]);

  const disconnectGoogle = useCallback(() => disconnectProvider('google'), [disconnectProvider]);
  const disconnectMicrosoft = useCallback(() => disconnectProvider('microsoft'), [disconnectProvider]);

  const fetchMeetings = useCallback(async () => {
    if (!authUser?.id) return;

    try {
      setIsLoading(true);
      setMeetingsError(null);
      const { data, error: funcError } = await supabase.functions.invoke('recall-calendar-meetings', {
        body: { action: 'list', supabase_user_id: authUser.id },
      });

      if (funcError) throw funcError;

      if (data.success) {
        setMeetings(data.meetings || []);
        setMeetingsError(null);
      } else {
        // Translate error to user-friendly message
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
      console.error('Error fetching meetings:', err);
      // Translate error to user-friendly message
      const errorMsg = err.message || '';
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
        // Update local state
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
      console.error('Error updating meeting:', err);
      toast.error('Fehler beim Aktualisieren des Meetings');
    }
  }, [authUser?.id]);

  const updatePreferences = useCallback(async (newPrefs: Partial<RecordingPreferences>) => {
    if (!authUser?.id) return;

    try {
      const { data, error: funcError } = await supabase.functions.invoke('recall-calendar-meetings', {
        body: { 
          action: 'update_preferences', 
          supabase_user_id: authUser.id, 
          auto_record: newPrefs,
        },
      });

      if (funcError) throw funcError;

      if (data.success) {
        setPreferences(data.preferences);
        toast.success('Einstellungen gespeichert');
      }
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      toast.error('Fehler beim Speichern der Einstellungen');
    }
  }, [authUser?.id]);

  return {
    status,
    isLoading,
    error,
    meetingsError,
    meetings,
    userId: authUser?.id || null,
    googleConnected,
    microsoftConnected,
    preferences,
    connect,
    disconnectGoogle,
    disconnectMicrosoft,
    checkStatus,
    fetchMeetings,
    updateMeetingRecording,
    updatePreferences,
  };
}
