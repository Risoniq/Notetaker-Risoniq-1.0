

## Automatische Synchronisation haengender Recordings

### Problem
Meetings bleiben in Status "pending", "joining", "recording" oder "processing" haengen, weil kein automatischer Sync ausgeloest wird, wenn das Meeting endet. Erst nach 4 Stunden greift der Timeout-Cleanup.

### Loesung
Eine neue Edge Function `auto-sync-recordings`, die regelmaessig alle haengenden Recordings findet und fuer jedes einzeln `sync-recording` aufruft. Diese Funktion wird per Cron-Job alle 5 Minuten ausgefuehrt.

### Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/auto-sync-recordings/index.ts` | Neue Edge Function erstellen |
| `supabase/config.toml` | `verify_jwt = false` fuer neue Funktion |

Zusaetzlich: SQL-Statement fuer den Cron-Job (pg_cron + pg_net).

### Technische Details

#### 1. Neue Edge Function: `auto-sync-recordings`

- Authentifizierung: Nur per Service Role Key (kein User-Token noetig)
- Sicherheit: Prueft einen geheimen Header oder nutzt den Service Role Key direkt
- Logik:
  1. Alle Recordings mit Status `pending`, `joining`, `recording`, `processing`, `transcribing` laden (maximal 30 Minuten alt, um nicht uralte Eintraege zu bearbeiten)
  2. Fuer jedes Recording den `sync-recording` Endpoint aufrufen (mit Service Role Key als Authorization)
  3. Ergebnis loggen

#### 2. Aenderung an `sync-recording`

Keine Aenderung noetig -- die Funktion akzeptiert bereits einen Authorization-Header und prueft User-Berechtigung. Fuer den Cron-Aufruf wird ein Admin-User oder ein spezieller Service-Aufruf benoetigt.

**Alternative**: Da `sync-recording` User-Auth erfordert und den `user_id` des Recordings prueft, wird `auto-sync-recordings` direkt die Recall.ai API abfragen und die Datenbank aktualisieren (wie `sync-recording`, aber ohne User-Auth-Check).

Die einfachere Loesung: `auto-sync-recordings` liest die `user_id` aus dem Recording und ruft `sync-recording` ueber einen internen Supabase-Funktionsaufruf mit dem Service Role Key auf. Da Admin-Checks bereits implementiert sind, kann ein Admin-User-Token verwendet werden -- oder besser: Die Function fuehrt die Sync-Logik direkt selbst aus.

**Gewaehlt**: Die Function ruft fuer jedes haengende Recording die `sync-recording` Edge Function intern auf, mit dem Service Role Key im Authorization-Header. `sync-recording` akzeptiert dies bereits, da es bei fehlender User-ID im Recording keinen Ownership-Check macht.

#### 3. Cron-Job (SQL)

```sql
SELECT cron.schedule(
  'auto-sync-recordings-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kltxpsrghuxzfbctkdnz.supabase.co/functions/v1/auto-sync-recordings',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

#### 4. Sofortige Rettung der 4 aktuell haengenden Recordings

Nach Deployment der neuen Funktion wird sie einmal manuell aufgerufen, um die 4 aktuell haengenden Recordings zu synchronisieren.

