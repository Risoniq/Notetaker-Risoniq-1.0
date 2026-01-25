
# Desktop-App aus dem Dashboard entfernen

## Änderungen

**Datei: `src/pages/Index.tsx`**

1. **Import entfernen** (Zeile 6):
   ```typescript
   // ENTFERNEN:
   import { DesktopRecordingTab } from "@/components/desktop/DesktopRecordingTab";
   ```

2. **Komponenten-Aufruf entfernen** (Zeile 91-92):
   ```tsx
   // ENTFERNEN:
   {/* Desktop-Aufnahme */}
   <DesktopRecordingTab />
   ```

## Ergebnis

Nach der Änderung wird das Dashboard nur noch folgende Bereiche anzeigen:
- Quota-Fortschrittsbalken
- Header mit Aktualisieren-Button
- Bot-Steuerung (QuickMeetingJoin)
- Aktive Aufnahme (wenn vorhanden)
- Letzte Aktivitäten & Aufnahmen Grid

Die `DesktopRecordingTab`-Komponente und der zugehörige Ordner `src/components/desktop/` bleiben erhalten, falls die Funktion später wieder benötigt wird.
