

## Proaktivitaets-Netzdiagramm fuer Projekt-Analyse

### Ueberblick
Neben der bestehenden Themen-Heatmap wird ein Radar-Chart (Netzdiagramm) eingefuegt, das die inhaltliche Proaktivitaet jeder Person ueber alle Projekt-Meetings hinweg visualisiert. Es geht nicht nur um Redeanteil, sondern um qualitative Beitraege.

### Gemessene Dimensionen (Radar-Achsen)

| Achse | Was wird gemessen | Wie |
|---|---|---|
| **Themen-Initiation** | Wer bringt neue Themen ein? | Erster Sprecher nach Themenwechsel (Pause/neuer Abschnitt) |
| **Loesungsvorschlaege** | Wer bietet konkrete Loesungen an? | Phrasen wie "wir koennten", "mein Vorschlag", "ich schlage vor", "eine Idee waere" |
| **Fragen stellen** | Wer treibt Diskussion durch Fragen? | Saetze mit Fragezeichen zaehlen |
| **Reaktionsdichte** | Wer geht auf andere ein? | Direkte Antworten auf vorherige Sprecher (Namensnennungen, Bezugnahmen wie "genau", "darauf aufbauend") |
| **Inhaltliche Tiefe** | Wer liefert substantielle Beitraege? | Durchschnittliche Wortanzahl pro Wortmeldung (laengere Beitraege = tiefere Ausfuehrungen) |

Jede Dimension wird pro Person normalisiert (0-100), sodass die Personen vergleichbar sind.

### Aenderungen

| Datei | Aenderung |
|---|---|
| `src/components/projects/IFDProactivityRadar.tsx` | **Neue Datei** -- Radar-Chart-Komponente mit Recharts `RadarChart`. Analysiert alle Transkripte der Recordings und berechnet die 5 Dimensionen pro Sprecher |
| `src/pages/ProjectDetail.tsx` | Import und Einbindung der neuen Komponente im Chart-Grid (neben TopicCloud) |

### Technische Details

**IFDProactivityRadar.tsx:**
- Nimmt `recordings: any[]` als Prop (wie alle IFD-Komponenten)
- Iteriert ueber alle `transcript_text`-Felder und aggregiert pro Sprecher:
  - Zeilenweise Analyse: `Speaker: Text` Muster parsen
  - Bots und Metadaten werden via `participantUtils` gefiltert
  - Namen werden via `normalizeGermanName` vereinheitlicht
- Berechnet 5 Scores, normalisiert auf 0-100
- Nutzt Recharts `RadarChart`, `PolarGrid`, `PolarAngleAxis`, `Radar` (eine Linie pro Sprecher)
- Maximal 6 Sprecher (die aktivsten), farbkodiert
- Tooltip zeigt absolute Werte

**Einbindung in ProjectDetail.tsx:**
- Wird im 2-spalten Grid neben oder unter der TopicCloud platziert
- Aendert das Grid zu 1 Spalte wenn 3 Komponenten, oder fuegt eine neue Zeile hinzu

### Phrasen-Erkennung fuer Loesungsvorschlaege (Deutsch + Englisch)
```text
"wir könnten", "mein vorschlag", "ich schlage vor", "eine idee wäre",
"wie wäre es wenn", "man könnte", "alternativ", "meine empfehlung",
"we could", "I suggest", "my proposal", "how about", "one option"
```

### Phrasen-Erkennung fuer Reaktionsdichte
```text
"genau", "darauf aufbauend", "wie [Name] gesagt", "stimme zu",
"ergänzend dazu", "guter punkt", "da bin ich", "bezüglich",
"agreed", "building on", "good point", "regarding"
```
