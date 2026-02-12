

## Luecke gefunden: Desktop SDK Webhook loest keine Transkription/Analyse aus

### Befund

Alle Pfade wurden geprueft. Bei 5 von 6 Pfaden landen Transkripte korrekt in der Analyse-Pipeline:

| Pfad | Transkript | Analyse | Status |
|---|---|---|---|
| Bot-Meeting (sync-recording) | Recall.ai Streaming | Ja, automatisch | OK |
| Bot-Fallback (kein Streaming) | Recall.ai Async, naechster sync holt ab | Ja, automatisch | OK |
| Manueller Button (recall-transcribe) | Recall.ai Async, naechster sync holt ab | Ja, beim naechsten sync | OK |
| Manueller Upload (transcribe-audio) | ElevenLabs scribe_v2 | Ja, automatisch | OK |
| API Import (api-import-transcript) | Externer Text | Nur wenn run_analysis=true | OK (by design) |
| **Desktop SDK (desktop-sdk-webhook)** | **Keins** | **Nein** | **LUECKE** |

### Problem: desktop-sdk-webhook

Die Edge Function `desktop-sdk-webhook` empfaengt das Event `sdk_upload.complete` von Recall.ai, speichert die Recording-Metadaten (Video-URL, Audio-URL) in der Datenbank mit `status: "done"`, aber:

1. Laedt **kein Transkript** von Recall.ai herunter
2. Ruft **nicht** `sync-recording` auf, um Transkript + Analyse zu starten
3. Ruft **nicht** `analyze-transcript` auf

Das Ergebnis: Desktop-SDK-Aufnahmen landen in der DB ohne Transkript und ohne KI-Analyse.

### Loesung

Nach dem erfolgreichen Speichern der Recording-Daten in der Datenbank wird `sync-recording` aufgerufen (analog zum Calendar-Auto-Ingest). Alternativ, falls die Desktop-SDK-Recordings keinen Recall-Bot haben, wird direkt die Recall.ai Transcript API abgefragt und danach `analyze-transcript` aufgerufen.

### Technische Aenderung

| Datei | Aenderung |
|---|---|
| `supabase/functions/desktop-sdk-webhook/index.ts` | Nach dem erfolgreichen DB-Upsert: (1) Transkript von Recall.ai `media_shortcuts.transcript` abrufen, (2) in DB speichern, (3) `analyze-transcript` Edge Function aufrufen. Falls kein Transkript vorhanden, automatisch `create_transcript` mit `recallai_async` aufrufen und Status auf `transcribing` setzen. |

### Detaillierter Ablauf nach der Aenderung

```text
desktop-sdk-webhook empfaengt sdk_upload.complete
       |
  Recording in DB speichern (wie bisher)
       |
  Transkript von Recall.ai abrufen
  (media_shortcuts.transcript)
       |
   +---+---+
   |       |
Transkript  Kein Transkript
vorhanden   vorhanden
   |           |
In DB         Recall.ai Async Transcription
speichern     aufrufen (recallai_async, "de")
   |           |
analyze-    Status = "transcribing"
transcript  (naechster sync holt Transkript)
aufrufen
   |
Backup in Storage
   |
Export an externe API
```

### Code-Aenderungen im Detail

Im `sdk_upload.complete`-Handler nach dem DB-Upsert (nach Zeile ~93):

1. Transkript-URL aus `recording.media_shortcuts.transcript` pruefen
2. Falls vorhanden: Transkript herunterladen, formatieren, mit Meeting-Info-Header versehen, in DB aktualisieren
3. Storage-Backup erstellen (analog zu sync-recording und transcribe-audio)
4. `analyze-transcript` Edge Function aufrufen
5. Externen Export ausfuehren (TRANSCRIPT_EXPORT_URL)
6. Falls kein Transkript: `create_transcript` API aufrufen und Status auf `transcribing` setzen

Damit werden alle Desktop-SDK-Aufnahmen genauso behandelt wie Bot-Meetings und manuelle Uploads.

