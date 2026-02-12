

## Automatische Transkript-Sicherstellung fuer alle Meetings

### Aktueller Stand

| Pfad | Transkription | DB-Speicherung | Storage-Backup | Export |
|---|---|---|---|---|
| Bot (automatisch) | Recall.ai Streaming | Ja | Ja | Ja |
| Manueller Upload | ElevenLabs (scribe_v2) | Ja | Ja | Ja |

Beide Pfade speichern bereits korrekt eine Kopie in der Datenbank UND im Storage-Bucket "transcript-backups".

### Problem

Wenn ein Bot-Meeting abgeschlossen ist (status: "done") aber **kein Streaming-Transkript** generiert wurde (transcript = null, wie beim Stellantis GAV Meeting), bleibt das Recording ohne Transkript. Der User muss manuell den "Recall Transkript erstellen"-Button klicken.

### Loesung: Automatischer Recall-Transkriptions-Fallback

Wenn `sync-recording` ein fertiges Meeting (status "done") verarbeitet und **kein Transkript** von Recall.ai heruntergeladen werden kann, wird automatisch die Recall.ai Async Transcription API aufgerufen -- genau wie der manuelle "Recall Transkript erstellen"-Button, aber ohne User-Eingriff.

### Technische Aenderung

| Datei | Aenderung |
|---|---|
| `supabase/functions/sync-recording/index.ts` | Nach dem Transkript-Download-Versuch (Zeile ~721): Wenn kein Transkript gefunden wurde UND der Bot mindestens ein Recording hat, automatisch `recall-transcribe` aufrufen. Status auf "transcribing" setzen statt "done". |

### Ablauf nach der Aenderung

```text
Bot-Meeting endet
       |
  sync-recording
       |
  Transkript von Recall.ai abrufen
       |
   +---+---+
   |       |
Transkript  Kein Transkript
vorhanden   vorhanden
   |           |
Normal      Automatisch recall-transcribe
weiter      aufrufen (Async Transcription)
   |           |
Analyse +   Status = "transcribing"
Backup +       |
Export      Naechster sync-recording-Aufruf
            holt fertiges Transkript ab
```

### Detaillierter Code-Eingriff

In `sync-recording/index.ts`, nach Zeile ~721 (wo "Keine Transkript-URL in media_shortcuts gefunden" geloggt wird), wird folgender Block eingefuegt:

1. Pruefen ob `botData.recordings` mindestens einen Eintrag hat
2. Die Recall Recording ID aus `botData.recordings[0].id` extrahieren
3. `POST /api/v1/recording/{ID}/create_transcript/` mit Provider `recallai_async` und `language_code: "de"` aufrufen
4. Status auf `"transcribing"` setzen (ueberschreibt `"done"`)
5. Loggen dass automatische Recall-Transkription gestartet wurde

Der naechste Aufruf von sync-recording (entweder automatisch oder manuell ueber "Transkript neu laden") wird dann das fertige Transkript ueber die regulaere `media_shortcuts.transcript` URL abrufen.

### Keine Aenderungen noetig fuer

- **Manuelle Uploads**: Verwenden weiterhin ElevenLabs (bestaetigt) und speichern korrekt in DB + Storage
- **recall-transcribe Edge Function**: Bleibt als manueller Fallback-Button verfuegbar
- **Transcript-Backup und Export**: Beide laufen automatisch sobald ein Transkript in der DB ist

