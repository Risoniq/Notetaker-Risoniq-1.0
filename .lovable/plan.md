

# Sprecher-Erkennung: Komma im Namen fehlt

## Problem-Analyse

Der Name "Sforzin, Marco" wird nicht als Sprecher in der Transkript-Anzeige erkannt, obwohl er korrekt im Transkript vorkommt.

**Ursache:** Die Regex in `src/utils/speakerColors.ts` erlaubt keine Kommas in Sprechernamen:

```typescript
// Aktuell (fehlerhaft)
const speakerPattern = /^([A-Za-zÀ-ÿ\s\-\.0-9]+?):\s/gm;
```

"Sforzin**,** Marco" enthaelt ein Komma, das nicht in der Zeichenklasse `[A-Za-zÀ-ÿ\s\-\.0-9]` enthalten ist.

**Interessant:** Die `extractParticipants` Funktion in `MeetingDetail.tsx` verwendet `/^([^:]+):/gm` - diese erfasst alles vor dem Doppelpunkt korrekt.

## Loesung

Das Komma zur Zeichenklasse in beiden Regex-Pattern in `speakerColors.ts` hinzufuegen.

## Aenderungen

**Datei:** `src/utils/speakerColors.ts`

### Aenderung 1: extractSpeakersInOrder (Zeile 33)

**Von:**
```typescript
const speakerPattern = /^([A-Za-zÀ-ÿ\s\-\.0-9]+?):\s/gm;
```

**Zu:**
```typescript
const speakerPattern = /^([A-Za-zÀ-ÿ\s\-\.,0-9]+?):\s/gm;
```

### Aenderung 2: parseTranscriptWithColors (Zeile 68)

**Von:**
```typescript
const match = line.match(/^([A-Za-zÀ-ÿ\s\-\.0-9]+?):\s(.*)$/);
```

**Zu:**
```typescript
const match = line.match(/^([A-Za-zÀ-ÿ\s\-\.,0-9]+?):\s(.*)$/);
```

## Ergebnis

Nach dieser Aenderung:
- **"Sforzin, Marco"** wird korrekt als eigener Sprecher erkannt
- Beide Sprecher bekommen unterschiedliche Farben (Blau und Gruen)
- Die Transkript-Ansicht zeigt alle Sprecherwechsel korrekt an

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/utils/speakerColors.ts` | Komma (`,`) zu beiden Regex-Zeichenklassen hinzufuegen |

