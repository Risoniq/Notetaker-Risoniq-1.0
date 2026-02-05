

# Plan: Konsistente Sprechererkennung und Teilnehmerzaehlung

## Problem-Analyse

Aktuell gibt es **Inkonsistenzen** zwischen der Teilnehmerzaehlung an verschiedenen Stellen:

### 1. MeetingDetail.tsx (Zeile 569-608)
- Berechnet `participantCount` mit **eigener Logik**
- Hat eine lokale `isBot()` Funktion
- Hat eine lokale `extractParticipants()` Funktion
- Nutzt NICHT die zentrale `participantUtils.ts`

### 2. RecordingCard.tsx
- Zeigt **keine** Teilnehmerzahl an
- Keine Integration mit participantUtils

### 3. deepDiveAnalysis.ts (Zeile 116-157)
- Hat eine **eigene** Sprecher-Extraktionslogik in `analyzeSpeakerShares()`
- Filtert Metadaten-Felder korrekt
- Aber nutzt nicht die zentrale Utils

### 4. participantUtils.ts
- Hat zentrale Funktionen: `isBot()`, `getParticipantCountWithFallback()`, `extractParticipantsFromTranscript()`
- Wird aber **nicht ueberall genutzt**

## Loesung: Zentralisierung der Sprecherlogik

### Schritt 1: participantUtils.ts erweitern

Neue Funktionen hinzufuegen:

```text
1. isMetadataField(name: string): boolean
   - Prueft ob ein "Sprecher" eigentlich ein Metadaten-Header ist
   - z.B. "User-ID", "User-Email", "Recording-ID", "Erstellt"

2. extractSpeakersWithStats(transcript: string): SpeakerStats[]
   - Extrahiert alle Sprecher MIT Wortanzahl und Vorkommen
   - Filtert Bots und Metadaten automatisch
   - Gibt konsistente Daten fuer Dashboard und Detail

3. getConsistentParticipantCount(recording: Recording): { count: number; names: string[] }
   - Single Source of Truth fuer Teilnehmerzaehlung
   - Nutzt DB-Teilnehmer falls vorhanden
   - Fallback auf Transkript-Extraktion
   - Immer konsistentes Ergebnis
```

### Schritt 2: MeetingDetail.tsx refaktorieren

Ersetze die lokale Logik (Zeilen 541-608) durch zentrale Utils:

```text
VORHER (lokal):
  const extractParticipants = (transcript) => { ... }
  const isBot = (name) => { ... }
  let participantCount = 0;
  // ... 60 Zeilen lokale Berechnung

NACHHER (zentral):
  import { getConsistentParticipantCount } from '@/utils/participantUtils';
  
  const { count: participantCount, names: participantNames } = 
    getConsistentParticipantCount(recording);
```

### Schritt 3: deepDiveAnalysis.ts integrieren

Die `analyzeSpeakerShares()` Funktion soll:
- `extractSpeakersWithStats()` aus participantUtils nutzen
- Konsistente Bot/Metadaten-Filterung anwenden

### Schritt 4: Metadaten-Header Filter verbessern

Das Backend fuegt einen Header hinzu:
```text
[Meeting-Info]
User-ID: xxx
User-Email: xxx
Recording-ID: xxx
Erstellt: xxx
---
```

Die Sprechererkennung muss diesen Header **vor** der Analyse entfernen.

### Schritt 5: RecordingCard Teilnehmeranzeige (optional)

Falls gewuenscht: Teilnehmeranzahl auch in der Kartenuebersicht anzeigen.

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/utils/participantUtils.ts` | Neue Funktionen: `isMetadataField`, `extractSpeakersWithStats`, `getConsistentParticipantCount` |
| `src/pages/MeetingDetail.tsx` | Ersetze lokale Logik durch zentrale Utils (Zeilen 541-608) |
| `src/utils/deepDiveAnalysis.ts` | Integriere participantUtils fuer konsistente Filterung |
| `src/components/recordings/RecordingCard.tsx` | (Optional) Teilnehmerzahl anzeigen |

## Technische Details

### Neue Funktion: getConsistentParticipantCount

```text
export interface ParticipantResult {
  count: number;
  names: string[];
  source: 'database' | 'transcript' | 'fallback';
}

export const getConsistentParticipantCount = (
  recording: {
    participants?: Participant[] | null;
    transcript_text?: string | null;
  }
): ParticipantResult => {
  // 1. Versuche DB-Teilnehmer (ohne Bots)
  if (recording.participants?.length) {
    const realParticipants = filterRealParticipants(recording.participants);
    if (realParticipants.length > 0) {
      return {
        count: realParticipants.length,
        names: realParticipants.map(p => p.name),
        source: 'database'
      };
    }
  }
  
  // 2. Fallback: Extrahiere aus Transkript
  if (recording.transcript_text) {
    const extracted = extractParticipantsFromTranscript(recording.transcript_text);
    if (extracted.length > 0) {
      return {
        count: extracted.length,
        names: extracted.map(p => p.name),
        source: 'transcript'
      };
    }
  }
  
  // 3. Absoluter Fallback
  return { count: 0, names: [], source: 'fallback' };
};
```

### Metadaten-Filter

```text
const METADATA_PATTERNS = [
  /^\[Meeting-Info\]$/i,
  /^User-ID:/i,
  /^User-Email:/i,
  /^Recording-ID:/i,
  /^Erstellt:/i,
  /^---$/,
];

export const isMetadataField = (name: string): boolean => {
  const trimmed = name.trim();
  return METADATA_PATTERNS.some(pattern => pattern.test(trimmed));
};

export const stripMetadataHeader = (transcript: string): string => {
  const separatorIndex = transcript.indexOf('---\n');
  if (separatorIndex > -1 && separatorIndex < 500) {
    // Header ist am Anfang, entfernen
    return transcript.slice(separatorIndex + 4).trimStart();
  }
  return transcript;
};
```

## Erwartetes Ergebnis

Nach der Implementierung:
1. **Konsistente Teilnehmerzahl** auf MeetingDetail-Seite
2. **Gleiche Anzahl** in Deep-Dive-Analyse
3. **Keine Metadaten-Felder** als Sprecher gezaehlt
4. **Bots automatisch gefiltert** an allen Stellen
5. **Fallback-Logik** wenn DB keine Teilnehmer hat

## Beispiel-Szenario

Meeting mit 6 echten Teilnehmern:
- Dominik Bauer
- Fabian Becker  
- Jacqueline Gans
- Maren Goerge
- Simone Manske
- Katja Beier-Nies

```text
VORHER (inkonsistent):
  Dashboard: 0 Teilnehmer (participants null)
  MeetingDetail: 2 Teilnehmer (Sprecher 1, Sprecher 2)
  Deep Dive: 8 Sprecher (inkl. Metadaten)

NACHHER (konsistent):
  Dashboard: 6 Teilnehmer (aus Transkript extrahiert)
  MeetingDetail: 6 Teilnehmer (gleiche Logik)
  Deep Dive: 6 Sprecher (gefiltert)
```

## Implementierungsreihenfolge

1. **participantUtils.ts** - Neue zentrale Funktionen
2. **MeetingDetail.tsx** - Lokale Logik durch zentrale ersetzen
3. **deepDiveAnalysis.ts** - Integration mit participantUtils
4. **Test** - Meeting "KI Training fuer Autohaendler" pruefen

