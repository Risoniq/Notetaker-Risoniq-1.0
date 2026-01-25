
# Veraltete "Meeting läuft" Anzeigen bereinigen

## Problem-Analyse

In der Datenbank befinden sich viele Aufnahmen mit Status `joining`, `pending` oder `recording`, die über Wochen oder sogar einen Monat alt sind. Diese werden in der RecordingCard fälschlicherweise als "Meeting läuft..." angezeigt.

**Beispiele aus der Datenbank:**
- Aufnahme vom 16.12.2025 mit Status "joining"
- Aufnahme vom 13.01.2026 mit Status "joining"
- Aufnahme vom 19.01.2026 mit Status "joining"

## Lösungsansatz

### 1. Frontend: Zeitbasierte Erkennung von veralteten Meetings

**Datei: `src/components/recordings/RecordingCard.tsx`**

Füge eine Logik hinzu, die Meetings als "Abgebrochen" oder "Zeitüberschreitung" markiert, wenn sie einen aktiven Status haben, aber älter als 4 Stunden sind:

```typescript
const isStale = ['pending', 'joining', 'recording'].includes(recording.status) && 
  (Date.now() - new Date(recording.created_at).getTime()) > 4 * 60 * 60 * 1000; // 4 Stunden
```

- Wenn `isStale` true ist, zeige "Zeitüberschreitung" statt "Meeting läuft..."
- Ändere die Badge-Farbe auf grau oder orange für veraltete Einträge

### 2. Backend: Automatische Bereinigung alter aktiver Aufnahmen

**Neue Datei: `supabase/functions/cleanup-stale-recordings/index.ts`**

Eine Edge Function, die alte Aufnahmen mit aktiven Status automatisch auf "error" oder "timeout" setzt:

- Findet alle Recordings mit Status `pending`, `joining`, `recording`
- Deren `created_at` älter als 4 Stunden ist
- Setzt deren Status auf `timeout` oder `error`

### 3. Einmalige Datenbank-Bereinigung

Ein SQL-Statement, das alle bestehenden veralteten Aufnahmen bereinigt:

```sql
UPDATE recordings 
SET status = 'timeout', updated_at = NOW()
WHERE status IN ('pending', 'joining', 'recording')
AND created_at < NOW() - INTERVAL '4 hours';
```

### 4. Status-Typ erweitern

**Datei: `src/types/recording.ts`**

Füge `timeout` als neuen Status hinzu mit entsprechendem Label und Farbe:

- Label: "Zeitüberschreitung"
- Farbe: Gedämpftes Orange/Grau

## Änderungen im Detail

| Datei | Änderung |
|-------|----------|
| `src/components/recordings/RecordingCard.tsx` | Zeitbasierte Erkennung und angepasste Anzeige für veraltete Meetings |
| `src/types/recording.ts` | Neuen Status `timeout` hinzufügen |
| `supabase/functions/cleanup-stale-recordings/index.ts` | Neue Edge Function für automatische Bereinigung |
| Datenbank-Migration | SQL zur einmaligen Bereinigung + optionaler Cron-Job |

## Ergebnis

- Vergangene Meetings mit hängendem Status werden korrekt als "Zeitüberschreitung" angezeigt
- Der Bot versucht nicht mehr, diesen Meetings beizutreten
- Neue Meetings werden nach 4 Stunden automatisch als timeout markiert
- Die Aufnahmen-Liste zeigt nur noch relevante Status an
