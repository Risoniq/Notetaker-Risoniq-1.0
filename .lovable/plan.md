
# Plan: API-Key Erweiterung fuer Datenempfang (Bidirektionale API)

## Uebersicht

Erweiterung des bestehenden API-Key-Systems um **eingehende Daten** zu unterstuetzen. Damit koennen externe Systeme nicht nur Daten abrufen, sondern auch:
- Transkripte importieren
- Meetings anlegen
- Teilnehmer-Daten synchronisieren
- Metadaten aktualisieren

## Aktuelle vs. neue Architektur

```text
AKTUELL (nur Abrufen):
┌──────────────────┐      GET       ┌──────────────────┐
│ Externes System  │ ───────────────> │  Notetaker API   │
│ (Slack, CRM)     │                  │ (api-dashboard)  │
└──────────────────┘                  └──────────────────┘

NEU (bidirektional):
┌──────────────────┐      GET       ┌──────────────────┐
│ Externes System  │ <──────────────> │  Notetaker API   │
│ (Slack, CRM)     │      POST       │ (lesen + schreiben)│
└──────────────────┘                  └──────────────────┘
```

## Neue API-Endpoints (Schreiben)

### 1. Transkript importieren

```text
POST /api-import-transcript

Headers:
  x-api-key: ntr_xxxxxxxxxx

Body:
{
  "target_user_email": "user@firma.de",   // Welchem User zuordnen
  "title": "Kundengespraech XYZ",
  "transcript_text": "Speaker 1: Hallo...",
  "meeting_date": "2026-02-05T10:00:00Z", // Optional
  "duration_seconds": 1800,               // Optional
  "source": "zoom_import",                // Quellsystem
  "participants": [                       // Optional
    { "name": "Max Mustermann", "email": "max@firma.de" }
  ],
  "run_analysis": true                    // KI-Analyse ausfuehren?
}

Response:
{
  "success": true,
  "recording_id": "uuid",
  "title": "Kundengespraech XYZ",
  "status": "done",                       // oder "processing"
  "summary": "...",                        // falls run_analysis=true
  "action_items": [...]
}
```

### 2. Meeting Metadaten aktualisieren

```text
PATCH /api-update-recording

Headers:
  x-api-key: ntr_xxxxxxxxxx

Body:
{
  "recording_id": "uuid",
  "title": "Neuer Titel",                 // Optional
  "participants": [...],                  // Optional
  "custom_metadata": {...}                // Optional - fuer CRM etc.
}

Response:
{
  "success": true,
  "updated_fields": ["title", "participants"]
}
```

### 3. Webhook-Daten empfangen (Callback)

```text
POST /api-webhook-callback

Headers:
  x-api-key: ntr_xxxxxxxxxx

Body:
{
  "event_type": "transcript_ready",       // oder "meeting_ended"
  "source": "zoom",
  "external_meeting_id": "zoom-123",
  "target_user_email": "user@firma.de",
  "data": {
    "transcript": "...",
    "video_url": "https://...",
    "participants": [...]
  }
}
```

## Neue Berechtigungen

Erweiterung des `permissions` JSONB-Feldes:

| Permission | Beschreibung |
|------------|-------------|
| `dashboard` | Dashboard-Daten lesen (besteht) |
| `transcripts` | Transkripte lesen (besteht) |
| `team_stats` | Team-Statistiken lesen (besteht) |
| **`import`** | Transkripte/Meetings importieren (NEU) |
| **`update`** | Recordings aktualisieren (NEU) |
| **`webhook_receive`** | Webhook-Callbacks empfangen (NEU) |

## Backend Edge Functions

### Neue Functions

| Function | Methode | Beschreibung |
|----------|---------|-------------|
| `api-import-transcript` | POST | Transkript von extern importieren |
| `api-update-recording` | PATCH | Recording-Metadaten aktualisieren |
| `api-webhook-callback` | POST | Webhook-Events empfangen |

### Sicherheitslogik

```typescript
// Jede Schreib-Function prueft:
// 1. API-Key valide?
// 2. Hat Key die benoetigte Permission?
// 3. Ziel-User existiert?
// 4. Rate-Limit nicht ueberschritten?

async function validateApiKeyForWrite(apiKey: string, permission: string) {
  const keyRecord = await validateApiKey(supabase, apiKey, permission);
  if (!keyRecord) return null;
  
  // Zusaetzliche Pruefung fuer Schreib-Operationen
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return null;
  }
  
  return keyRecord;
}
```

## Frontend Erweiterungen

### CreateApiKeyDialog

Zusaetzliche Berechtigungs-Checkboxen:

```text
Berechtigungen:

LESEN (Daten abrufen):
[x] Dashboard-Daten
[x] Transkripte
[x] Team-Statistiken

SCHREIBEN (Daten empfangen):
[x] Transkripte importieren
[x] Recordings aktualisieren
[ ] Webhook-Callbacks
```

