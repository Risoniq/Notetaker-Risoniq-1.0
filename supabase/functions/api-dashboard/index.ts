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
    const keyRecord = await validateApiKey(supabase, apiKey, 'dashboard');
    if (!keyRecord) {
      return new Response(JSON.stringify({ error: 'Invalid or expired API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const includeUsers = url.searchParams.get('include_users') === 'true';
    const includeTeams = url.searchParams.get('include_teams') === 'true';
    const includeSummary = url.searchParams.get('include_summary') !== 'false'; // Default true

    const response: any = {
      success: true,
      exported_at: new Date().toISOString(),
      data: {},
    };

    // Get all users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const allUsers = authUsers?.users || [];

    if (includeSummary) {
      // Get summary statistics
      const { data: recordings } = await supabase
        .from('recordings')
        .select('id, duration, status, user_id, created_at')
        .eq('status', 'done');

      const totalMinutes = recordings?.reduce((sum, r) => sum + Math.ceil((r.duration || 0) / 60), 0) || 0;

      // Active users (with recordings in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activeUsers = new Set(
        recordings?.filter(r => new Date(r.created_at) > sevenDaysAgo).map(r => r.user_id)
      ).size;

      // Online status
      const { data: presence } = await supabase
        .from('user_presence')
        .select('user_id, is_online');
      
      const onlineNow = presence?.filter(p => p.is_online).length || 0;

      // Recording status (pending recordings = bot active)
      const { data: pendingRecordings } = await supabase
        .from('recordings')
        .select('user_id')
        .eq('status', 'recording');

      response.data.summary = {
        total_users: allUsers.length,
        active_users: activeUsers,
        total_recordings: recordings?.length || 0,
        total_minutes: totalMinutes,
        online_now: onlineNow,
        recording_now: pendingRecordings?.length || 0,
      };
    }

    if (includeUsers) {
      // Get user quotas
      const { data: quotas } = await supabase.from('user_quotas').select('*');
      const quotaMap = new Map(quotas?.map(q => [q.user_id, q]) || []);

      // Get recordings per user
      const { data: recordings } = await supabase
        .from('recordings')
        .select('user_id, duration, status, created_at');

      const userRecordings = new Map<string, { count: number; duration: number; last: string }>();
      recordings?.forEach(r => {
        const existing = userRecordings.get(r.user_id) || { count: 0, duration: 0, last: '' };
        if (r.status === 'done') {
          existing.count++;
          existing.duration += r.duration || 0;
        }
        if (!existing.last || r.created_at > existing.last) {
          existing.last = r.created_at;
        }
        userRecordings.set(r.user_id, existing);
      });

      // Get roles
      const { data: roles } = await supabase.from('user_roles').select('*');
      const roleMap = new Map<string, string[]>();
      roles?.forEach(r => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      // Get team memberships
      const { data: teamMembers } = await supabase.from('team_members').select('*, teams(name)');
      const teamMap = new Map(teamMembers?.map(tm => [tm.user_id, { team_id: tm.team_id, team_name: tm.teams?.name, role: tm.role }]) || []);

      response.data.users = allUsers.map(user => {
        const userRoles = roleMap.get(user.id) || [];
        const quota = quotaMap.get(user.id);
        const rec = userRecordings.get(user.id) || { count: 0, duration: 0, last: null };
        const team = teamMap.get(user.id);

        return {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          is_approved: userRoles.includes('approved') || userRoles.includes('admin'),
          is_admin: userRoles.includes('admin'),
          recordings_count: rec.count,
          total_duration_seconds: rec.duration,
          last_activity: rec.last,
          max_minutes: quota?.max_minutes || 120,
          used_minutes: Math.ceil(rec.duration / 60),
          team_id: team?.team_id || null,
          team_name: team?.team_name || null,
          team_role: team?.role || null,
        };
      });
    }

    if (includeTeams) {
      const { data: teams } = await supabase.from('teams').select('*');
      const { data: teamMembers } = await supabase.from('team_members').select('*');

      // Calculate team usage
      const { data: recordings } = await supabase
        .from('recordings')
        .select('user_id, duration, status')
        .eq('status', 'done');

      const userDurations = new Map<string, number>();
      recordings?.forEach(r => {
        const existing = userDurations.get(r.user_id) || 0;
        userDurations.set(r.user_id, existing + (r.duration || 0));
      });

      response.data.teams = teams?.map(team => {
        const members = teamMembers?.filter(tm => tm.team_id === team.id) || [];
        const usedSeconds = members.reduce((sum, m) => sum + (userDurations.get(m.user_id) || 0), 0);
        
        return {
          id: team.id,
          name: team.name,
          max_minutes: team.max_minutes,
          used_minutes: Math.ceil(usedSeconds / 60),
          member_count: members.length,
          created_at: team.created_at,
        };
      });
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API Dashboard error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
