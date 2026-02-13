

# Backup-Fehler beheben

## Problem

Die Backup-Integritaetspruefung meldet **74 fehlende Backups** bei 74 Recordings. Es gibt zwei Ursachen:

1. **Falsche Dateinamen-Erkennung**: Die Pruefung sucht nach `{id}.txt`, `{id}.json` oder `meeting_{id}.txt`, aber die Webhooks speichern Dateien als `{id}_{timestamp}.txt` oder `{id}_video_{timestamp}.txt`. Die Pruefung findet also auch vorhandene Backups nicht.

2. **Keine nachtraeglichen Backups**: Aeltere Recordings, die vor der Backup-Logik erstellt wurden, haben nie ein Backup erhalten.

## Loesung

### Schritt 1: Dateinamen-Erkennung in `backup-integrity-check` korrigieren

Die Edge Function prueft aktuell nur exakte Dateinamen. Stattdessen soll sie mit einem Praefix-Match arbeiten: alle Dateien im User-Ordner, die mit der Recording-ID beginnen, gelten als gefunden.

**Datei:** `supabase/functions/backup-integrity-check/index.ts`

Aenderung: Statt `possibleNames` mit exakten Namen wird geprueft, ob irgendeine Datei im Ordner mit der Recording-ID beginnt (`file.name.startsWith(rec.id)`).

### Schritt 2: Neue Edge Function `repair-all-recordings` erweitern

Eine neue Action `create-missing-backups` in der bestehenden `repair-all-recordings` Edge Function (oder eine neue Funktion), die:

1. Alle Recordings mit `status = 'done'` und vorhandenem `transcript_text` laedt
2. Fuer jedes Recording prueft, ob ein Backup im Storage existiert
3. Falls nicht, das Backup aus dem `transcript_text` der Datenbank erstellt und in `transcript-backups/{user_id}/{recording_id}_{timestamp}.txt` hochlaedt

**Datei:** `supabase/functions/repair-all-recordings/index.ts` (erweitern oder neue Funktion)

### Schritt 3: Admin-UI Button zum Erstellen fehlender Backups

Im `SecurityDashboard` einen Button "Fehlende Backups erstellen" hinzufuegen, der die neue Funktion aufruft und den Fortschritt anzeigt.

**Datei:** `src/components/admin/SecurityDashboard.tsx`

## Technische Details

### Korrektur der Dateinamen-Pruefung (Schritt 1)

```typescript
// Vorher (falsch):
const possibleNames = [
  `${rec.id}.txt`,
  `${rec.id}.json`,
  `meeting_${rec.id}.txt`,
];
const found = possibleNames.some(name => fileNames.has(name));

// Nachher (korrekt - Praefix-Match):
const found = (files || []).some(f => f.name.startsWith(rec.id));
```

### Backup-Reparatur (Schritt 2)

Die Funktion iteriert ueber alle Recordings mit Transkript, prueft ob ein Backup existiert, und erstellt fehlende Backups. Um Timeouts zu vermeiden, wird in Batches gearbeitet (z.B. 20 pro Aufruf).

### UI-Erweiterung (Schritt 3)

Ein neuer Button "Fehlende Backups erstellen" im Backup-Test-Tab, der:
- Den Reparatur-Vorgang startet
- Einen Fortschrittsbalken anzeigt
- Nach Abschluss automatisch eine neue Integritaetspruefung ausloeost

## Erwartetes Ergebnis

Nach der Umsetzung:
- Vorhandene Backups werden korrekt erkannt (Praefix-Match)
- Fehlende Backups koennen per Klick nachtraeglich erstellt werden
- Kuenftige Integritaetspruefungen zeigen den korrekten Status an
