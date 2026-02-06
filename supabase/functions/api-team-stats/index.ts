import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const keyRecord = await validateApiKey(supabase, apiKey, 'team_stats');
    if (!keyRecord) {
      return new Response(JSON.stringify({ error: 'Invalid or expired API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const teamId = url.searchParams.get('team_id');

    // Get teams
    let teamsQuery = supabase.from('teams').select('*');
    if (teamId) {
      teamsQuery = teamsQuery.eq('id', teamId);
    }
    const { data: teams, error: teamsError } = await teamsQuery;

    if (teamsError) {
      console.error('Teams query error:', teamsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch teams' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!teams || teams.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        teams: [],
        exported_at: new Date().toISOString(),
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all team members
    const { data: allTeamMembers } = await supabase.from('team_members').select('*');

    // Get all recordings
    const { data: allRecordings } = await supabase
      .from('recordings')
      .select('user_id, duration, status, created_at, title')
      .eq('status', 'done');

    // Get user emails
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userMap = new Map(authUsers?.users.map(u => [u.id, u.email]) || []);

    // Build team stats
    const teamStats = teams.map(team => {
      const members = allTeamMembers?.filter(tm => tm.team_id === team.id) || [];
      const memberUserIds = new Set(members.map(m => m.user_id));
      
      const teamRecordings = allRecordings?.filter(r => memberUserIds.has(r.user_id)) || [];
      const totalSeconds = teamRecordings.reduce((sum, r) => sum + (r.duration || 0), 0);
      
      // Calculate per-member stats
      const memberStats = members.map(member => {
        const memberRecordings = teamRecordings.filter(r => r.user_id === member.user_id);
        const memberSeconds = memberRecordings.reduce((sum, r) => sum + (r.duration || 0), 0);
        
        return {
          user_id: member.user_id,
          email: userMap.get(member.user_id) || 'unknown',
          role: member.role,
          recordings_count: memberRecordings.length,
          used_minutes: Math.ceil(memberSeconds / 60),
          last_recording: memberRecordings.length > 0 
            ? memberRecordings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : null,
        };
      });

      // Recent recordings (last 10)
      const recentRecordings = teamRecordings
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(r => ({
          user_email: userMap.get(r.user_id) || 'unknown',
          title: r.title,
          duration_seconds: r.duration,
          created_at: r.created_at,
        }));

      return {
        team: {
          id: team.id,
          name: team.name,
          max_minutes: team.max_minutes,
          used_minutes: Math.ceil(totalSeconds / 60),
          quota_percentage: team.max_minutes > 0 ? Math.round((totalSeconds / 60 / team.max_minutes) * 100) : 0,
          created_at: team.created_at,
        },
        members: memberStats,
        recordings_summary: {
          total_count: teamRecordings.length,
          total_minutes: Math.ceil(totalSeconds / 60),
          recent: recentRecordings,
        },
      };
    });

    return new Response(JSON.stringify({
      success: true,
      teams: teamStats,
      exported_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API Team Stats error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
