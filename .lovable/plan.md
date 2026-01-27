

# Teilnehmeranzahl nur mit echten Usern zaehlen

## Uebersicht

Die Teilnehmeranzahl soll ueberall im System nur tatsaechliche Meeting-Teilnehmer zaehlen und Bots/Notetaker ausschliessen. Aktuell filtert `MeetingDetail.tsx` bereits korrekt, aber `TranscriptCard.tsx` zeigt alle Teilnehmer inklusive Bots an.

## Analyse der betroffenen Komponenten

| Komponente | Aktueller Zustand | Aenderung noetig |
|------------|-------------------|------------------|
| `MeetingDetail.tsx` | Filtert Bots mit `isBot()` Funktion | Nein |
| `TranscriptCard.tsx` | Keine Filterung (`participants?.length`) | Ja |
| `UpcomingMeetings.tsx` | Zeigt Kalender-Teilnehmer (nicht Recordings) | Nein |
| `RecordingCard.tsx` | Zeigt keine Teilnehmeranzahl | Nein |

## Loesung

Eine wiederverwendbare Utility-Funktion erstellen und in `TranscriptCard.tsx` anwenden.

### 1. Neue Utility-Funktion erstellen

**Datei:** `src/utils/participantUtils.ts` (neue Datei)

```typescript
// Bot/Notetaker-Erkennung
const BOT_PATTERNS = ['notetaker', 'bot', 'recording', 'assistant', 'meetingbot'];

export const isBot = (name: string): boolean => {
  const lowercaseName = name.toLowerCase();
  return BOT_PATTERNS.some(pattern => lowercaseName.includes(pattern));
};

export interface Participant {
  id: string;
  name: string;
}

// Filtert Bots aus Teilnehmerliste
export const filterRealParticipants = (
  participants: Participant[] | null | undefined
): Participant[] => {
  if (!participants || !Array.isArray(participants)) return [];
  return participants.filter(p => p.name && !isBot(p.name));
};

// Zaehlt nur echte Teilnehmer
export const countRealParticipants = (
  participants: Participant[] | null | undefined
): number => {
  return filterRealParticipants(participants).length;
};
```

### 2. TranscriptCard.tsx aktualisieren

**Datei:** `src/components/transcripts/TranscriptCard.tsx`

**Zeile 49 aendern von:**
```typescript
const participantCount = recording.participants?.length ?? 0;
```

**Zu:**
```typescript
import { countRealParticipants } from "@/utils/participantUtils";
// ...
const participantCount = countRealParticipants(recording.participants);
```

### 3. MeetingDetail.tsx refaktorieren (optional)

Die bestehende `isBot()` Funktion in `MeetingDetail.tsx` (Zeilen 486-489) kann durch den Import aus `participantUtils.ts` ersetzt werden, um Code-Duplikation zu vermeiden.

## Ergebnis

Nach dieser Aenderung:
- Die Teilnehmeranzahl in der Transkript-Uebersicht zeigt nur echte Meeting-Teilnehmer
- Bots wie "Notetaker", "Recording Bot", "Assistant" werden nicht gezaehlt
- Die Logik ist zentral und wiederverwendbar fuer zukuenftige Komponenten

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/utils/participantUtils.ts` | Neue Datei mit Bot-Filter-Logik |
| `src/components/transcripts/TranscriptCard.tsx` | Import und Nutzung von `countRealParticipants` |
| `src/pages/MeetingDetail.tsx` | Optional: Import statt lokaler `isBot()` Funktion |

