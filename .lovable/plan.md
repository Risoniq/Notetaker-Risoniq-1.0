

# Header-Umbau und Quick-Recording per Mikrofon-Button

## Uebersicht

Drei Aenderungen am Header der App (`AppLayout.tsx`) und ein neuer Hook fuer die Quick-Recording-Funktionalitaet:

1. **ThemeToggle** (Dark/Light-Modus) wandert von rechts nach links oben
2. **Mikrofon-Icon** (Logo) wandert von links oben nach rechts oben in die Navigation
3. **Klick auf das Mikrofon** startet sofort eine Bildschirm- und Mikrofon-Aufnahme, speichert das Ergebnis als Recording in der Datenbank und sendet es zur Transkription

## Aenderungen im Detail

### 1. Header-Layout aendern (`src/components/layout/AppLayout.tsx`)

Aktuelles Layout:
```text
[ Mic-Logo  "Meeting Recorder" ] --- [ Nav-Items ... ThemeToggle ]
```

Neues Layout:
```text
[ ThemeToggle  "Meeting Recorder" ] --- [ Nav-Items ... Mic-Button ]
```

- ThemeToggle ersetzt das Mic-Logo links neben dem Titel
- Das Mikrofon-Icon wird ein interaktiver Button rechts in der Navigation
- Waehrend einer laufenden Aufnahme zeigt der Button einen roten Puls-Indikator und ein Stop-Icon

### 2. Neuer Hook: `useQuickRecording` (`src/hooks/useQuickRecording.ts`)

Dieser Hook kapselt die gesamte Aufnahme-Logik:

- **startRecording()**: 
  - Fordert gleichzeitig `getDisplayMedia` (Bildschirm + System-Audio) und `getUserMedia` (Mikrofon) an
  - Kombiniert beide Audio-Streams in einen einzigen MediaStream via `AudioContext`
  - Startet einen `MediaRecorder` und die Web Speech API fuer Live-Transkription
  - Generiert automatisch einen Titel mit Datum/Uhrzeit (z.B. "Aufnahme 19.02.2026 14:30")

- **stopRecording()**:
  - Stoppt MediaRecorder und Speech Recognition
  - Laedt die Audio-Datei zum `transcribe-audio` Edge Function hoch (gleicher Ablauf wie `AudioUploadCard`)
  - Das Edge Function erstellt den `recordings`-Eintrag in der DB mit `source: 'manual'`, transkribiert via ElevenLabs und triggert die KI-Analyse
  - Zeigt Toast-Benachrichtigungen fuer Start, Stopp und Ergebnis

- Stellt bereit: `isRecording`, `startRecording`, `stopRecording`, `error`

### 3. Integration in AppLayout

- Der Mikrofon-Button in der Navigation nutzt `useQuickRecording`
- Klick auf den Button: Wenn nicht aufnehmend -> `startRecording()`, wenn aufnehmend -> `stopRecording()`
- Visuelles Feedback: Roter pulsierender Ring waehrend der Aufnahme, Tooltip "Schnellaufnahme starten" / "Aufnahme beenden"
- Nach erfolgreicher Aufnahme wird der User via Toast informiert und kann die Aufnahme unter "Aufnahmen" finden

### Keine Datenbank-Aenderungen noetig

Die Aufnahme wird ueber das bestehende `transcribe-audio` Edge Function verarbeitet, das bereits einen `recordings`-Eintrag mit `source: 'manual'` erstellt. Die gesamte Pipeline (Transkription, Backup, KI-Analyse, Export) laeuft automatisch.

## Zusammenfassung der Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/layout/AppLayout.tsx` | ThemeToggle nach links, Mic-Button nach rechts mit Recording-Logik |
| `src/hooks/useQuickRecording.ts` | Neuer Hook fuer Bildschirm+Mikrofon-Aufnahme mit DB-Speicherung |

