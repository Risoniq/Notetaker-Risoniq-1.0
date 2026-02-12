

## Recall.ai Bot-Diagnose fuer zwei Bot-IDs

### Ausgangslage

- **Bot `b65530f7-...`**: Existiert in der Datenbank (Recording `8ef3df81-...`, Titel "AH Lambeck Sven Krause Teil 1", Status "done"), aber ohne Video-URL und ohne Transkript.
- **Bot `aed63db5-...`**: Existiert NICHT in der Datenbank. Kein Recording-Eintrag vorhanden.

Der User moechte pruefen, ob bei Recall.ai noch Daten (Video, Transkript, Aufnahmen) fuer diese Bots vorhanden sind.

### Loesung: Diagnose-Edge-Function erstellen

Da wir den RECALL_API_KEY nur serverseitig nutzen koennen, wird eine neue Edge Function `recall-bot-check` erstellt, die fuer eine gegebene Bot-ID die Recall.ai API abfragt und alle verfuegbaren Daten zurueckgibt.

### Neue Datei: `supabase/functions/recall-bot-check/index.ts`

Die Funktion:
1. Nimmt eine `bot_id` entgegen (authentifiziert, nur fuer Admins)
2. Ruft `GET https://eu-central-1.recall.ai/api/v1/bot/{bot_id}/` auf
3. Gibt die vollstaendigen Bot-Daten zurueck: Status, Recordings, Video-URLs, Transkript-URLs, Teilnehmer

```
POST /recall-bot-check
Body: { "bot_id": "b65530f7-..." }
Response: { bot_data: { status_changes, recordings, meeting_participants, ... } }
```

### Ablauf nach Erstellung

1. Edge Function deployen
2. Beide Bot-IDs nacheinander abfragen
3. Ergebnisse auswerten:
   - Gibt es Recordings/Videos beim Recall Bot?
   - Sind die Medien abgelaufen (media_expired)?
   - Gibt es Transkript-Daten?
4. Falls Daten vorhanden: sync-recording ausfuehren oder fehlenden DB-Eintrag erstellen
5. Falls keine Daten: dem User mitteilen, dass die Aufnahmen bei Recall.ai nicht mehr verfuegbar sind

### Technische Details

- Authentifizierung: Admin-only (ueber `has_role` Check)
- API-Endpunkt: `https://eu-central-1.recall.ai/api/v1/bot/{bot_id}/`
- Header: `Authorization: Token {RECALL_API_KEY}`
- Zusaetzlich wird `/calendar/meetings/?bot_id={bot_id}` abgefragt, um Kalender-Zuordnung zu pruefen

