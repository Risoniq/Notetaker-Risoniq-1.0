import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// SHA-256 hash function
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate API key and check permissions
async function validateApiKey(supabase: any, apiKey: string, permission: string) {
  const keyHash = await sha256(apiKey);
  
  const { data: keyRecord, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error || !keyRecord) return null;
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) return null;
  if (!keyRecord.permissions[permission]) return null;
  
  // Update last used
  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRecord.id);
  
  return keyRecord;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const keyRecord = await validateApiKey(supabase, apiKey, 'transcripts');
    if (!keyRecord) {
      return new Response(JSON.stringify({ error: 'Invalid or expired API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const userId = url.searchParams.get('user_id');
    const teamId = url.searchParams.get('team_id');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const status = url.searchParams.get('status') || 'done';
    const includeAnalysis = url.searchParams.get('include_analysis') === 'true';

    // Build query
    let query = supabase
      .from('recordings')
      .select(`
        id,
        user_id,
        title,
        summary,
        key_points,
        action_items,
        transcript_text,
        transcript_url,
        participants,
        calendar_attendees,
        duration,
        word_count,
        status,
        meeting_url,
        video_url,
        created_at,
        updated_at
      `)
      .eq('status', status)
      .not('transcript_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 500)); // Max 500

    if (since) {
      query = query.gte('created_at', since);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // If team_id is specified, get all team member user_ids
    if (teamId) {
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);
      
      if (teamMembers && teamMembers.length > 0) {
        const userIds = teamMembers.map(tm => tm.user_id);
        query = query.in('user_id', userIds);
      } else {
        // No members in team, return empty
        return new Response(JSON.stringify({
          success: true,
          count: 0,
          transcripts: [],
          exported_at: new Date().toISOString(),
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: recordings, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch transcripts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user emails
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userMap = new Map(authUsers?.users.map(u => [u.id, u.email]) || []);

    // Format response
    const transcripts = recordings?.map(rec => {
      const result: any = {
        ...rec,
        user_email: userMap.get(rec.user_id) || null,
      };

      // If analysis is not requested, omit heavy fields
      if (!includeAnalysis) {
        delete result.summary;
        delete result.key_points;
        delete result.action_items;
      }

      return result;
    }) || [];

    return new Response(JSON.stringify({
      success: true,
      count: transcripts.length,
      transcripts,
      exported_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API Transcripts error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
