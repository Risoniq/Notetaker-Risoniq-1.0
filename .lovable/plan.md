

# Verbesserung der To-Do/Action-Item-Erkennung

## Problem

Aktuell werden zu viele Action Items erkannt. Einzelne Kommentare oder beilaeufige Erwahnungen loesen bereits To-Dos aus, obwohl sie keine echten Aufgaben sind. Es fehlt eine striktere Unterscheidung zwischen:
- Echten, zugewiesenen Aufgaben ("Max, kannst du bis Freitag den Bericht schicken?")
- Beilaeufigen Kommentaren ("Man koennte mal darueber nachdenken...")

## Betroffene Stellen

Es gibt **zwei** Stellen, die Action Items generieren:

1. **KI-basierte Analyse** (`supabase/functions/analyze-transcript/index.ts`, Zeilen 200-209): Der System-Prompt fuer die KI-Analyse. Dies ist die primaere und wichtigste Stelle, da sie fuer alle Bot-Aufnahmen und Audio-Uploads greift.

2. **Lokale Fallback-Analyse** (`src/utils/meetingAnalysis.ts`, Zeilen 17-24): Einfache Keyword-Suche (z.B. "muss", "soll", "todo") als Fallback. Diese ist sehr ungenau und erkennt jeden Satz mit diesen Woertern als Action Item.

## Loesung

### Aenderung 1: KI-Prompt verschaerfen (Edge Function)

**Datei:** `supabase/functions/analyze-transcript/index.ts`

Der Action-Items-Abschnitt im System-Prompt (Zeilen 200-209) wird durch deutlich strengere Kriterien ersetzt:

```
WICHTIGE REGELN FUER ACTION ITEMS:
- Ein Action Item ist NUR eine konkrete, umsetzbare Aufgabe, die EXPLIZIT
  vereinbart, zugesagt oder zugewiesen wurde
- Es muessen MINDESTENS zwei der folgenden Kriterien erfuellt sein:
  a) Klare Handlung (z.B. "schicken", "erstellen", "pruefen", "organisieren")
  b) Verantwortliche Person (namentlich genannt oder "ich mache das")
  c) Zeitrahmen oder Deadline (z.B. "bis Freitag", "naechste Woche")
- KEINE Action Items aus:
  - Allgemeinen Ueberlegungen ("man koennte...", "waere gut wenn...")
  - Wuenschen oder Hoffnungen ("ich hoffe...", "vielleicht...")
  - Einzelnen Kommentaren oder Meinungsaeusserungen
  - Wiederholungen desselben Punkts (nur einmal erfassen)
  - Kontextlosen Erwahnungen von Taetigkeiten in der Vergangenheit
- Fasse zusammengehoerige Aufgaben zu EINEM Action Item zusammen
- Maximal 8 Action Items pro Meeting - nur die wichtigsten
- Im Zweifel ist es KEIN Action Item
```

### Aenderung 2: Lokale Analyse verbessern (Frontend-Fallback)

**Datei:** `src/utils/meetingAnalysis.ts`

Die einfache Keyword-Suche wird durch eine strengere Logik ersetzt, die mindestens zwei Indikatoren pro Satz erfordert (z.B. ein Aktionswort UND ein Verantwortlichkeits-Indikator), anstatt bei jedem Vorkommen von "muss" oder "soll" einen Action Item zu erstellen.

## Erwartetes Ergebnis

- Deutlich weniger, aber praezisere Action Items
- Nur echte Vereinbarungen und Zusagen werden erfasst
- Beilaeufige Kommentare loesen keine To-Dos mehr aus
- Zusammengehoerige Aufgaben werden gebundelt statt einzeln aufgelistet

