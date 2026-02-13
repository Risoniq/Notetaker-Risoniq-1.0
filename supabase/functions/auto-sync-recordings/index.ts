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

    // Finde alle Recordings die in einem aktiven Status hängen (max 4 Stunden alt)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: stuckRecordings, error: queryError } = await supabase
      .from("recordings")
      .select("id, meeting_id, status, recall_bot_id, created_at")
      .in("status", ["pending", "joining", "recording", "processing", "transcribing"])
      .gt("created_at", fourHoursAgo)
      .lt("created_at", fiveMinutesAgo) // Mindestens 5 Minuten alt
      .not("recall_bot_id", "is", null) // Nur Recordings mit Bot-ID
      .order("created_at", { ascending: true })
      .limit(20);

    if (queryError) {
      console.error("Fehler beim Laden der Recordings:", queryError);
      return new Response(
        JSON.stringify({ success: false, error: queryError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!stuckRecordings || stuckRecordings.length === 0) {
      console.log("Keine hängenden Recordings gefunden.");
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: "Keine hängenden Recordings" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${stuckRecordings.length} hängende Recordings gefunden:`, 
      stuckRecordings.map(r => `${r.id} (${r.status}, bot: ${r.recall_bot_id})`));

    const results: { id: string; status: string; result: string }[] = [];

    // Für jedes Recording sync-recording aufrufen
    for (const recording of stuckRecordings) {
      try {
        console.log(`Sync starten für Recording ${recording.id} (Status: ${recording.status})...`);

        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-recording`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ id: recording.id }),
        });

        const syncResult = await syncResponse.json();
        const resultStatus = syncResponse.ok ? "success" : "error";
        
        console.log(`Sync-Ergebnis für ${recording.id}: ${resultStatus}`, 
          JSON.stringify(syncResult).substring(0, 200));

        results.push({
          id: recording.id,
          status: recording.status,
          result: resultStatus,
        });
      } catch (syncError) {
        console.error(`Sync fehlgeschlagen für ${recording.id}:`, syncError);
        results.push({
          id: recording.id,
          status: recording.status,
          result: `error: ${syncError instanceof Error ? syncError.message : String(syncError)}`,
        });
      }
    }

    const successCount = results.filter(r => r.result === "success").length;
    console.log(`Auto-Sync abgeschlossen: ${successCount}/${results.length} erfolgreich`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: results.length,
        successful: successCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unerwarteter Fehler:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
