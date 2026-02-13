

## Dark-Mode-Fix fuer das Chat-Fenster in der Deep Dive Analyse

### Problem
Das Chat-Widget (`MeetingChatWidget.tsx`) verwendet `bg-secondary-foreground` als Hintergrund. Im Dark Mode ist `secondary-foreground` ein heller Farbton (`hsl(195, 20%, 85%)`), was den Chat-Bereich zu hell und schlecht lesbar macht.

### Loesung
Die Hintergrund- und Textfarben des Chat-Widgets werden auf dunklere, zum Dark Mode passende Werte umgestellt. Das Widget soll `bg-muted` oder `bg-card` verwenden, die im Dark Mode automatisch dunkel sind.

### Aenderungen in `src/components/meeting/MeetingChatWidget.tsx`

| Zeile | Aktuell | Neu |
|-------|---------|-----|
| 170 | `bg-secondary-foreground` | `bg-muted dark:bg-muted` |
| 171 | `text-primary-foreground` | `text-foreground` |
| 179 | `text-primary-foreground` | `text-muted-foreground` |
| 193-197 | Assistenten-Nachrichten: `bg-background/70 border` | `bg-background/80 border` (keine grosse Aenderung noetig) |
| 214 | Input: `bg-background/50` | `bg-background/70` |

Konkret:
- **Container** (Zeile 170): `bg-secondary-foreground` wird zu `bg-muted` -- im Dark Mode dunkel, im Light Mode dezent
- **Titel** (Zeile 171): `text-primary-foreground` wird zu `text-foreground` -- passt sich automatisch an
- **Platzhalter-Text** (Zeile 179): `text-primary-foreground` wird zu `text-muted-foreground`
- **Input-Feld** (Zeile 214): `bg-background/50` wird zu `bg-background/70` fuer etwas mehr Kontrast

### Auch in `src/components/dashboard/MeetingChatWidget.tsx`

Das Dashboard-Chat-Widget hat dieselben Farb-Probleme und wird identisch angepasst (gleiche Klassen-Aenderungen).

### Ergebnis
- Im Dark Mode: dunkler Hintergrund mit gut lesbarem Text
- Im Light Mode: unveraendert dezenter, heller Hintergrund
- Konsistent mit dem Apple Liquid Glass Design-System

