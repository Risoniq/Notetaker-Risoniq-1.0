

## recall-bot-check um "list-bots" Action erweitern

### Ziel

Eine neue Action `list-bots` in der bestehenden `recall-bot-check` Edge Function, die alle Bots eines bestimmten Zeitraums von der Recall.ai API abruft. Damit koennen wir Bots vom 10.02.2026 fuer as@ec-pd.com finden, auch wenn kein Eintrag in der lokalen Datenbank existiert.

### Aenderung

**Datei: `supabase/functions/recall-bot-check/index.ts`**

Die Edge Function wird um eine Action-basierte Struktur erweitert:

- **Bestehende Logik** (wenn `bot_id` uebergeben wird): bleibt unveraendert
- **Neue Action `list-bots`**: Wenn `action: "list-bots"` mit optionalen `date_from`, `date_to` und `user_email` Parametern uebergeben wird:
  1. Ruft `GET https://eu-central-1.recall.ai/api/v1/bot/` auf, mit Query-Parametern fuer Zeitfilter (`created_after`, `created_before`) - paginiert ueber alle Ergebnisse
  2. Optional: Filtert nach `meeting_url` oder Metadaten, die auf den User hinweisen
  3. Fuer jeden gefundenen Bot wird geprueft, ob ein passender `recordings`-Eintrag in der DB existiert
  4. Gibt eine Liste aller gefundenen Bots zurueck mit Status, Meeting-URL, created_at und ob ein DB-Eintrag existiert

### Ablauf nach Implementierung

1. Edge Function deployen
2. Function mit `action: "list-bots"`, `date_from: "2026-02-10T00:00:00Z"`, `date_to: "2026-02-10T23:59:59Z"` aufrufen
3. Ergebnisse pruefen - wenn ein Bot gefunden wird, kann dessen `bot_id` verwendet werden um ueber `sync-recording` die Daten wiederherzustellen

### Technische Details

| Aspekt | Detail |
|--------|--------|
| Datei | `supabase/functions/recall-bot-check/index.ts` |
| Recall API | `GET /api/v1/bot/?created_after=...&created_before=...` |
| Auth | Weiterhin nur fuer Admins |
| Paginierung | Recall API gibt `next`-URL zurueck, wird automatisch durchlaufen |
| DB-Abgleich | Fuer jeden Bot wird `recordings.recall_bot_id` geprueft |
| User-Filter | Optional: `recall_calendar_users` nach `user_email` abfragen, um `recall_user_id` zu erhalten und Bots zu filtern |

