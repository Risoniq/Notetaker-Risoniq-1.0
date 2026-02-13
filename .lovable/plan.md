

## Konsistente To-Do-Extraktion bei Transkript-Neuanalyse

### Problem

Der KI-Prompt in `analyze-transcript` gibt keine klare Anweisung zur exakten Anzahl und Auswahl der Action Items. Die Formulierung "Konkrete Action Items mit Verantwortlichen" laesst dem Modell zu viel Spielraum:
- Mal werden implizite Aufgaben als To-Dos interpretiert, mal nicht
- Allgemeine Aussagen ("wir sollten mal...") werden inkonsistent als Action Item gewertet
- Die Temperatur des Modells fuehrt zu unterschiedlichen Ergebnissen

### Loesung

Den System-Prompt in `supabase/functions/analyze-transcript/index.ts` praezisieren, um die Extraktion deterministischer zu machen.

### Aenderung

**Datei:** `supabase/functions/analyze-transcript/index.ts` (Zeilen 198-204)

Der Abschnitt fuer Action Items wird wie folgt verschaerft:

Vorher:
```
Konkrete Action Items mit Verantwortlichen

WICHTIGE REGELN FUER ACTION ITEMS:
- Extrahiere die Namen der verantwortlichen Personen DIREKT aus dem Transkript
- Wenn eine Person eine Aufgabe uebernimmt oder zugewiesen bekommt, nutze deren Namen
- Wenn im Transkript keine konkrete Person genannt wird, schreibe "Verantwortlicher: Nicht zugewiesen"
- Format fuer Action Items: "Aufgabenbeschreibung (Verantwortlicher: [Name])"
```

Nachher:
```
Konkrete Action Items mit Verantwortlichen

WICHTIGE REGELN FUER ACTION ITEMS:
- Extrahiere NUR explizit formulierte Aufgaben, Zusagen oder Vereinbarungen aus dem Transkript
- Eine Aufgabe muss klar als solche erkennbar sein (z.B. "ich kuemmere mich um...", "bitte schick mir...", "wir muessen noch...", "bis naechste Woche...")
- Allgemeine Ueberlegungen, Wuensche oder vage Absichten ("man koennte mal...", "waere schoen wenn...") sind KEINE Action Items
- Extrahiere die Namen der verantwortlichen Personen DIREKT aus dem Transkript (z.B. "Speaker 1", "Max", "Anna", etc.)
- Wenn eine Person eine Aufgabe uebernimmt oder zugewiesen bekommt, nutze deren Namen aus dem Transkript
- Wenn im Transkript keine konkrete Person genannt wird, die die Aufgabe uebernimmt, schreibe "Verantwortlicher: Nicht zugewiesen" statt "Unbekannt"
- Format fuer Action Items: "Aufgabenbeschreibung (Verantwortlicher: [Name aus Transkript])"
- Sei STRIKT und KONSISTENT: Bei identischem Transkript muessen immer die gleichen Action Items extrahiert werden
- Im Zweifel WENIGER Action Items extrahieren - nur eindeutige Aufgaben zaehlen
```

Zusaetzlich wird dem API-Aufruf der Parameter `temperature: 0` hinzugefuegt (Zeile ~232), um die Ausgabe des Modells deterministischer zu machen:

```typescript
body: JSON.stringify({
  model: 'google/gemini-2.5-flash',
  temperature: 0,    // NEU: Deterministische Ausgabe
  messages: [...]
})
```

### Zusammenfassung der Aenderungen

| Was | Wo | Warum |
|---|---|---|
| Strengere Prompt-Regeln | System-Prompt, Zeilen 198-204 | Nur explizite Aufgaben, keine vagen Absichten |
| `temperature: 0` | API-Aufruf, Zeile ~232 | Gleicher Input = gleicher Output |

Diese zwei Aenderungen zusammen sorgen dafuer, dass bei wiederholter Analyse desselben Transkripts konsistente To-Dos extrahiert werden.
