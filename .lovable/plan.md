

## "Top Sprecher" und "Häufigste Bedürfnisse" aus der Account-Analyse entfernen

### Ziel
Die beiden Abschnitte "Top Sprecher" und "Häufigste Bedürfnisse" werden aus dem Account-Analyse Sheet entfernt, um die Ansicht schlanker zu machen.

### Aenderungen

**`src/components/dashboard/AccountAnalyticsModal.tsx`**
- Den gesamten "Top Sprecher" Block entfernen (ca. Zeile 195-210: `<div>` mit `Users`-Icon, Ueberschrift und Sprecher-Liste)
- Den gesamten "Häufigste Bedürfnisse" Block entfernen (ca. Zeile 213-230: `<div>` mit `HeartHandshake`-Icon, Ueberschrift und Beduerfnis-Liste)
- Nicht mehr benoetigte Imports entfernen: `HeartHandshake` aus lucide-react (sofern nicht anderweitig verwendet)

### Ergebnis
Das Account-Analyse Sheet zeigt weiterhin: Uebersichts-Statistiken, Pie Charts, To-Do-Uebersicht, Meetings pro Woche Chart und den Meeting Chat. Die beiden entfernten Sektionen fallen weg.

