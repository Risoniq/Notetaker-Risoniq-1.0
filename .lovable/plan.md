
# Plan: Titel-Persistenz & Schutz manueller Transkript-Änderungen

## Problem-Analyse

Nach der Diagnose wurden folgende Probleme identifiziert:

### Problem 1: Bestehende Recordings ohne Header
Der DB-Trigger wurde kürzlich erstellt, aber nur **1 von 5** Recordings hat den `[Meeting: ...]` Header. Das liegt daran, dass der Trigger nur bei INSERT oder UPDATE von `title` oder `transcript_text` ausgelöst wird - bestehende Daten werden nicht nachträglich aktualisiert.

### Problem 2: "Transkript neu laden" überschreibt manuelle Änderungen
Wenn `sync-recording(force_resync=true)` aufgerufen wird:
1. Das **originale Transkript von Recall.ai** wird heruntergeladen
2. Alle manuellen Sprecher-Änderungen (z.B. "Sprecher 1" → "Max Mustermann") gehen verloren
3. Das ist das eigentliche Problem: Der User ändert Namen, klickt "neu laden", und alles ist weg

### Problem 3: Titel-Schutz im Backend fehlt
Die `sync-recording` Edge Function schützt den manuell geänderten Titel nicht explizit - sie setzt ihn zwar nur wenn `recording.title` null ist, aber das genügt.

## Lösungsstrategie

### A) Einmaliges Update aller bestehenden Recordings (Migration)
Ein einmaliges Update-Script, das für alle Recordings mit Titel den `[Meeting: ...]` Header in `transcript_text` einfügt.

```sql
-- Einmaliges Update aller bestehenden Recordings
UPDATE recordings
SET transcript_text = '[Meeting: ' || title || ']' || E'\n---\n' || transcript_text
WHERE title IS NOT NULL 
  AND title != ''
  AND transcript_text IS NOT NULL
  AND transcript_text != ''
  AND transcript_text NOT LIKE '[Meeting:%';
```

### B) Warnung bei "Transkript neu laden" im Frontend
Da das Neuladen von Recall.ai **immer** das originale Transkript holt, sollten manuelle Änderungen gewarnt werden. Zwei Optionen:

**Option 1: Warndialog anzeigen**
- Vor dem Neuladen prüfen ob manuelle Änderungen vorliegen
- Dialog: "Das Transkript wird von der Quelle neu geladen. Manuelle Änderungen an Sprechernamen gehen verloren. Fortfahren?"

**Option 2: Manuelle Änderungen erhalten (komplex)**
- Einen "Rename-Log" speichern (z.B. in einem JSONB-Feld `speaker_renames`)
- Nach dem Neuladen die Renames wieder anwenden
- Vorteil: Änderungen bleiben erhalten
- Nachteil: Komplexer, kann zu Konflikten führen

**Empfehlung: Option 1** - Warndialog ist transparent und verhindert Datenverlust

### C) Titel-Schutz ist bereits implementiert
Der DB-Trigger funktioniert korrekt:
- Bei jedem Update von `transcript_text` wird der Header basierend auf `title` eingefügt
- Der `title` selbst wird von `sync-recording` nicht überschrieben (nur wenn null)

## Umsetzungsschritte

### Schritt 1: Migration für bestehende Recordings
Einmalige DB-Migration die alle Recordings mit Titel aktualisiert:
```sql
UPDATE recordings
SET transcript_text = '[Meeting: ' || title || ']' || E'\n---\n' || transcript_text
WHERE title IS NOT NULL 
  AND title != ''
  AND transcript_text IS NOT NULL
  AND transcript_text != ''
  AND NOT (transcript_text ~ '^\[Meeting:');
```

### Schritt 2: Warndialog im Frontend
In `MeetingDetail.tsx` einen Bestätigungsdialog hinzufügen bevor `syncRecordingStatus(true)` aufgerufen wird:

```typescript
const handleResync = () => {
  // Prüfen ob manuelle Änderungen vorliegen könnten
  const hasCustomSpeakers = recording?.transcript_text?.includes('Sprecher ') === false;
  
  if (hasCustomSpeakers) {
    // Dialog zeigen
    setShowResyncWarningDialog(true);
  } else {
    syncRecordingStatus(true);
  }
};
```

Dialog-Text:
> **Transkript neu laden?**
> 
> Das Transkript wird von der Aufnahmequelle neu abgerufen. 
> Manuelle Änderungen an Sprechernamen gehen dabei verloren.
> 
> Der Meeting-Titel bleibt erhalten.

### Schritt 3: Optional - Speaker-Rename-Speicherung
Falls gewünscht, kann ein JSONB-Feld `speaker_renames` zur `recordings`-Tabelle hinzugefügt werden:
```json
{
  "Sprecher 1": "Max Mustermann",
  "Sprecher 2": "Anna Schmidt"
}
```
Nach dem Resync werden die Renames wieder angewendet.

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `supabase/migrations/xxx.sql` | Einmaliges Update bestehender Recordings |
| `src/pages/MeetingDetail.tsx` | Warndialog vor Resync hinzufügen |
| `src/components/ui/alert-dialog.tsx` | (bereits vorhanden) |

## Technische Details

### Migration SQL
```sql
-- Alle bestehenden Recordings mit Titel aktualisieren
-- Der Trigger wird NICHT ausgelöst, da wir transcript_text direkt setzen
-- und der Trigger nur bei title ODER transcript_text UPDATE läuft
UPDATE recordings
SET transcript_text = '[Meeting: ' || title || ']' || E'\n---\n' || transcript_text,
    updated_at = NOW()
WHERE title IS NOT NULL 
  AND title != ''
  AND transcript_text IS NOT NULL
  AND transcript_text != ''
  AND NOT (transcript_text ~ '^\[Meeting:');
```

### MeetingDetail.tsx - Warndialog
```typescript
// State für Dialog
const [showResyncWarning, setShowResyncWarning] = useState(false);

// Handler für Resync-Button
const handleResyncClick = () => {
  // Immer Warnung zeigen bei force_resync, da Änderungen verloren gehen
  setShowResyncWarning(true);
};

// Bestätigter Resync
const confirmResync = () => {
  setShowResyncWarning(false);
  syncRecordingStatus(true);
};

// Dialog mit AlertDialog Komponente
<AlertDialog open={showResyncWarning} onOpenChange={setShowResyncWarning}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Transkript neu laden?</AlertDialogTitle>
      <AlertDialogDescription>
        Das Transkript wird von der Aufnahmequelle neu abgerufen. 
        Manuelle Änderungen an Sprechernamen gehen dabei verloren.
        Der Meeting-Titel bleibt erhalten.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
      <AlertDialogAction onClick={confirmResync}>
        Neu laden
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Erwartetes Ergebnis

| Funktion | Verhalten nach Implementierung |
|----------|-------------------------------|
| Titel-Header | Alle bestehenden Recordings haben den `[Meeting: ...]` Header |
| Titel-Änderung | Titel wird dauerhaft gespeichert, Header aktualisiert sich automatisch |
| Transkript neu laden | Warndialog erscheint, User kann abbrechen oder bestätigen |
| Sprechernamen-Änderungen | User wird gewarnt dass diese verloren gehen können |
