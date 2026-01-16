/**
 * ============================================
 * EXTERNE EDGE FUNCTION FÜR DEIN SUPABASE-PROJEKT
 * ============================================
 * 
 * Diese Datei muss in deinem EXTERNEN Supabase-Projekt deployed werden.
 * Erstelle dort: supabase/functions/receive-transcript/index.ts
 * 
 * SETUP:
 * 1. Storage-Bucket "transcripts" erstellen (private)
 * 2. Secret TRANSCRIPT_EXPORT_SECRET setzen (gleicher Wert wie in Lovable Cloud)
 * 3. Deployen mit: supabase functions deploy receive-transcript --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ExportPayload {
  recording_id: string
  user_id: string
  title: string
  safe_title?: string  // Bereits sanitierter Titel für Dateiname
  transcript_txt: string  // Formatierter TXT-Content mit Header
  transcript_text?: string  // Alternative Key für Kompatibilität
  created_at: string
  duration: number | null
  metadata?: {
    summary: string | null
    key_points: string[]
    action_items: string[]
    participants: { id: string; name: string }[]
    word_count: number | null
    video_url: string | null
  }
}

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Secret-basierte Authentifizierung
    const exportSecret = Deno.env.get('TRANSCRIPT_EXPORT_SECRET')
    const providedSecret = req.headers.get('x-export-secret') ?? ''

    if (!exportSecret || providedSecret !== exportSecret) {
      console.error('Unauthorized: Invalid or missing x-export-secret header')
      return new Response(
        JSON.stringify({ error: 'unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Request Body parsen
    const payload: ExportPayload = await req.json()
    const { recording_id, user_id, title, safe_title, transcript_txt, transcript_text, created_at, duration, metadata } = payload

    // Nutze transcript_txt oder transcript_text (Kompatibilität)
    const transcriptContent = transcript_txt || transcript_text || ''

    console.log(`Empfange Transkript für Recording: ${recording_id}`)

    // 3. Validierung
    if (!transcriptContent || !recording_id) {
      return new Response(
        JSON.stringify({ error: 'missing required fields: recording_id and transcript_txt/transcript_text' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Supabase Client initialisieren
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 5. Dateiname generieren - WICHTIG: safe_title verwenden wenn vorhanden!
    const timestamp = Date.now()
    // Nutze safe_title aus dem Payload, oder sanitiere den title selbst
    const sanitizedTitle = safe_title || (title || 'meeting')
      .replace(/[&]/g, '_')
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/[ß]/g, 'ss')
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
      .trim() || 'meeting'
    
    const fileName = `${user_id}/${recording_id}_${sanitizedTitle}_${timestamp}.txt`

    console.log(`Speichere Datei: ${fileName}`)

    // 6. TXT-Datei in Storage-Bucket hochladen
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('transcripts')  // Bucket-Name in deinem externen Projekt
      .upload(fileName, transcriptContent, {
        contentType: 'text/plain; charset=utf-8',
        upsert: true,  // Überschreiben falls bereits vorhanden
      })

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'upload_failed', details: uploadError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Transkript erfolgreich gespeichert:', uploadData.path)

    // 7. Optional: Metadaten in einer DB-Tabelle speichern
    // Entkommentiere diesen Block wenn du eine `transcript_records` Tabelle hast:
    /*
    if (metadata) {
      const { error: dbError } = await supabase
        .from('transcript_records')
        .upsert({
          recording_id,
          user_id,
          title,
          file_path: uploadData.path,
          summary: metadata.summary,
          key_points: metadata.key_points,
          action_items: metadata.action_items,
          participants: metadata.participants,
          word_count: metadata.word_count,
          video_url: metadata.video_url,
          duration,
          created_at,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'recording_id' })

      if (dbError) {
        console.error('DB Insert Error:', dbError)
        // Nicht abbrechen - Datei wurde bereits gespeichert
      }
    }
    */

    // 8. Erfolgs-Response
    return new Response(
      JSON.stringify({
        success: true,
        path: uploadData.path,
        recording_id,
        message: 'Transkript erfolgreich gespeichert',
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unerwarteter Fehler:', error)
    return new Response(
      JSON.stringify({ error: 'internal_error', message: String(error) }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


/**
 * ============================================
 * SQL FÜR OPTIONALE METADATEN-TABELLE
 * ============================================
 * 
 * Falls du die Metadaten auch in einer DB-Tabelle speichern möchtest:
 * 
 * CREATE TABLE public.transcript_records (
 *   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 *   recording_id TEXT NOT NULL UNIQUE,
 *   user_id TEXT NOT NULL,
 *   title TEXT,
 *   file_path TEXT NOT NULL,
 *   summary TEXT,
 *   key_points JSONB DEFAULT '[]'::jsonb,
 *   action_items JSONB DEFAULT '[]'::jsonb,
 *   participants JSONB DEFAULT '[]'::jsonb,
 *   word_count INTEGER,
 *   video_url TEXT,
 *   duration INTEGER,
 *   created_at TIMESTAMP WITH TIME ZONE,
 *   synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
 * );
 * 
 * CREATE INDEX idx_transcript_records_user ON public.transcript_records(user_id);
 * CREATE INDEX idx_transcript_records_created ON public.transcript_records(created_at DESC);
 */
