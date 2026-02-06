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
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user is admin
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { 
      action, // 'create', 'update', 'delete', 'test'
      webhook_id,
      api_key_id,
      name,
      webhook_url,
      frequency,
      schedule_time,
      schedule_day,
      threshold_type,
      threshold_value,
      report_type,
      is_active,
    } = body;

    if (action === 'delete') {
      if (!webhook_id) {
        return new Response(JSON.stringify({ error: 'webhook_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('webhook_configs')
        .delete()
        .eq('id', webhook_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: 'Webhook deleted' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'test') {
      if (!webhook_url) {
        return new Response(JSON.stringify({ error: 'webhook_url required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Send test webhook
      try {
        const testPayload = {
          type: 'test',
          message: 'Dies ist ein Test-Webhook vom Notetaker Dashboard',
          timestamp: new Date().toISOString(),
          data: {
            sample: 'Beispieldaten werden hier angezeigt',
          },
        };

        const response = await fetch(webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload),
        });

        if (!response.ok) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Webhook returned ${response.status}: ${response.statusText}` 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Test-Webhook erfolgreich gesendet' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Fehler beim Senden: ${err.message}` 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'create') {
      if (!api_key_id || !name || !webhook_url) {
        return new Response(JSON.stringify({ error: 'api_key_id, name, and webhook_url required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('webhook_configs')
        .insert({
          api_key_id,
          name,
          webhook_url,
          frequency: frequency || 'manual',
          schedule_time: schedule_time || null,
          schedule_day: schedule_day ?? null,
          threshold_type: threshold_type || null,
          threshold_value: threshold_value || null,
          report_type: report_type || 'dashboard',
          is_active: is_active !== false,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, webhook: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      if (!webhook_id) {
        return new Response(JSON.stringify({ error: 'webhook_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (webhook_url !== undefined) updateData.webhook_url = webhook_url;
      if (frequency !== undefined) updateData.frequency = frequency;
      if (schedule_time !== undefined) updateData.schedule_time = schedule_time;
      if (schedule_day !== undefined) updateData.schedule_day = schedule_day;
      if (threshold_type !== undefined) updateData.threshold_type = threshold_type;
      if (threshold_value !== undefined) updateData.threshold_value = threshold_value;
      if (report_type !== undefined) updateData.report_type = report_type;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabase
        .from('webhook_configs')
        .update(updateData)
        .eq('id', webhook_id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, webhook: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Webhook config error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
