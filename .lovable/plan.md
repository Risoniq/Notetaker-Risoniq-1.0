
# Plan: Dashboard API mit API-Key Authentifizierung und Webhook-Versand

## Uebersicht

Erstellung eines vollstaendigen API-Systems das:
- Alle Dashboard-Daten, Team-Statistiken und Transkripte per API bereitstellt
- Authentifizierung ueber personalisierte API-Keys ermoeglicht
- Daten an externe Webhooks versenden kann (Slack, Teams, eigene Systeme)
- Konfigurierbare Report-Frequenz (taeglich, woechentlich, bei Schwellenwert) bietet

## Funktionsumfang

| Feature | Beschreibung |
|---------|-------------|
| API-Key Verwaltung | Admins koennen API-Keys erstellen und verwalten |
| Dashboard-API | Endpoint fuer alle Dashboard-Daten |
| Transkript-API | Endpoint fuer Transkripte mit Filteroptionen |
| Team-API | Endpoint fuer Team-Statistiken |
| Webhook-Konfiguration | Ziel-URL und Frequenz einstellen |
| Automatischer Versand | Geplante Reports an Webhooks |

## Datenbank-Schema

### Neue Tabellen

```text
┌─────────────────────────────────────────────────────────────┐
│                      api_keys                                │
├─────────────────────────────────────────────────────────────┤
│ id              │ uuid (PK)                                 │
│ name            │ text (Beschreibung z.B. "Slack Export")   │
│ key_hash        │ text (SHA-256 Hash des Keys)              │
│ key_prefix      │ text (erste 8 Zeichen fuer Anzeige)       │
│ permissions     │ jsonb (welche Endpoints erlaubt)          │
│ created_by      │ uuid (Admin der den Key erstellt hat)     │
│ last_used_at    │ timestamptz                               │
│ expires_at      │ timestamptz (optional)                    │
│ is_active       │ boolean                                   │
│ created_at      │ timestamptz                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    webhook_configs                           │
├─────────────────────────────────────────────────────────────┤
│ id              │ uuid (PK)                                 │
│ api_key_id      │ uuid (FK -> api_keys)                     │
│ name            │ text (z.B. "Taeglicher Slack Report")     │
│ webhook_url     │ text (Ziel-URL)                           │
│ frequency       │ text ('daily', 'weekly', 'threshold')     │
│ schedule_time   │ time (z.B. 08:00 fuer taeglich)           │
│ schedule_day    │ integer (0-6 fuer woechentlich)           │
│ threshold_type  │ text (z.B. 'quota_percent')               │
│ threshold_value │ integer (z.B. 80 fuer 80%)                │
│ report_type     │ text ('dashboard', 'transcripts', 'team') │
│ is_active       │ boolean                                   │
│ last_triggered  │ timestamptz                               │
│ created_at      │ timestamptz                               │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. Dashboard-Daten abrufen

```text
GET /api-dashboard

Headers:
  x-api-key: ntr_xxxxxxxxxx

Query-Parameter:
  include_users=true       # User-Liste
  include_teams=true       # Team-Liste
  include_summary=true     # Zusammenfassung

Response:
{
  "success": true,
  "data": {
    "summary": { total_users, active_users, total_recordings, ... },
    "users": [...],
    "teams": [...],
  },
  "exported_at": "2026-02-04T..."
}
```

### 2. Transkripte abrufen (erweitert)

```text
GET /api-transcripts

Headers:
  x-api-key: ntr_xxxxxxxxxx

Query-Parameter:
  since=2026-01-01         # Seit Datum
  user_id=xxx              # Nur fuer User
  team_id=xxx              # Nur fuer Team
  limit=50                 # Max Anzahl
  include_analysis=true    # Mit KI-Analyse

Response:
{
  "success": true,
  "count": 25,
  "transcripts": [...]
}
```

### 3. Team-Statistiken abrufen

```text
GET /api-team-stats

Headers:
  x-api-key: ntr_xxxxxxxxxx

Query-Parameter:
  team_id=xxx              # Spezifisches Team

Response:
{
  "success": true,
  "team": { name, max_minutes, used_minutes, ... },
  "members": [...],
  "recordings_summary": {...}
}
```

## Backend Edge Functions

### Neue Functions

| Function | Zweck |
|----------|-------|
| `api-dashboard` | Dashboard-Daten mit API-Key Auth |
| `api-transcripts` | Transkripte mit API-Key Auth |
| `api-team-stats` | Team-Statistiken mit API-Key Auth |
| `admin-create-api-key` | API-Key erstellen |
| `admin-list-api-keys` | Alle Keys auflisten |
| `admin-delete-api-key` | Key loeschen |
| `admin-save-webhook-config` | Webhook konfigurieren |
| `scheduled-webhook-trigger` | Cron-Job fuer automatische Reports |

### API-Key Validierung (shared)

```typescript
// Wird in allen api-* Functions verwendet
async function validateApiKey(apiKey: string, permission: string) {
  const keyHash = await sha256(apiKey);
  
  const { data: keyRecord } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .maybeSingle();
  
  if (!keyRecord) return null;
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) return null;
  if (!keyRecord.permissions[permission]) return null;
  
  // Last used aktualisieren
  await supabase.from('api_keys').update({ last_used_at: new Date() }).eq('id', keyRecord.id);
  
  return keyRecord;
}
```

## Frontend - Admin UI

### API-Keys Tab in Admin.tsx

```text
┌────────────────────────────────────────────────────────────┐
│  [Benutzer]  [Teams]  [API-Keys]                + API-Key  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Slack Export          ntr_abc12345...                │ │
│  │ Erstellt: 01.02.2026  Zuletzt: vor 2h               │ │
│  │ Berechtigungen: Dashboard, Transkripte              │ │
│  │ [Webhook] [Loeschen]                                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ CRM Integration       ntr_xyz98765...                │ │
│  │ Erstellt: 15.01.2026  Zuletzt: vor 1d               │ │
│  │ Berechtigungen: Transkripte                         │ │
│  │ [Webhook] [Loeschen]                                │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### API-Key Erstellung Dialog

