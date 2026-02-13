

## Account-Analyse Sheet vergroessern und To-Do-Uebersicht hinzufuegen

### Ziel
Das Seitenfenster der Account-Analyse wird breiter und erhaelt einen neuen Abschnitt, der alle To-Dos aus den Meetings anzeigt -- mit einem Filter fuer "Diese Woche" und "Alle".

### Aenderungen

**1. `src/components/dashboard/AccountAnalyticsModal.tsx` -- Sheet breiter machen**
- `sm:max-w-2xl` aendern zu `sm:max-w-4xl` (von 672px auf 896px Breite)

**2. `src/components/dashboard/AccountAnalyticsModal.tsx` -- To-Do-Uebersicht hinzufuegen**
- Neuer Abschnitt nach den Pie Charts: "Meine To-Dos"
- Zwei Tabs/Filter-Buttons: "Diese Woche" und "Alle"
- To-Dos werden aus allen Recordings extrahiert und in einer Liste angezeigt
- Jedes To-Do zeigt: Text, Meeting-Titel (als Kontext), Datum
- To-Dos mit erkanntem Verantwortlichen (Name vor dem Doppelpunkt) werden hervorgehoben wenn sie dem User zugeordnet sind

**3. `src/utils/accountAnalytics.ts` -- To-Do-Daten mit Meeting-Kontext exportieren**
- Neues Interface `ActionItemWithContext`: text, meetingTitle, meetingDate, assignedTo (optional)
- Neue Eigenschaft `allActionItems: ActionItemWithContext[]` im `AccountAnalytics` Interface
- In `calculateAccountAnalytics`: Action Items mit Meeting-Titel und Datum sammeln, Verantwortlichen per Regex extrahieren

### Technische Details

Neues Interface:
```
interface ActionItemWithContext {
  text: string;
  meetingTitle: string;
  meetingDate: string;       // ISO string
  assignedTo: string | null; // Extrahierter Name oder null
}
```

Filter-Logik "Diese Woche":
- Meetings der aktuellen Kalenderwoche (Montag bis Sonntag) filtern per `isThisWeek(parseISO(item.meetingDate))`

To-Do-Liste im Sheet:
- Kompakte Liste mit Checkbox-Icon, To-Do-Text (max 2 Zeilen), und darunter in klein: Meeting-Titel + Datum
- Toggle zwischen "Diese Woche" (Standard) und "Alle"
- Zaehler-Badge an jedem Tab zeigt Anzahl der To-Dos

### Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/utils/accountAnalytics.ts` | Neues Interface + allActionItems Feld mit Meeting-Kontext |
| `src/components/dashboard/AccountAnalyticsModal.tsx` | Sheet breiter + To-Do-Uebersicht mit Wochen-Filter |

