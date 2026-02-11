

## Fix: Hängende "Stellantis GAV" Transkription reparieren

### Ursache des Problems

Das Recording (79 Minuten, source: bot) wurde irgendwann ueber die "Video transkribieren"-Funktion (`transcribe-video`) verarbeitet. Diese setzt den Status auf `'transcribing'` und startet die ElevenLabs-Transkription im Hintergrund. Bei einem 79-Minuten-Video ist die Datei zu gross -- die Background-Funktion wurde durch `WORKER_LIMIT` (zu wenig Ressourcen) abgebrochen, bevor der `catch`-Block den Status auf `'error'` zuruecksetzen konnte. Das Recording haengt jetzt dauerhaft im Status `'transcribing'` ohne Transkript.

### Loesung (2 Schritte)

**Schritt 1: Sofort-Fix -- sync-recording auslösen**

Da das Recording eine `recall_bot_id` hat (source: bot), kann `sync-recording` den echten Status bei Recall.ai abfragen und das Transkript von dort herunterladen -- unabhaengig vom aktuellen DB-Status. Mit dem gerade deployten UI-Fix (der "Transkript neu laden"-Button ist jetzt auch bei Status `'transcribing'` sichtbar) kann der Button geklickt werden, um die Daten von Recall.ai neu zu laden.

Falls der Button nicht funktioniert oder der Recall.ai-Bot noch nicht fertig ist, setzen wir den Status direkt per SQL auf `'done'` zurueck und triggern sync-recording mit `force_resync`.

**Schritt 2: Code-Fix -- transcribe-video robuster machen**

Das `transcribe-video` Edge Function muss gegen WORKER_LIMIT-Abstuerze abgesichert werden:

1. **Vor dem Start** den aktuellen Status in der DB merken, damit bei einem Absturz der alte Status wiederhergestellt werden kann
2. **Timeout-Schutz**: Fuer Bot-Recordings mit Video ueber 60 Minuten eine Warnung ausgeben oder die Verarbeitung ablehnen, da die Edge Function das nicht in der verfuegbaren Zeit schafft
3. **Status-Reset bei Fehler**: Sicherstellen, dass der `catch`-Block auch bei WORKER_LIMIT-Fehlern ausgefuehrt wird (was bei harten Kills nicht moeglich ist), daher alternativ: Den Status erst auf `'transcribing'` setzen, nachdem der Video-Download erfolgreich war

### Technische Details

| Datei | Aenderung |
|---|---|
| `supabase/functions/transcribe-video/index.ts` | Groessenprüfung hinzufuegen: Videos ueber ~500MB oder Recordings mit duration > 3600s ablehnen mit Fehlermeldung. Status erst nach erfolgreichem Download setzen. |
| `src/pages/MeetingDetail.tsx` | "Video transkribieren"-Button nur anzeigen, wenn duration < 3600 oder eine Warnung anzeigen bei langen Meetings |

### Sofort-Massnahme

Das aktuelle Recording wird durch Aufruf von `sync-recording` mit `force_resync: true` repariert. Falls Recall.ai das Transkript bereithaelt, wird es heruntergeladen und der Status auf `'done'` gesetzt.