```text
┌────────────────────────────────────────────────────────────┐
│  Neuer API-Key                                        [X]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Name:                                                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Slack Export                                         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Berechtigungen:                                           │
│  [x] Dashboard-Daten                                       │
│  [x] Transkripte                                           │
│  [x] Team-Statistiken                                      │
│                                                            │
│  Ablaufdatum (optional):                                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Kein Ablauf                                     [v]  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│               [Abbrechen]  [API-Key erstellen]             │
└────────────────────────────────────────────────────────────┘
```

### Webhook Konfiguration Dialog

```text
┌────────────────────────────────────────────────────────────┐
│  Webhook konfigurieren: Slack Export                  [X]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Webhook-URL:                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ https://hooks.slack.com/services/T00/B00/xxx         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Report-Typ:                                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Dashboard-Zusammenfassung                       [v]  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Frequenz:                                                 │
│  ( ) Taeglich um [ 08:00 ]                                │
│  ( ) Woechentlich am [ Montag ] um [ 08:00 ]              │
│  ( ) Bei Schwellenwert: Kontingent >= [ 80 ]%             │
│  (x) Manuell (nur API-Abruf)                              │
│                                                            │
│               [Test senden]  [Speichern]                   │
└────────────────────────────────────────────────────────────┘
```

## API-Key Format

Der API-Key hat folgendes Format fuer einfache Identifizierung:

```text
ntr_k1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6
│   └──────────────────────────────────── 32 Zeichen zufaellig
└── Prefix "ntr_" (notetaker)
```

- Prefix ermoeglicht einfache Erkennung
- 32 Zeichen Base62 = sehr hohe Entropie
- Nur Hash wird gespeichert, Key wird nur einmal angezeigt

## Implementierungsreihenfolge

### Phase 1: Datenbank
1. Migration: `api_keys` Tabelle
2. Migration: `webhook_configs` Tabelle
3. RLS Policies (nur Admins)

### Phase 2: Backend - API Endpoints
4. `api-dashboard` Edge Function
5. `api-transcripts` Edge Function (erweitert bestehende)
6. `api-team-stats` Edge Function
7. Shared API-Key Validierung

### Phase 3: Backend - Key Management
8. `admin-create-api-key` Function
9. `admin-list-api-keys` Function
10. `admin-delete-api-key` Function

### Phase 4: Backend - Webhook
11. `admin-save-webhook-config` Function
12. `scheduled-webhook-trigger` Function

### Phase 5: Frontend
13. Admin.tsx: API-Keys Tab
14. ApiKeyCard Komponente
15. CreateApiKeyDialog
16. WebhookConfigDialog
17. API-Dokumentation Seite

## Sicherheitsaspekte

| Aspekt | Massnahme |
|--------|-----------|
| Key-Speicherung | Nur SHA-256 Hash in DB, Key nur einmal sichtbar |
| Rate Limiting | Max 100 Requests/Minute pro Key |
| IP-Binding | Optional: Key an IP-Adressen binden |
| Audit Log | Jeder API-Zugriff wird geloggt |
| Ablaufdatum | Keys koennen zeitlich begrenzt werden |
| Granulare Rechte | Permissions pro Endpoint |

## API-Dokumentation

Im Admin-Bereich wird eine einfache Dokumentation angezeigt:

```text
┌────────────────────────────────────────────────────────────┐
│  API-Dokumentation                                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Base-URL: https://kltxpsr...supabase.co/functions/v1     │
│                                                            │
│  ## Dashboard-Daten                                        │
│                                                            │
│  GET /api-dashboard                                        │
│  Header: x-api-key: ntr_xxxxx                              │
│                                                            │
│  curl -X GET \                                             │
│    -H "x-api-key: ntr_xxxxx" \                            │
│    "https://.../api-dashboard?include_summary=true"       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Betroffene Dateien

| Datei | Aenderung |
|-------|----------|
| `supabase/migrations/...` | Neue Tabellen |
| `supabase/functions/api-dashboard/index.ts` | NEU |
| `supabase/functions/api-transcripts/index.ts` | NEU (erweitert export-transcripts) |
| `supabase/functions/api-team-stats/index.ts` | NEU |
| `supabase/functions/admin-create-api-key/index.ts` | NEU |
| `supabase/functions/admin-list-api-keys/index.ts` | NEU |
| `supabase/functions/admin-delete-api-key/index.ts` | NEU |
| `supabase/functions/admin-save-webhook-config/index.ts` | NEU |
| `src/pages/Admin.tsx` | API-Keys Tab |
| `src/components/admin/ApiKeyCard.tsx` | NEU |
| `src/components/admin/CreateApiKeyDialog.tsx` | NEU |
| `src/components/admin/WebhookConfigDialog.tsx` | NEU |

## Risikobewertung

| Risiko | Bewertung | Mitigation |
|--------|-----------|------------|
| Key-Leakage | Mittel | Key nur einmal anzeigen, Hash speichern |
| API-Missbrauch | Mittel | Rate Limiting, Audit Logs |
| Webhook-Ausfall | Niedrig | Retry-Logik, Fehler-Benachrichtigung |
| Performance | Niedrig | Caching, Pagination |
