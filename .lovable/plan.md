
# Plan: Race Condition bei Transkript-Analyse beheben

## Problem identifiziert

Die Logs zeigen eindeutig das Problem:

```
12:51:21Z INFO No transcript available for analysis
12:51:21Z INFO No transcript available for analysis
12:51:21Z INFO No transcript available for analysis
12:51:37Z INFO Transcript length: 41724 characters  ← Erst später funktioniert es
12:51:40Z INFO Analysis saved successfully
```

**Ursache**: In `sync-recording/index.ts` wird die Analyse-Funktion (Zeile 625-647) aufgerufen, **bevor** das Transkript in der Datenbank gespeichert wird (Zeile 724-728).

Die `analyze-transcript` Funktion liest das Transkript aus der Datenbank:
```typescript
const { data: recording } = await supabase
  .from('recordings')
  .select('transcript_text, ...')
  .eq('id', recording_id)
  .single();
```

Aber `transcript_text` steht noch in `updates` und wurde noch nicht mit `.update(updates)` gespeichert!

## Ablauf aktuell (fehlerhaft)

```text
1. sync-recording lädt Transkript von Recall.ai
2. Transkript wird in 'updates.transcript_text' gespeichert (nur im Speicher!)
3. → analyze-transcript wird aufgerufen
4. → analyze-transcript liest DB → transcript_text ist NULL → FEHLER!
5. Erst danach: DB wird aktualisiert mit updates
```

## Lösung

Die Datenbank muss **vor** dem Analyse-Aufruf aktualisiert werden.

### Datei: `supabase/functions/sync-recording/index.ts`

**Änderung**: Den Datenbank-Update-Block (Zeilen 724-736) **vor** den Analyse-Aufruf (Zeilen 625-647) verschieben.

Neuer Ablauf:
```text
1. sync-recording lädt Transkript von Recall.ai
2. Transkript wird in 'updates.transcript_text' gespeichert
3. → DB wird aktualisiert mit updates (transcript_text ist jetzt in DB!)
4. → analyze-transcript wird aufgerufen
5. → analyze-transcript liest DB → transcript_text ist vorhanden → ERFOLG!
```

## Konkrete Änderungen

Aktueller Code-Ablauf (vereinfacht):
```typescript
// Zeile 625-647: Analyse starten (ZU FRÜH!)
if (status === 'done' && hasTranscript && ...) {
  await fetch('analyze-transcript', { recording_id: id })
}

// Zeile 649-722: Export an externe API

// Zeile 724-736: DB aktualisieren (ZU SPÄT!)
await supabase.from('recordings').update(updates).eq('id', id)
```

Neuer Code-Ablauf:
```typescript
// ZUERST: DB aktualisieren
const { error: updateError } = await supabase
  .from('recordings')
  .update(updates)
  .eq('id', id)

if (updateError) { ... return error ... }

// DANN: Analyse starten (jetzt ist transcript_text in der DB!)
if (status === 'done' && hasTranscript && (updates.transcript_text || force_resync)) {
  await fetch('analyze-transcript', { recording_id: id })
}

// DANN: Export an externe API
if (status === 'done' && ...) {
  // Export-Logik
}
```

## Betroffene Datei

| Datei | Aktion |
|-------|--------|
| `supabase/functions/sync-recording/index.ts` | Reihenfolge: DB-Update vor Analyse-Aufruf |

## Warum das Admin-Neuladen funktioniert

Wenn du als Admin manuell "Transkript neu laden" klickst:
1. Das erste Sync speichert `transcript_text` in der DB (aber Analyse schlägt fehl)
2. Beim zweiten Sync (`force_resync=true`) ist `transcript_text` bereits in `recording.transcript_text` (aus der DB)
3. Die Analyse findet das Transkript und funktioniert

Das erklärt, warum es beim zweiten Mal klappt!

## Ergebnis nach der Änderung

- Transkripte werden beim ersten Sync korrekt analysiert
- Keine manuellen Admin-Eingriffe mehr nötig
- Die Analyse-Ergebnisse erscheinen sofort im Dashboard
- Der bestehende "Transkript neu laden" Button funktioniert weiterhin als Backup