### ApiKeyCard

Erweiterte Badge-Anzeige fuer Schreib-Berechtigungen:

```text
┌──────────────────────────────────────────────────────────┐
│ CRM Integration          ntr_abc12345...                 │
│ Erstellt: 01.02.2026     Zuletzt: vor 2h                │
│                                                          │
│ LESEN: [Dashboard] [Transkripte]                        │
│ SCHREIBEN: [Import] [Update]                            │
│                                                          │
│ [Webhook] [Dokumentation] [Loeschen]                    │
└──────────────────────────────────────────────────────────┘
```

### API-Dokumentations-Seite

Neue Sektion fuer Import-Endpoints mit Beispielen:

```text
## Transkript importieren

POST /api-import-transcript

curl -X POST \
  -H "x-api-key: ntr_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "target_user_email": "user@firma.de",
    "title": "Meeting vom 05.02.",
    "transcript_text": "Speaker 1: ..."
  }' \
  "https://.../api-import-transcript"
```

## Datenbank-Aenderungen

Keine Schema-Aenderungen noetig - das `permissions` JSONB-Feld ist bereits flexibel.

Beispiel neuer Permissions-Wert:
```json
{
  "dashboard": true,
  "transcripts": true,
  "team_stats": false,
  "import": true,
  "update": true,
  "webhook_receive": false
}
```

## Implementierungsreihenfolge

### Phase 1: Backend Import
1. `api-import-transcript` Edge Function
2. Validierung und User-Lookup per E-Mail
3. Integration mit `analyze-transcript`

### Phase 2: Backend Update
4. `api-update-recording` Edge Function
5. Berechtigungspruefung auf Recording-Ebene

### Phase 3: Backend Webhook
6. `api-webhook-callback` Edge Function
7. Event-Routing und Verarbeitung

### Phase 4: Frontend
8. CreateApiKeyDialog erweitern (Schreib-Permissions)
9. ApiKeyCard erweitern (Badges)
10. API-Dokumentation erweitern

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/api-import-transcript/index.ts` | NEU |
| `supabase/functions/api-update-recording/index.ts` | NEU |
| `supabase/functions/api-webhook-callback/index.ts` | NEU |
| `supabase/config.toml` | verify_jwt = false fuer neue Functions |
| `src/components/admin/CreateApiKeyDialog.tsx` | Schreib-Permissions |
| `src/components/admin/ApiKeyCard.tsx` | Import/Update Badges |

## Sicherheitsueberlegungen

| Aspekt | Massnahme |
|--------|-----------|
| User-Validierung | E-Mail muss existierendem User gehoeren |
| Rate Limiting | Max 50 Imports/Stunde pro API-Key |
| Transkript-Groesse | Max 500.000 Zeichen wie bei Admin-Upload |
| Audit Trail | Jeder Import wird geloggt mit API-Key-ID |
| Kein Loeschen | API kann nur erstellen/aktualisieren, nicht loeschen |

## Anwendungsbeispiele

### Zoom-Integration
```text
Zoom Webhook -> api-webhook-callback -> Transkript erstellen
```

### CRM-Sync
```text
CRM System -> api-import-transcript -> Meeting anlegen
             -> api-update-recording -> Teilnehmer aktualisieren
```

### Batch-Import
```text
Python Script -> api-import-transcript (Loop) -> Historische Meetings importieren
```

## API-Dokumentation Beispiel

Fuer den Admin-Bereich wird eine erweiterte Dokumentation angezeigt:

```text
┌────────────────────────────────────────────────────────────┐
│  API-Dokumentation                                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ## Transkript importieren                                 │
│                                                            │
│  Importiere ein Transkript von einem externen System.      │
│                                                            │
│  POST /api-import-transcript                               │
│                                                            │
│  Headers:                                                  │
│    x-api-key: ntr_xxxxx                                   │
│    Content-Type: application/json                          │
│                                                            │
│  Body:                                                     │
│  {                                                         │
│    "target_user_email": "user@firma.de",                  │
│    "title": "Meeting Titel",                              │
│    "transcript_text": "Speaker 1: Hallo...",              │
│    "run_analysis": true                                    │
│  }                                                         │
│                                                            │
│  Response:                                                 │
│  {                                                         │
│    "success": true,                                        │
│    "recording_id": "uuid-...",                            │
│    "status": "done"                                        │
│  }                                                         │
└────────────────────────────────────────────────────────────┘
```

## Risikobewertung

| Risiko | Bewertung | Mitigation |
|--------|-----------|------------|
| Missbrauch Import | Mittel | Rate Limiting, User-Validierung |
| Falsche User-Zuordnung | Niedrig | E-Mail-Lookup statt User-ID |
| Quota-Umgehung | Niedrig | Import zaehlt zum Kontingent |
| Datenintegritaet | Niedrig | Transkript-Validierung (min. 100 Zeichen) |
