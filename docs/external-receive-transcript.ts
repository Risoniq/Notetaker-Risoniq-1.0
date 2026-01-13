/**
 * EXTERNE SUPABASE FUNCTION (iabhybjxxlesojqxewpn)
 * 
 * Diese Function empfängt Daten von bulk-export-recordings und
 * speichert sie in der normalisierten Struktur:
 * meetings -> recordings -> transcript_segments
 * 
 * Deployment: Kopiere diesen Code nach supabase/functions/receive-transcript/index.ts
 * in deinem externen Supabase-Projekt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Hilfsfunktion: Zeitstring zu Sekunden konvertieren
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}

// Hilfsfunktion: Transcript-Text in Segmente aufteilen
function parseTranscriptToSegments(text: string): Array<{
  speaker: string
  text: string
  start_time: number
  end_time: number
}> {
  if (!text || text.trim() === '') return []

  const segments: Array<{
    speaker: string
    text: string
    start_time: number
    end_time: number
  }> = []

  // Format 1: "[Speaker Name] (00:00:00 - 00:00:30): Text..."
  const regexWithTime = /\[([^\]]+)\]\s*\((\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)\):\s*(.+?)(?=\[|$)/gs

  // Format 2: "[Speaker Name]: Text..." (ohne Zeitstempel)
  const regexSimple = /\[([^\]]+)\]:\s*(.+?)(?=\[|$)/gs

  let match
  let hasTimeFormat = false

  // Erst mit Zeitstempeln versuchen
  while ((match = regexWithTime.exec(text)) !== null) {
    hasTimeFormat = true
    segments.push({
      speaker: match[1].trim(),
      start_time: parseTimeToSeconds(match[2]),
      end_time: parseTimeToSeconds(match[3]),
      text: match[4].trim(),
    })
  }

  // Falls keine Zeitstempel, einfaches Format verwenden
  if (!hasTimeFormat) {
    let segmentIndex = 0
    while ((match = regexSimple.exec(text)) !== null) {
      segments.push({
        speaker: match[1].trim(),
        start_time: segmentIndex * 30, // Geschätzte 30 Sekunden pro Segment
        end_time: (segmentIndex + 1) * 30,
        text: match[2].trim(),
      })
      segmentIndex++
    }
  }

  // Falls kein Format erkannt, gesamten Text als ein Segment
  if (segments.length === 0 && text.trim()) {
    segments.push({
      speaker: 'Unbekannt',
      start_time: 0,
      end_time: 0,
      text: text.trim(),
    })
  }

  return segments
}

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Secret-basierte Authentifizierung
    const exportSecret = Deno.env.get('TRANSCRIPT_EXPORT_SECRET')
    const providedSecret = req.headers.get('x-export-secret') ?? ''

    if (!exportSecret || providedSecret !== exportSecret) {
      console.error('Unauthorized: Invalid or missing x-export-secret')
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Body parsen
    const body = await req.json()
    console.log('Empfangene Daten:', {
      recording_id: body.recording_id,
      user_id: body.user_id,
      title: body.title,
      hasTranscript: !!body.transcript_text,
    })

    // Supabase Client mit Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Meeting erstellen/aktualisieren
    const meetingData = {
      id: body.recording_id, // Verwende recording_id als meeting_id für Mapping
      user_id: body.user_id,
      meeting_url: body.meeting_url || '',
      bot_name: 'Meeting Notetaker',
      recall_bot_id: body.recall_bot_id || null,
      status: body.status || 'done',
      created_at: body.created_at,
      ended_at: body.updated_at,
    }

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .upsert(meetingData, { onConflict: 'id' })
      .select()
      .single()

    if (meetingError) {
      console.error('Fehler beim Speichern des Meetings:', meetingError)
      return new Response(JSON.stringify({ 
        error: 'meeting_insert_failed', 
        details: meetingError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Meeting gespeichert:', meeting.id)

    // 2. Recording erstellen/aktualisieren
    const recordingData = {
      meeting_id: meeting.id,
      recall_recording_id: body.recording_id,
      video_url: body.video_url || null,
      transcript_url: body.transcript_url || null,
      duration: body.duration || null,
      created_at: body.created_at,
    }

    // Prüfen ob Recording bereits existiert
    const { data: existingRecording } = await supabase
      .from('recordings')
      .select('id')
      .eq('recall_recording_id', body.recording_id)
      .single()

    let recording
    if (existingRecording) {
      // Update
      const { data: updated, error: updateError } = await supabase
        .from('recordings')
        .update(recordingData)
        .eq('id', existingRecording.id)
        .select()
        .single()

      if (updateError) {
        console.error('Fehler beim Aktualisieren des Recordings:', updateError)
        return new Response(JSON.stringify({ 
          error: 'recording_update_failed', 
          details: updateError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      recording = updated
    } else {
      // Insert
      const { data: inserted, error: insertError } = await supabase
        .from('recordings')
        .insert(recordingData)
        .select()
        .single()

      if (insertError) {
        console.error('Fehler beim Erstellen des Recordings:', insertError)
        return new Response(JSON.stringify({ 
          error: 'recording_insert_failed', 
          details: insertError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      recording = inserted
    }

    console.log('Recording gespeichert:', recording.id)

    // 3. Transcript in Segmente aufteilen und speichern
    let segmentCount = 0
    if (body.transcript_text) {
      // Alte Segmente löschen
      await supabase
        .from('transcript_segments')
        .delete()
        .eq('recording_id', recording.id)

      // Neue Segmente parsen und einfügen
      const segments = parseTranscriptToSegments(body.transcript_text)
      
      if (segments.length > 0) {
        const segmentData = segments.map(s => ({
          recording_id: recording.id,
          speaker: s.speaker,
          text: s.text,
          start_time: s.start_time,
          end_time: s.end_time,
        }))

        const { error: segmentError } = await supabase
          .from('transcript_segments')
          .insert(segmentData)

        if (segmentError) {
          console.error('Fehler beim Speichern der Segmente:', segmentError)
          // Nicht abbrechen, nur loggen
        } else {
          segmentCount = segments.length
          console.log(`${segmentCount} Transkript-Segmente gespeichert`)
        }
      }
    }

    // Erfolg
    return new Response(JSON.stringify({
      success: true,
      meeting_id: meeting.id,
      recording_id: recording.id,
      segments_created: segmentCount,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Unerwarteter Fehler:', error)
    return new Response(JSON.stringify({ 
      error: 'internal_error', 
      message: String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
