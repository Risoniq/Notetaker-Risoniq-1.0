
# Fix: Bot tritt automatisch bei & Meetings werden nicht angezeigt/analysiert

## Problem 1: Bot tritt automatisch bei, obwohl "Automatische Aufnahme" deaktiviert ist

### Ursache

Es gibt **zwei** sich widersprechende Stellen:

1. **Datenbank-Spaltendefault** (`recall_calendar_users.recording_preferences`): Der Standardwert ist `{"record_all": true, "auto_record": true, ...}` -- also `auto_record: true`. Wenn ein neuer Nutzer erstellt wird, startet er mit aktivierter Auto-Aufnahme.

2. **Recall.ai-Synchronisation ignoriert `auto_record`**: Die Funktion `syncPreferencesToRecall` setzt **immer** `record_external: true` und `record_internal: true` bei Recall.ai, unabhaengig davon, ob `auto_record` true oder false ist. Dadurch weist Recall.ai den Bot immer an, automatisch beizutreten -- egal was der Nutzer eingestellt hat.

### Loesung

**Schritt 1: Datenbank-Default korrigieren** (Migration)

```sql
ALTER TABLE recall_calendar_users
ALTER COLUMN recording_preferences
SET DEFAULT '{"record_all": true, "auto_record": false, "record_external": true, "record_only_owned": false}'::jsonb;
```

**Schritt 2: `syncPreferencesToRecall` korrigieren**

In `supabase/functions/recall-calendar-meetings/index.ts` (Zeilen 689-698):

Aktuell:
```typescript
const recallPreferences = {
  record_non_host: false,
  record_recurring: false,
  record_external: true,        // IMMER true
  record_internal: true,        // IMMER true
  record_confirmed: false,
  record_only_host: prefs.record_only_owned ?? false,
};
```

Korrigiert:
```typescript
const autoRecord = prefs.auto_record ?? false;
const recallPreferences = {
  record_non_host: false,
  record_recurring: false,
  record_external: autoRecord ? (prefs.record_external ?? true) : false,
  record_internal: autoRecord ? true : false,
  record_confirmed: false,
  record_only_host: autoRecord ? (prefs.record_only_owned ?? false) : false,
};
```

Wenn `auto_record` aus ist, werden `record_external` und `record_internal` auf `false` gesetzt. Damit weist Recall.ai den Bot an, bei **keinem** Meeting automatisch beizutreten.

**Schritt 3: Bestehende Nutzer mit `auto_record: false` korrigieren**

Fuer alle Nutzer, die `auto_record: false` in der DB haben, aber bei Recall.ai noch mit `record_external/internal: true` konfiguriert sind, muss ein einmaliger Sync ausgeloest werden. Dies geschieht automatisch beim naechsten Laden der Einstellungsseite durch den bestehenden `update_preferences`-Flow.

---

## Problem 2: Meetings werden nicht angezeigt und analysiert

### Ursache

Die Auto-Ingestion (Zeilen 474-544 in `recall-calendar-meetings`) erstellt korrekt Recordings und triggert `sync-recording`. Es gibt aber zwei moegliche Probleme:

1. Die Auto-Ingestion wird nur beim Abruf der Meeting-Liste (`action: list`) ausgefuehrt. Wenn der Nutzer die Kalenderseite nicht oeffnet, werden Meetings von automatisch beigetretenen Bots nicht in die `recordings`-Tabelle uebernommen.

2. Sobald Problem 1 geloest ist (Bot tritt nicht mehr automatisch bei), wird dieses Problem nur noch auftreten, wenn der Nutzer bewusst Auto-Record aktiviert hat. In dem Fall funktioniert die Auto-Ingestion bereits korrekt.

### Loesung

Keine zusaetzliche Aenderung noetig. Die Auto-Ingestion funktioniert, aber erst wenn der Nutzer die Kalenderseite oeffnet. Da das Auto-Join-Problem (Problem 1) die Hauptursache ist, reicht die Korrektur dort aus. Meetings, die der Bot in der Vergangenheit automatisch beigetreten ist, werden beim naechsten Oeffnen der Kalenderseite korrekt importiert und synchronisiert.

---

## Zusammenfassung der Aenderungen

| Datei | Aenderung |
|-------|-----------|
| DB Migration | Default von `auto_record: true` auf `false` aendern |
| `supabase/functions/recall-calendar-meetings/index.ts` | `syncPreferencesToRecall` nutzt `auto_record` um `record_external`/`record_internal` zu steuern |

## Erwartetes Ergebnis

- Neue Nutzer starten mit deaktivierter Auto-Aufnahme (kein automatischer Bot-Beitritt)
- Die Einstellung "Automatische Aufnahme" steuert tatsaechlich, ob Recall.ai den Bot automatisch zu Meetings schickt
- Bestehende Nutzer mit `auto_record: false` werden beim naechsten Einstellungsaufruf korrekt synchronisiert
