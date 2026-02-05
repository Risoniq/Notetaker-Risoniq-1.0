

# Plan: Verbesserung der Sprecherzuordnung im Transkript

## Problem-Analyse

Das Meeting "KI Training fuer Autohaeaendler" zeigt fragmentierte Sprecherabschnitte:
- Kurze Einwuerfe wie `Fabian Becker: Ihnen` oder `Beier-Nies, Katja (K.): aus,` werden als separate Zeilen angezeigt
- Diese Fragmente sind eigentlich Teile laengerer Aussagen, die durch kurze Zwischenrufe anderer Personen unterbrochen wurden
- Das Problem entsteht durch die Art, wie Recall.ai die Audio-Segmente erkennt

## Ursache

Recall.ai nutzt Voice Activity Detection (VAD), die bei kurzen Sprechpausen oder Sprecherwechseln neue Segmente erstellt. Das fuehrt zu:
- Sehr kurzen Einzel-Wort-Segmenten
- Fragmentierten Saetzen
- Schwer lesbaren Transkripten

## Loesungsansatz

### Option 1: Frontend-Zusammenfuehrung (empfohlen)

Aufeinanderfolgende Segmente desselben Sprechers werden in der Darstellung zusammengefuehrt, waehrend die urspruenglichen Daten erhalten bleiben.

**Vorteile:**
- Keine Aenderung an den Originaldaten
- Schnell umsetzbar
- Rueckwaertskompatibel

### Option 2: Backend-Optimierung bei Sync

Segmente werden bereits beim Import aus Recall.ai intelligent zusammengefuehrt, basierend auf Zeitluecken und Sprecheridentitaet.

**Vorteile:**
- Saubere Daten in der Datenbank
- Einmalige Verarbeitung

## Technische Umsetzung

### Aenderung 1: speakerColors.ts - Segment-Zusammenfuehrung

Die Funktion `parseTranscriptWithColors` wird erweitert, um aufeinanderfolgende kurze Segmente desselben Sprechers zusammenzufuehren:

```text
VORHER:
  Fabian Becker: Ihnen
  Beier-Nies, Katja (K.): das schon in irgendeiner Form...
  Fabian Becker: aber trotzdem
  Beier-Nies, Katja (K.): solltest du noch gerne was sagen

NACHHER (optional zusammengefuehrt bei gleichem Sprecher):
  Fabian Becker: Ihnen ... aber trotzdem
  Beier-Nies, Katja (K.): das schon in irgendeiner Form... solltest du noch gerne was sagen
```

### Aenderung 2: Neue Funktion "Kurze Einwuerfe hervorheben"

Statt Zusammenfuehrung koennen kurze Einwuerfe (unter 5 Woerter) visuell anders dargestellt werden:
- Kleinere Schrift
- Graue/dezente Farbe
- Inline-Darstellung statt Blockdarstellung

### Aenderung 3: sync-recording/index.ts - Optionale Segmentzusammenfuehrung

Beim Abrufen des Transkripts von Recall.ai werden aufeinanderfolgende Segmente desselben Sprechers zusammengefuehrt, wenn der Zeitabstand unter 2 Sekunden liegt.

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/utils/speakerColors.ts` | Neue Funktion `mergeConsecutiveSpeakerSegments` |
| `src/components/transcript/ColoredTranscript.tsx` | Option zur Zusammenfuehrung oder Inline-Darstellung kurzer Einwuerfe |
| `supabase/functions/sync-recording/index.ts` | Optionale Zusammenfuehrung beim Import (mit Zeitstempel-Pruefung) |

## Implementierungsoptionen

### Variante A: Nur Frontend (schnell)

Zusammenfuehrung nur in der Anzeige - Originaldaten bleiben unveraendert.

Vorteil: Schnell, rueckwaertskompatibel
Nachteil: Jedes Mal bei Darstellung berechnet

### Variante B: Backend-Optimierung (nachhaltig)

Zusammenfuehrung bereits beim Speichern in die Datenbank.

Vorteil: Saubere Daten, einmalige Berechnung
Nachteil: Erfordert Re-Sync bestehender Meetings

### Variante C: Beide kombiniert

Backend optimiert neue Meetings, Frontend kann alte Daten verbessert darstellen.

## Vorgeschlagene Loesung

**Variante C** wird empfohlen:

1. **Frontend**: `parseTranscriptWithColors` erweitern um optionale Zusammenfuehrung
2. **Backend**: `sync-recording` um Zeitstempel-basierte Zusammenfuehrung ergaenzen
3. **Bestehendes Meeting**: Kann per "Re-Sync" aktualisiert werden

## Beispiel der Zusammenfuehrungslogik

```text
Regeln fuer die Zusammenfuehrung:
1. Gleicher Sprecher wie vorheriges Segment
2. Zeitabstand zum vorherigen Segment < 2 Sekunden (nur Backend)
3. Vorheriges Segment endet nicht mit Satzzeichen (. ! ?)
4. Segment hat weniger als 5 Woerter

Wenn alle Regeln erfuellt: Segment an vorheriges anhaengen
```

## Migration bestehender Daten

Fuer das spezifische Meeting "KI Training fuer Autohaendler":
1. Im Admin-Bereich "Re-Sync" ausloesen
2. Transkript wird neu von Recall.ai abgerufen
3. Neue Zusammenfuehrungslogik wird angewendet

## Risiken und Einschraenkungen

| Risiko | Bewertung | Mitigation |
|--------|-----------|------------|
| Falsche Zusammenfuehrung | Niedrig | Konservative Regeln (nur bei gleichem Sprecher) |
| Verlust von Einwuerfen | Niedrig | Einwuerfe werden angehaengt, nicht geloescht |
| Performance | Sehr niedrig | Algorithmus ist O(n), keine DB-Abfragen |

