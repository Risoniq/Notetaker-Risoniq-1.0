import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify calling user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if calling user is admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent admin from deleting themselves
    if (user_id === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Admin ${user.email} is deleting user ${user_id}`);

    // Delete all related data (order matters for foreign keys)
    
    // 1. Delete transcript backups from storage
    const { data: storageFiles } = await adminClient.storage
      .from('transcript-backups')
      .list(user_id);
    
    if (storageFiles && storageFiles.length > 0) {
      const filePaths = storageFiles.map(f => `${user_id}/${f.name}`);
      await adminClient.storage.from('transcript-backups').remove(filePaths);
      console.log(`Deleted ${filePaths.length} transcript backups`);
    }

    // 2. Delete bot avatars from storage
    const { data: avatarFiles } = await adminClient.storage
      .from('bot-avatars')
      .list(user_id);
    
    if (avatarFiles && avatarFiles.length > 0) {
      const avatarPaths = avatarFiles.map(f => `${user_id}/${f.name}`);
      await adminClient.storage.from('bot-avatars').remove(avatarPaths);
      console.log(`Deleted ${avatarPaths.length} bot avatars`);
    }

    // 3. Delete recordings
    const { error: recordingsError } = await adminClient
      .from('recordings')
      .delete()
      .eq('user_id', user_id);
    
    if (recordingsError) {
      console.error('Error deleting recordings:', recordingsError);
    }

    // 4. Delete calendar connections
    const { error: calendarError } = await adminClient
      .from('recall_calendar_users')
      .delete()
      .eq('supabase_user_id', user_id);
    
    if (calendarError) {
      console.error('Error deleting calendar connections:', calendarError);
    }

    // 5. Delete user presence
    const { error: presenceError } = await adminClient
      .from('user_presence')
      .delete()
      .eq('user_id', user_id);
    
    if (presenceError) {
      console.error('Error deleting user presence:', presenceError);
    }

    // 6. Delete user roles
    const { error: rolesError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);
    
    if (rolesError) {
      console.error('Error deleting user roles:', rolesError);
    }

    // 7. Finally, delete the auth user
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user_id);
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return new Response(JSON.stringify({ error: 'Failed to delete user account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully deleted user ${user_id}`);

    return new Response(JSON.stringify({ success: true, message: 'User deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in admin-delete-user:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
