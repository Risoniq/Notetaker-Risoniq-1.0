

## Recall.ai Async Transcription fuer haengende Recordings

### Was wird gebaut

Eine neue Funktion, die das Transkript direkt ueber Recall.ai erstellen laesst (nicht ElevenLabs), indem die Recall.ai **Async Transcription API** aufgerufen wird. Dies funktioniert fuer alle Bot-Recordings, bei denen das Streaming-Transkript waehrend des Meetings nicht erstellt wurde.

### Wie es funktioniert

1. Der User klickt auf einen neuen Button "Recall Transkript erstellen" auf der Meeting-Detail-Seite
2. Eine neue Edge Function ruft die Recall.ai API auf: `POST /api/v1/recording/{RECORDING_ID}/create_transcript/`
3. Recall.ai transkribiert das vorhandene Video asynchron (ca. 1 Minute pro Stunde Meeting)
4. Nach Abschluss kann der User ueber "Transkript neu laden" (sync-recording) das fertige Transkript abrufen

### Technische Details

| Datei | Aenderung |
|---|---|
| `supabase/functions/recall-transcribe/index.ts` | **Neue Edge Function**: Nimmt eine `recording_id` entgegen, liest die `recall_bot_id` aus der DB, fragt die Recall.ai Bot-Daten ab um die Recording-ID zu ermitteln, und ruft dann `POST /api/v1/recording/{RECORDING_ID}/create_transcript/` mit Provider `recallai_async` und `language_code: "deu"` auf. Setzt den DB-Status auf `transcribing`. |
| `supabase/config.toml` | Neuen Eintrag `[functions.recall-transcribe]` mit `verify_jwt = false` hinzufuegen |
| `src/pages/MeetingDetail.tsx` | Neuen Button "Recall Transkript erstellen" hinzufuegen, sichtbar wenn: source === 'bot', kein Transkript vorhanden, recall_bot_id vorhanden. Ruft die neue Edge Function auf. |
| `supabase/functions/sync-recording/index.ts` | Keine Aenderung noetig -- sync-recording holt bereits das Transkript von `media_shortcuts.transcript`, sobald Recall.ai es fertig hat. |

### API-Aufruf an Recall.ai

```text
POST https://eu-central-1.recall.ai/api/v1/recording/{RECALL_RECORDING_ID}/create_transcript/
Authorization: Token {RECALL_API_KEY}
Content-Type: application/json

{
  "provider": {
    "recallai_async": {
      "language_code": "deu"
    }
  }
}
```

Wichtig: Die `RECALL_RECORDING_ID` ist NICHT die `recall_bot_id`, sondern die ID aus `botData.recordings[0].id`. Die Edge Function muss zuerst den Bot abfragen, um diese ID zu ermitteln.

### Ablauf fuer den User

1. Meeting-Detail oeffnen (Stellantis GAV)
2. Button "Recall Transkript erstellen" klicken
3. Warten (ca. 1-2 Minuten fuer 79 Min Meeting)
4. "Transkript neu laden" klicken um das fertige Transkript abzuholen
