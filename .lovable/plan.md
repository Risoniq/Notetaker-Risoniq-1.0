

# Fix: IndexedDB-Retry und Aufnahme-Schutz

## Analyse

### 1. IndexedDB-Retry fehlt komplett
Der einzige Retry-Code fuer fehlgeschlagene Uploads steht in `MeetingNoteTaker.tsx` -- diese Komponente ist **nicht geroutet** (Dead Code). Das bedeutet: Wenn ein Upload fehlschlaegt und in IndexedDB gesichert wird, wird er **nie** automatisch nachgeholt.

### 2. Session-Timeout waehrend Aufnahme
`AppLayout.tsx` uebergibt bereits `paused: isRecording` an `useSessionTimeout`. Das schuetzt **Schnellaufnahmen** korrekt. Allerdings: Wenn der Notetaker (Mikrofon/Tab) als eigene Route reaktiviert wuerde, waere er nicht geschuetzt.

### 3. Wiederherstellung der verlorenen Aufnahme
Die Aufnahme liegt moeglicherweise noch im IndexedDB des Browsers unter dem Key `recording-{timestamp}`. Ohne den Retry-Mechanismus wird sie dort nie hochgeladen.

## Loesung

### A. Globalen IndexedDB-Retry in `QuickRecordingProvider` einbauen
- Beim Mount (nach Auth-Check) `getPendingIds()` aufrufen
- Fuer jede pending Blob: Upload via `transcribe-audio` Edge Function ausfuehren
- Bei Erfolg: `deleteBlob()`, Toast-Benachrichtigung
- Bei Fehler: Blob in IndexedDB belassen, Warnung loggen
- Zusaetzlich: Toast beim App-Start anzeigen wenn pending Uploads existieren ("X Aufnahmen warten auf Upload")

### B. Sichtbare Warnung bei pending Uploads
- In `AppLayout` oder Dashboard: Banner/Toast wenn `getPendingIds()` > 0 zurueckgibt
- Button "Jetzt hochladen" der den Retry manuell ausloest

### C. Session-Timeout: Bereits korrekt implementiert
- `useSessionTimeout({ paused: isRecording })` in AppLayout pausiert den Timeout waehrend aktiver QuickRecording-Aufnahmen
- Keine Aenderung noetig -- nur Bestaetigung dass es funktioniert

## Betroffene Dateien
- `src/contexts/QuickRecordingContext.tsx` -- Retry-Logik beim Mount hinzufuegen
- `src/components/layout/AppLayout.tsx` -- Pending-Upload-Banner anzeigen

