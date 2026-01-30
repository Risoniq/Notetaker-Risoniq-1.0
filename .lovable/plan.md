
# Dashboard Deep Dive Analyse - Aggregierte Meeting-Metriken

## Uebersicht

Neben dem "Bot zu Meeting senden" Fenster wird ein gleichgrosses Fenster mit einer aggregierten Deep Dive Analyse hinzugefuegt. Dieses zeigt Auswertungen ueber ALLE Meetings des Accounts mit Metriken in Kreisdiagrammen und Statistiken.

## Neue Komponente: AccountAnalyticsCard

Ein Dashboard-Widget das folgende aggregierte Metriken aus allen Meetings anzeigt:

```text
+------------------------------------------+------------------------------------------+
| Bot zu Meeting senden                    | Account-Analyse                          |
|                                          |                                          |
| [Meeting-Link eingeben]                  | [Pie: Sprechanteile]  [Pie: Content]    |
| [Bot senden]                             |                                          |
|                                          | Gesamt: 12 Meetings | 8.5h Aufnahmezeit  |
| Unterstuetzte Plattformen:               | 47 Action Items | 23 offene Fragen       |
| Teams, Meet, Zoom (soon), Webex (soon)   |                                          |
+------------------------------------------+ [Deep Dive oeffnen ->]                   |
                                           +------------------------------------------+
```

## Aggregierte Metriken

Aus allen abgeschlossenen Meetings (`status = 'done'`) werden folgende Daten aggregiert:

### Uebersichts-Statistiken
- Gesamtanzahl Meetings
- Gesamte Aufnahmezeit (Stunden)
- Durchschnittliche Meeting-Dauer
- Anzahl Action Items insgesamt
- Anzahl Key Points insgesamt
- Anzahl Teilnehmer insgesamt

### Kreisdiagramme (wie bei einzelnem Meeting)
1. **Aggregierte Sprechanteile**: Wer spricht am meisten ueber alle Meetings
2. **Business vs. Small Talk**: Durchschnitt ueber alle Transkripte

### Button zum Detail-Layer
Ein Button "Analyse oeffnen" oeffnet ein grosses Modal/Sheet mit detaillierteren Auswertungen:
- Zeitlicher Verlauf der Meetings (Linienchart)
- Top-Sprecher ueber alle Meetings
- Haeufigste offene Fragen-Themen
- Haeufigste Kundenbeduerfnisse
- Meeting-Effizienz-Score (Business-Anteil, Action-Items pro Stunde)

---

## Technische Umsetzung

### 1. Neue Utility: `src/utils/accountAnalytics.ts`

```typescript
export interface AccountAnalytics {
  totalMeetings: number;
  totalDurationMinutes: number;
  totalActionItems: number;
  totalKeyPoints: number;
  totalParticipants: number;
  averageDuration: number;
  
  // Aggregierte Deep Dive Daten
  aggregatedSpeakerShares: SpeakerShare[];
  aggregatedContentBreakdown: ContentBreakdown;
  aggregatedOpenQuestions: OpenQuestion[];
  aggregatedCustomerNeeds: CustomerNeed[];
  
  // Zeitliche Daten fuer Charts
  meetingsPerWeek: { week: string; count: number }[];
  durationPerWeek: { week: string; minutes: number }[];
}

export const calculateAccountAnalytics = (
  recordings: Recording[],
  userEmail: string | null
): AccountAnalytics => { ... }
```

### 2. Neue Komponente: `src/components/dashboard/AccountAnalyticsCard.tsx`

Diese Komponente:
- Laedt alle abgeschlossenen Recordings
- Berechnet aggregierte Metriken
- Zeigt Mini-Kreisdiagramme und Statistiken
- Hat einen Button zum Oeffnen des Detail-Layers

### 3. Neues Modal: `src/components/dashboard/AccountAnalyticsModal.tsx`

Das vollstaendige Analyse-Modal mit:
- Groessere Kreisdiagramme
- Zeitliche Verlaufs-Charts (Linienchart mit recharts)
- Detaillierte Listen (Top-Sprecher, Top-Fragen, Top-Beduerfnisse)
- Export-Optionen

### 4. Aenderungen: `src/pages/Index.tsx`

```typescript
{/* Bot-Steuerung - nur wenn Kontingent verfuegbar */}
{!quota?.is_exhausted && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <GlassCard title="Bot zu Meeting senden">
      <QuickMeetingJoin onBotStarted={setActiveRecordingId} />
    </GlassCard>
    
    <GlassCard title="Account-Analyse">
      <AccountAnalyticsCard />
    </GlassCard>
  </div>
)}
```

---

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/utils/accountAnalytics.ts` | Neue Utility fuer aggregierte Berechnungen |
| `src/components/dashboard/AccountAnalyticsCard.tsx` | Neues Dashboard-Widget mit Mini-Charts |
| `src/components/dashboard/AccountAnalyticsModal.tsx` | Neues Detail-Modal mit vollstaendiger Analyse |
| `src/pages/Index.tsx` | Grid-Layout mit zwei gleichgrossen Cards |

---

## UI Design

### AccountAnalyticsCard (kompakte Ansicht)

```text
+--------------------------------------------------+
| Account-Analyse                                  |
+--------------------------------------------------+
|                                                  |
| +------------------+  +------------------+       |
| | [Pie Chart]      |  | [Pie Chart]      |       |
| | Sprechanteile    |  | Business/SmallT  |       |
| +------------------+  +------------------+       |
|                                                  |
| +----------------------------------------------+ |
| | 12 Meetings | 8.5h total | 42min avg        | |
| | 47 Action Items | 156 Key Points            | |
| +----------------------------------------------+ |
|                                                  |
| [TrendingUp] Deep Dive Analyse oeffnen    [->]   |
+--------------------------------------------------+
```

### AccountAnalyticsModal (Detail-Ansicht)

```text
+----------------------------------------------------------------+
| Account-Analyse - Alle Meetings                          [X]   |
+----------------------------------------------------------------+
|                                                                |
| Uebersicht                                                     |
| +------------+ +------------+ +------------+ +------------+    |
| | 12         | | 8.5h       | | 47         | | 23         |    |
| | Meetings   | | Aufnahme   | | To-Dos     | | Fragen     |    |
| +------------+ +------------+ +------------+ +------------+    |
|                                                                |
| [Grosses Pie: Sprechanteile]    [Grosses Pie: Content]         |
|                                                                |
| Meetings pro Woche                                             |
| [Line Chart: Zeitlicher Verlauf]                               |
|                                                                |
| Top Sprecher                    Haeufigste Beduerfnisse        |
| 1. Max Mustermann (45%)        1. Schnellere Lieferung         |
| 2. Kunde A (30%)               2. Besserer Support             |
| 3. Kunde B (25%)               3. Preisreduktion               |
|                                                                |
+----------------------------------------------------------------+
```

---

## Datenfluss

1. **AccountAnalyticsCard** mounted
2. Laedt alle Recordings mit `status = 'done'` via Supabase
3. Fuer jedes Recording mit `transcript_text`:
   - Fuehrt `performDeepDiveAnalysis()` aus
   - Aggregiert die Ergebnisse
4. Zeigt kompakte Uebersicht mit Mini-Charts
5. Bei Klick auf "Deep Dive oeffnen" -> Modal mit Details

---

## Performance-Ueberlegungen

- **Lazy Loading**: Analyse nur fuer sichtbare/relevante Meetings
- **Caching**: Aggregierte Daten in State cachen
- **Limitierung**: Maximal 50 neueste Meetings analysieren
- **useMemo**: Teure Berechnungen memoisieren
