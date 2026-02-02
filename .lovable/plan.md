
# Plan: Analyse bei manuellem Neu-Laden automatisch starten

## Problem

Aktuell wird die KI-Analyse nur gestartet, wenn ein **neues** Transkript von Recall.ai heruntergeladen wird (Zeile 626):

```typescript
if (status === 'done' && updates.transcript_text) {
  // Nur wenn neues Transkript vorhanden
}
```

Bei einem manuellen "Transkript neu laden" (`force_resync = true`) ohne neues Transkript wird die Analyse **nicht** erneut gestartet. Das bedeutet, Benutzer können Analysefehler nicht selbst beheben.

## Lösung

Die Bedingung für den Analyse-Start in `sync-recording` erweitern, sodass die Analyse auch bei `force_resync` ausgeführt wird - unabhängig davon, ob ein neues Transkript heruntergeladen wurde.

## Änderung

### Datei: `supabase/functions/sync-recording/index.ts`

**Zeile 625-626 (ca.)** - Aktuelle Bedingung:

```typescript
// 8. Wenn fertig und Transkript vorhanden, automatisch Analyse starten
if (status === 'done' && updates.transcript_text) {
```

**Neue Bedingung:**

```typescript
// 8. Wenn fertig und Transkript vorhanden (oder force_resync), automatisch Analyse starten
const hasTranscript = updates.transcript_text || recording.transcript_text;
if (status === 'done' && hasTranscript && (updates.transcript_text || force_resync)) {
```

### Logik erklärt

| Szenario | Analyse starten? |
|----------|------------------|
| Erstes Sync mit neuem Transkript | Ja (wie bisher) |
| Normales Auto-Sync ohne Änderung | Nein (wie bisher) |
| `force_resync` mit vorhandenem Transkript | **Ja (NEU!)** |

## Betroffene Datei

| Datei | Aktion |
|-------|--------|
| `supabase/functions/sync-recording/index.ts` | Bedingung für Analyse-Start erweitern |

## Ergebnis

- Der bestehende "Transkript neu laden" Button startet jetzt auch die Analyse neu
- Kein neuer Button nötig
- Benutzer können Analysefehler selbst beheben durch Klick auf "Transkript neu laden"
- Bei normalen Auto-Syncs bleibt das Verhalten unverändert (keine unnötigen Analyse-Aufrufe)
