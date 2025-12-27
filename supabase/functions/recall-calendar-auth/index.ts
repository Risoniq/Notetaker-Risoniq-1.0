import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RECALL_API_KEY = Deno.env.get('RECALL_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RECALL_API_KEY) {
      throw new Error('RECALL_API_KEY is not configured');
    }

    const body = await req.json();
    // Support both old (user_id) and new (supabase_user_id) parameters
    const { action, supabase_user_id, user_id: legacyUserId, provider, redirect_uri } = body;
    const supabaseUserId = supabase_user_id || null;
    
    console.log('Calendar auth request:', { action, supabase_user_id: supabaseUserId, provider, redirect_uri });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Helper function to get or create Recall user for a Supabase user
    async function getOrCreateRecallUser(supabaseUserId: string): Promise<{ recallUserId: string; isNew: boolean }> {
      // First, check if we already have a Recall user for this Supabase user
      const { data: existingUser, error: fetchError } = await supabase
        .from('recall_calendar_users')
        .select('recall_user_id')
        .eq('supabase_user_id', supabaseUserId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user by supabase_user_id:', fetchError);
      }

      if (existingUser?.recall_user_id) {
        console.log('Found existing Recall user:', existingUser.recall_user_id);
        return { recallUserId: existingUser.recall_user_id, isNew: false };
      }

      // Create a new Recall user using the Supabase user ID as external_id
      // This ensures consistent mapping
      const recallUserId = supabaseUserId;
      
      const { error: insertError } = await supabase
        .from('recall_calendar_users')
        .insert({ 
          recall_user_id: recallUserId,
          supabase_user_id: supabaseUserId,
        });
      
      if (insertError) {
        // If insert fails due to duplicate, try to fetch again
        if (insertError.code === '23505') {
          const { data: retry } = await supabase
            .from('recall_calendar_users')
            .select('recall_user_id')
            .eq('supabase_user_id', supabaseUserId)
            .maybeSingle();
          
          if (retry?.recall_user_id) {
            return { recallUserId: retry.recall_user_id, isNew: false };
          }
        }
        console.error('Error inserting user:', insertError);
        throw new Error('Failed to create calendar user');
      }

      console.log('Created new Recall user:', recallUserId);
      return { recallUserId, isNew: true };
    }

    if (action === 'authenticate') {
      if (!supabaseUserId) {
        throw new Error('supabase_user_id is required for authentication');
      }

      const { recallUserId } = await getOrCreateRecallUser(supabaseUserId);

      // Get authentication token from Recall.ai
      const authResponse = await fetch('https://us-west-2.recall.ai/api/v1/calendar/authenticate/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${RECALL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: recallUserId,
        }),
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error('Recall auth error:', authResponse.status, errorText);
        throw new Error(`Failed to get calendar auth token: ${errorText}`);
      }

      const authData = await authResponse.json();
      console.log('Recall auth response:', authData);

      // Build the OAuth URL
      const recallRegion = 'us-west-2';
      let oauthUrl: string;
      
      if (provider === 'microsoft') {
        const msClientId = (Deno.env.get('MS_OAUTH_CLIENT_ID') || '').trim();
        if (!msClientId) {
          throw new Error('MS_OAUTH_CLIENT_ID is not configured');
        }

        const msScopes = 'offline_access openid email https://graph.microsoft.com/Calendars.Read';
        const msRedirectUri = `https://${recallRegion}.recall.ai/api/v1/calendar/ms_oauth_callback/`;

        const looksLikeGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(msClientId);
        if (!looksLikeGuid) {
          console.error('MS_OAUTH_CLIENT_ID does not look like a GUID:', msClientId);
          throw new Error('Microsoft OAuth Client ID scheint ungültig zu sein (erwartet: Application (client) ID)');
        }
        
        const stateObj = {
          recall_calendar_auth_token: authData.token,
          ms_oauth_redirect_url: msRedirectUri,
          success_url: redirect_uri ? `${redirect_uri}?oauth_success=true&provider=microsoft` : undefined,
          error_url: redirect_uri ? `${redirect_uri}?oauth_error=true&provider=microsoft` : undefined,
        };
        
        oauthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
          `scope=${encodeURIComponent(msScopes)}` +
          `&response_mode=query` +
          `&response_type=code` +
          `&state=${encodeURIComponent(JSON.stringify(stateObj))}` +
          `&redirect_uri=${encodeURIComponent(msRedirectUri)}` +
          `&client_id=${encodeURIComponent(msClientId)}`;
          
        console.log('Microsoft OAuth URL built with state:', stateObj);
      } else {
        const googleScopes = 'https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/userinfo.email';
        const googleRedirectUri = `https://${recallRegion}.recall.ai/api/v1/calendar/google_oauth_callback/`;
        
        const stateObj = {
          recall_calendar_auth_token: authData.token,
          google_oauth_redirect_url: googleRedirectUri,
          success_url: redirect_uri ? `${redirect_uri}?oauth_success=true&provider=google` : undefined,
          error_url: redirect_uri ? `${redirect_uri}?oauth_error=true&provider=google` : undefined,
        };
        
        oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `scope=${encodeURIComponent(googleScopes)}` +
          `&access_type=offline` +
          `&prompt=consent` +
          `&include_granted_scopes=true` +
          `&response_type=code` +
          `&state=${encodeURIComponent(JSON.stringify(stateObj))}` +
          `&redirect_uri=${encodeURIComponent(googleRedirectUri)}` +
          `&client_id=${Deno.env.get('GOOGLE_CLIENT_ID') || ''}`;
          
        console.log('Google OAuth URL built with state:', stateObj);
      }
      
      console.log('Final OAuth URL:', oauthUrl);

      return new Response(
        JSON.stringify({
          success: true,
          user_id: recallUserId,
          oauth_url: oauthUrl,
          token: authData.token,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      if (!supabaseUserId) {
        throw new Error('supabase_user_id is required for status check');
      }

      // Look up the Recall user ID for this Supabase user
      const { data: calendarUser, error: fetchError } = await supabase
        .from('recall_calendar_users')
        .select('recall_user_id, google_connected, microsoft_connected')
        .eq('supabase_user_id', supabaseUserId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user:', fetchError);
      }

      if (!calendarUser?.recall_user_id) {
        console.log('No Recall user found for Supabase user:', supabaseUserId);
        return new Response(
          JSON.stringify({
            success: true,
            connected: false,
            google_connected: false,
            microsoft_connected: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const recallUserId = calendarUser.recall_user_id;

      // Get a fresh auth token for this user
      const authResponse = await fetch('https://us-west-2.recall.ai/api/v1/calendar/authenticate/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${RECALL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: recallUserId,
        }),
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error('Recall auth token error:', authResponse.status, errorText);
        return new Response(
          JSON.stringify({
            success: true,
            connected: false,
            google_connected: false,
            microsoft_connected: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const authData = await authResponse.json();
      console.log('Got auth token for status check');

      // Get user status from Recall.ai
      const userResponse = await fetch(`https://us-west-2.recall.ai/api/v1/calendar/user/?user_id=${recallUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${RECALL_API_KEY}`,
          'x-recallcalendarauthtoken': authData.token,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          return new Response(
            JSON.stringify({
              success: true,
              connected: false,
              google_connected: false,
              microsoft_connected: false,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await userResponse.text();
        console.error('Recall user status error:', userResponse.status, errorText);
        throw new Error(`Failed to get user status: ${errorText}`);
      }

      const userData = await userResponse.json();
      console.log('Recall user data:', userData);

      let googleConnected = false;
      let microsoftConnected = false;
      
      if (userData.connections && Array.isArray(userData.connections)) {
        for (const conn of userData.connections) {
          if (conn.platform === 'google' && conn.connected) {
            googleConnected = true;
          }
          if (conn.platform === 'microsoft' && conn.connected) {
            microsoftConnected = true;
          }
        }
      } else {
        googleConnected = userData.google_calendar_id !== null;
        microsoftConnected = userData.microsoft_calendar_id !== null;
      }

      // Update our database
      const { error: updateError } = await supabase
        .from('recall_calendar_users')
        .update({
          google_connected: googleConnected,
          microsoft_connected: microsoftConnected,
        })
        .eq('supabase_user_id', supabaseUserId);

      if (updateError) {
        console.error('Error updating user status:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          connected: googleConnected || microsoftConnected,
          google_connected: googleConnected,
          microsoft_connected: microsoftConnected,
          user_data: userData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect_provider') {
      if (!supabaseUserId || !provider) {
        throw new Error('supabase_user_id and provider are required for disconnect_provider');
      }

      const { data: userData, error: fetchError } = await supabase
        .from('recall_calendar_users')
        .select('recall_user_id, google_connected, microsoft_connected')
        .eq('supabase_user_id', supabaseUserId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user:', fetchError);
      }

      const updateData = provider === 'google' 
        ? { google_connected: false }
        : { microsoft_connected: false };

      const { error: updateError } = await supabase
        .from('recall_calendar_users')
        .update(updateData)
        .eq('supabase_user_id', supabaseUserId);

      if (updateError) {
        console.error('Error updating user after disconnect:', updateError);
      }

      const stillConnected = provider === 'google' 
        ? userData?.microsoft_connected 
        : userData?.google_connected;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${provider} calendar disconnected`,
          still_connected: stillConnected,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      if (!supabaseUserId) {
        throw new Error('supabase_user_id is required for disconnect');
      }

      const { data: calendarUser } = await supabase
        .from('recall_calendar_users')
        .select('recall_user_id')
        .eq('supabase_user_id', supabaseUserId)
        .maybeSingle();

      if (calendarUser?.recall_user_id) {
        const authResponse = await fetch('https://us-west-2.recall.ai/api/v1/calendar/authenticate/', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${RECALL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: calendarUser.recall_user_id,
          }),
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          
          const disconnectResponse = await fetch(`https://us-west-2.recall.ai/api/v1/calendar/user/?user_id=${calendarUser.recall_user_id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Token ${RECALL_API_KEY}`,
              'x-recallcalendarauthtoken': authData.token,
            },
          });

          if (!disconnectResponse.ok && disconnectResponse.status !== 404) {
            const errorText = await disconnectResponse.text();
            console.error('Recall disconnect error:', disconnectResponse.status, errorText);
          }
        }
      }

      const { error: updateError } = await supabase
        .from('recall_calendar_users')
        .update({
          google_connected: false,
          microsoft_connected: false,
        })
        .eq('supabase_user_id', supabaseUserId);

      if (updateError) {
        console.error('Error updating user after disconnect:', updateError);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Calendar disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    console.error('Calendar auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});