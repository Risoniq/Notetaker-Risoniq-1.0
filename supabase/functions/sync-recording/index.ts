import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Supabase Client & Secrets laden
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const recallApiKey = Deno.env.get('RECALL_API_KEY')
    const recallApiUrl = Deno.env.get('RECALL_API_URL') || 'https://us-west-2.recall.ai/api/v1/bot'

    // 2. ID aus dem Request holen (vom Frontend gesendet)
    const { id } = await req.json()
    console.log(`Sync-Recording aufgerufen für ID: ${id}`)

    // 3. Datenbank-Eintrag holen, um die recall_bot_id zu bekommen
    const { data: recording, error: dbError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (dbError) {
      console.error('DB Fehler:', dbError)
      throw new Error("Datenbankfehler beim Abrufen der Aufnahme.")
    }

    if (!recording) {
      throw new Error("Keine Aufnahme mit dieser ID gefunden.")
    }

    if (!recording.recall_bot_id) {
      throw new Error("Keine Recall Bot ID in der Datenbank gefunden.")
    }

    console.log(`Prüfe Status für Bot: ${recording.recall_bot_id}`)

    // 4. Status bei Recall.ai abfragen
    const response = await fetch(`${recallApiUrl}/${recording.recall_bot_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${recallApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Recall API Fehler:', response.status, response.statusText)
      throw new Error("Fehler beim Abruf von Recall.ai")
    }
    
    const botData = await response.json()
    const status = botData.status
    console.log(`Bot Status: ${status}`)

    // 5. Daten vorbereiten für Update
    const updates: Record<string, unknown> = { status: status }

    // Wenn der Bot fertig ist ('done'), holen wir die Video- und Transkript-URLs
    if (status === 'done') {
      if (botData.video_url) {
        updates.video_url = botData.video_url
      }
      
      // Transkript abrufen
      try {
        const transcriptResponse = await fetch(`${recallApiUrl}/${recording.recall_bot_id}/transcript/`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${recallApiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (transcriptResponse.ok) {
          const transcriptData = await transcriptResponse.json()
          console.log('Transkript abgerufen:', transcriptData.length, 'Einträge')
          
          // Transkript formatieren
          if (Array.isArray(transcriptData) && transcriptData.length > 0) {
            const formattedTranscript = transcriptData
              .map((entry: { speaker?: string; words?: { text?: string }[] }) => {
                const speaker = entry.speaker || 'Unbekannt'
                const text = entry.words?.map(w => w.text).join(' ') || ''
                return `${speaker}: ${text}`
              })
              .join('\n\n')
            
            updates.transcript_text = formattedTranscript
          }
        }
      } catch (transcriptError) {
        console.error('Transkript-Abruf fehlgeschlagen:', transcriptError)
      }
    }

    // 6. Datenbank aktualisieren
    const { error: updateError } = await supabase
      .from('recordings')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      console.error('Update Fehler:', updateError)
      throw new Error("Fehler beim Update der DB")
    }

    console.log('Datenbank aktualisiert:', updates)

    return new Response(JSON.stringify({ status: status, data: botData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('Sync-Recording Fehler:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
