

# Karussell-Highlighting und Rotation ueberarbeiten

## Problem
Die `getItemStyle`-Funktion berechnet den Abstand (`diff`) zwischen Kartenindex und aktivem Index rein linear (`index - activeIndex`). Bei `loop: true` mit 3 Karten fuehrt das zu falschen Werten: Wenn die aktive Karte Index 2 hat, bekommt Karte 0 einen `diff` von -2 statt +1. Dadurch werden die Karten bei Rotation nicht korrekt als "links" oder "rechts" eingestuft und der 3D-Effekt bricht.

## Loesung

### Datei: `src/pages/Index.tsx`

1. **Loop-faehige Diff-Berechnung**: Die `getItemStyle`-Funktion wird so angepasst, dass sie den kuerzesten Weg im Loop berechnet. Bei 3 Karten soll der `diff` immer im Bereich -1 bis +1 liegen:

```text
const totalItems = 3;
let diff = index - activeIndex;
// Kuerzesten Weg im Loop finden
if (diff > totalItems / 2) diff -= totalItems;
if (diff < -totalItems / 2) diff += totalItems;
```

2. **Mittlere Karte bleibt highlighted**: Die Karte mit `diff === 0` bekommt weiterhin den Vordergrund-Stil (scale 1.05, translateZ 60px, Schatten, zIndex 10).

3. **Linke und rechte Karte korrekt positioniert**: Durch die Loop-Korrektur wird die Karte links (diff -1) immer mit `rotateY(12deg)` und die Karte rechts (diff +1) mit `rotateY(-12deg)` dargestellt -- unabhaengig davon, welcher absolute Index gerade aktiv ist.

4. **Ergebnis beim Pfeil-Klick**: Wenn man z.B. auf "Naechste" klickt, rotiert die mittlere Karte nach links/hinten, die rechte Karte kommt in die Mitte nach vorne, und die linke Karte rutscht nach rechts -- ein echter Karussell-Kreislauf.

## Technische Details

Einzige Aenderung in `getItemStyle`:

```text
Vorher:
  const diff = index - activeIndex;

Nachher:
  const totalItems = 3;
  let diff = index - activeIndex;
  if (diff > totalItems / 2) diff -= totalItems;
  if (diff < -totalItems / 2) diff += totalItems;
```

Der Rest der Funktion (Styles fuer aktive/inaktive Karten) bleibt identisch.

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/pages/Index.tsx` | Loop-faehige Diff-Berechnung in `getItemStyle` |

