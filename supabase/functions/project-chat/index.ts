import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, messages } = await req.json();

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Projekt nicht gefunden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load assigned recordings via project_recordings join
    const { data: projectRecordings } = await supabase
      .from("project_recordings")
      .select("recording_id")
      .eq("project_id", projectId);

    const recordingIds = (projectRecordings || []).map((pr: any) => pr.recording_id);

    let meetingContext = "Keine Meetings zugeordnet.";
    if (recordingIds.length > 0) {
      const { data: recordings } = await supabase
        .from("recordings")
        .select("title, created_at, duration, summary, key_points, action_items, transcript_text")
        .in("id", recordingIds)
        .order("created_at", { ascending: false });

      if (recordings && recordings.length > 0) {
        meetingContext = recordings.map((r: any, i: number) => {
          const date = new Date(r.created_at).toLocaleDateString("de-DE");
          const duration = r.duration ? Math.round(r.duration / 60) : 0;
          const keyPoints = r.key_points?.join(", ") || "Keine";
          const actionItems = r.action_items?.join(", ") || "Keine";
          const transcriptExcerpt = r.transcript_text
            ? r.transcript_text.substring(0, 800) + "..."
            : "Kein Transkript";

          return `Meeting ${i + 1}: "${r.title || "Unbenannt"}"
- Datum: ${date}
- Dauer: ${duration} Minuten
- Zusammenfassung: ${r.summary || "Keine"}
- Key Points: ${keyPoints}
- Action Items: ${actionItems}
- Transkript-Auszug: ${transcriptExcerpt}`;
        }).join("\n---\n");
      }
    }

    // Build analysis context
    const analysis = project.analysis as any;
    let analysisContext = "Keine KI-Analyse vorhanden.";
    if (analysis) {
      const parts = [];
      if (analysis.summary) parts.push(`Zusammenfassung: ${analysis.summary}`);
      if (analysis.progress) parts.push(`Fortschritt: ${analysis.progress}`);
      if (analysis.recommendations?.length) parts.push(`Empfehlungen: ${analysis.recommendations.join("; ")}`);
      if (analysis.openTopics?.length) parts.push(`Offene Themen: ${analysis.openTopics.join(", ")}`);
      if (analysis.completedTopics?.length) parts.push(`Erledigte Themen: ${analysis.completedTopics.join(", ")}`);
      if (parts.length > 0) analysisContext = parts.join("\n");
    }

    const systemPrompt = `Du bist ein strategischer Projektmanagement-Berater. Du analysierst Projekte ganzheitlich und gibst konkrete, umsetzbare Empfehlungen. Du hast Zugriff auf alle Meetings, Analysen und den aktuellen Projektstatus.

DEINE KERNKOMPETENZEN:
1. Strategische Bewertung: Projektfortschritt, Risiken, Engpaesse identifizieren
2. Potentialanalyse: Ungenutzte Chancen und Synergien zwischen Themen aufdecken
3. Priorisierung: Welche Themen Aufmerksamkeit brauchen, was zurueckgestellt werden kann
4. Stakeholder-Dynamik: Wer treibt welche Themen, wo fehlt Verantwortung
5. Handlungsempfehlungen: Konkrete naechste Schritte mit Begruendung

REGELN:
- Antworte auf Deutsch, kurz und praegnant
- Keine Markdown-Sternchen, normaler Fliesstext
- Bei Aufzaehlungen: Nummeriert, neue Zeile pro Punkt
- Beziehe dich immer auf konkrete Daten aus den Meetings
- Stelle Rueckfragen wenn die Anfrage zu vage ist
- Denke in Zusammenhaengen: Wie haengen verschiedene Meeting-Themen zusammen?
- Bewerte kritisch: Nicht nur zusammenfassen, sondern Luecken und Risiken benennen

PROJEKTINFORMATIONEN:
- Name: ${project.name}
- Beschreibung: ${project.description || "Keine"}
- Status: ${project.status}

KI-ANALYSE:
${analysisContext}

ZUGEORDNETE MEETINGS (${recordingIds.length}):
${meetingContext}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("project-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
