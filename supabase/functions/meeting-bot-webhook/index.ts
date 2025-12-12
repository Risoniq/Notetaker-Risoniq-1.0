/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MeetingWebhookPayload {
  meeting_id: string;
  meeting_url: string | null;
  title: string;
  start_time: string;
  end_time: string;
  attendees: Array<{ email: string; displayName?: string }>;
  triggered_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload: MeetingWebhookPayload = await req.json();

    // Validate required fields
    if (!payload.meeting_id || !payload.title || !payload.start_time) {
      console.error('Missing required fields in webhook payload:', payload);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: meeting_id, title, start_time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== MEETING BOT WEBHOOK RECEIVED ===');
    console.log('Meeting ID:', payload.meeting_id);
    console.log('Title:', payload.title);
    console.log('Meeting URL:', payload.meeting_url || 'No URL provided');
    console.log('Start Time:', payload.start_time);
    console.log('End Time:', payload.end_time);
    console.log('Attendees:', JSON.stringify(payload.attendees));
    console.log('Triggered At:', payload.triggered_at);
    console.log('=====================================');

    // TODO: Here you would forward to external bot service (Recall.ai, Skribby, etc.)
    // Example:
    // const botResponse = await fetch('https://api.recall.ai/v1/bot', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${Deno.env.get('RECALL_API_KEY')}` },
    //   body: JSON.stringify({ meeting_url: payload.meeting_url })
    // });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received successfully',
        meeting_id: payload.meeting_id,
        received_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Failed to process webhook', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
