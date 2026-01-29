
# Deep Dive Analyse Modal mit Kreisdiagrammen

## Uebersicht

Beim Klick auf "Deep Dive Analyse" soll sich ein Modal/Sheet oeffnen mit detaillierten Analysen in Form von Kreisdiagrammen:

1. **Sprechanteile** - Wer hat wie viel gesprochen (basierend auf Woertern/Zeichen)
2. **Offene Fragen** - Anzahl und Auflistung unbeantworteter Fragen im Meeting
3. **Small Talk vs. Inhalt** - Prozentuale Aufteilung zwischen informellen und inhaltlichen Gespraechen
4. **Kundenbeduerfnisse** - Erkannte Beduerfnisse von externen Teilnehmern (nicht der eigene Account)

## Technische Umsetzung

### 1. Neue Analyse-Utility: `src/utils/deepDiveAnalysis.ts`

Diese Datei enthaelt Funktionen zur Transkript-Analyse:

```typescript
export interface DeepDiveAnalysis {
  speakerShares: { name: string; words: number; percentage: number; isCustomer: boolean }[];
  openQuestions: { question: string; speaker: string }[];
  contentBreakdown: {
    smallTalk: number;    // Prozent
    business: number;     // Prozent
  };
  customerNeeds: { need: string; speaker: string; context: string }[];
}

// Analysiert Sprechanteile basierend auf Wortanzahl
export const analyzeSpeakerShares = (transcript: string, userEmail: string) => {...};

// Findet offene Fragen (Fragesaetze ohne direkte Antwort)
export const findOpenQuestions = (transcript: string) => {...};

// Kategorisiert Small Talk vs. geschaeftlichen Inhalt
export const analyzeContentType = (transcript: string) => {...};

// Extrahiert erkannte Kundenbeduerfnisse
export const extractCustomerNeeds = (transcript: string, userEmail: string) => {...};
```

**Kundenidentifikation:**
- Vergleich des User-Emails mit den erkannten Sprechern
- Sprecher die NICHT zum eigenen Account gehoeren = Kunden
- Falls `participants` im Recording vorhanden, werden deren E-Mails geprueft

### 2. Neue Komponente: `src/components/meeting/DeepDiveModal.tsx`

Ein grosses Sheet/Modal mit vier Sektionen:

```text
+----------------------------------------------------------+
|  Deep Dive Analyse                               [X]     |
+----------------------------------------------------------+
|                                                          |
|  [Kreisdiagramm: Sprechanteile]    [Kreisdiagramm:       |
|   - Dominik Bauer: 45%              Small Talk/Inhalt]   |
|   - Kunde A: 35%                    - Small Talk: 15%    |
|   - Kunde B: 20%                    - Business: 85%      |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  Offene Fragen (3)                                       |
|  +----------------------------------------------------+  |
|  | "Wann koennen wir mit der Lieferung rechnen?"      |  |
|  | - gestellt von: Kunde A                            |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  Erkannte Kundenbeduerfnisse (4)                         |
|  +----------------------------------------------------+  |
|  | Schnellere Lieferzeiten                            |  |
|  | Besserer Support                                   |  |
|  | Preisreduktion bei Grossbestellung                 |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

**Verwendete Chart-Komponenten:**
- `recharts` PieChart fuer Kreisdiagramme (bereits als Dependency vorhanden)
- `ChartContainer`, `ChartTooltip` aus `src/components/ui/chart.tsx`

### 3. Integration in MeetingDetail.tsx

**Aenderungen:**
- Import der neuen Komponente
- State fuer Modal-Sichtbarkeit: `const [showDeepDive, setShowDeepDive] = useState(false)`
- useAuth Hook importieren fuer User-Email
- Button onClick aendern: `onClick={() => setShowDeepDive(true)}`
- Modal-Komponente einbinden mit Recording und User-Email als Props

## Analyse-Logik im Detail

### Sprechanteile
- Jede Zeile im Format `Name: Text` wird gezaehlt
- Woerter pro Sprecher summiert
- Prozentuale Verteilung berechnet
- Eigener Account wird markiert (blau), Kunden in anderen Farben

### Offene Fragen
- Regex-Suche nach Fragesaetzen (`?` am Ende)
- Pruefung ob die naechste Zeile eine Antwort ist
- Fragen ohne direkte Antwort = "offen"

### Small Talk Erkennung
Keywords fuer Small Talk:
- Begruessung: "Hallo", "Guten Tag", "Wie geht's"
- Wetter: "Wetter", "Regen", "Sonne"
- Smalltalk: "Wochenende", "Urlaub", "Familie"

Geschaeftlicher Inhalt:
- Alles was NICHT zu Small Talk Keywords gehoert

### Kundenbeduerfnisse
KI-gesteuerte Analyse (optional via Edge Function) oder regelbasiert:
- Suche nach Phrasen wie: "Wir brauchen...", "Wichtig waere...", "Koennen Sie..."
- Nur von Kunden-Sprechern (nicht eigener Account)

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/utils/deepDiveAnalysis.ts` | Neue Utility mit Analyse-Funktionen |
| `src/components/meeting/DeepDiveModal.tsx` | Neues Modal mit Kreisdiagrammen |
| `src/pages/MeetingDetail.tsx` | Integration des Modals und Button-Handler |

## Chart-Konfiguration

```typescript
// Farbschema fuer Sprecher-Diagramm
const speakerColors = {
  own: 'hsl(210, 80%, 55%)',      // Blau fuer eigenen Account
  customer1: 'hsl(150, 70%, 50%)', // Gruen
  customer2: 'hsl(30, 80%, 55%)',  // Orange
  customer3: 'hsl(280, 60%, 55%)', // Lila
};

// Farbschema fuer Small Talk/Business
const contentColors = {
  smallTalk: 'hsl(60, 70%, 50%)',  // Gelb
  business: 'hsl(210, 80%, 55%)',  // Blau
};
```

## Erweiterte Optionen (Zukunft)

- KI-gestuetzte Beduerfnis-Erkennung via Edge Function
- Export der Deep Dive Analyse als PDF
- Vergleich mit frueheren Meetings desselben Kunden
- Sentiment-Analyse pro Sprecher
