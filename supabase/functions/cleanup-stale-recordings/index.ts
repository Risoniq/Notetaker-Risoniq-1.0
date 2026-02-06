import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Berechne den Zeitpunkt vor 4 Stunden
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    // Finde und aktualisiere alle veralteten Aufnahmen mit aktivem Status
    const { data, error } = await supabase
      .from("recordings")
      .update({ 
        status: "timeout",
        updated_at: new Date().toISOString()
      })
      .in("status", ["pending", "joining", "recording"])
      .lt("created_at", fourHoursAgo)
      .select("id, meeting_id, status, created_at");

    if (error) {
      console.error("Error updating stale recordings:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updated ${data?.length || 0} stale recordings to timeout status`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated_count: data?.length || 0,
        updated_recordings: data 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
