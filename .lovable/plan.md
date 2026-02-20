
# Karussell-Effekt verstaerken: Aktive Karte im Vordergrund

## Problem
Aktuell stehen alle drei Karten visuell auf gleicher Ebene nebeneinander. Der 3D-Effekt (rotateY + scale) ist subtil und erzeugt kein echtes "Vordergrund/Hintergrund"-Gefuehl. Die aktive Karte hebt sich nicht deutlich genug ab.

## Loesung

### Datei: `src/pages/Index.tsx`

Die `getItemStyle`-Funktion wird komplett ueberarbeitet, um einen staerkeren Tiefeneffekt zu erzeugen:

**Aktive Karte (Vordergrund):**
- `scale(1.05)` -- leicht vergroessert gegenueber den anderen
- `translateZ(60px)` -- nach vorne gezogen
- `rotateY(0deg)` -- gerade ausgerichtet
- `opacity: 1`
- `z-index: 10` -- ueber den anderen Karten
- `box-shadow: 0 20px 60px rgba(0,0,0,0.15)` -- deutlicher Schattenwurf nach unten

**Inaktive Karten (Hintergrund):**
- `scale(0.85)` -- deutlich kleiner (statt 0.92)
- `translateZ(-80px)` -- nach hinten geschoben
- `translateX(±30px)` -- leicht zur Seite verschoben, damit sie "dahinter" hervorschauen
- `rotateY(±12deg)` -- staerker gedreht (statt ±8deg)
- `opacity: 0.6` -- staerker abgedunkelt
- `z-index: 1` -- hinter der aktiven Karte

**Carousel-Konfiguration:**
- `align: "center"` statt `"start"` -- damit die aktive Karte zentriert steht
- `perspective: 1000px` auf dem Container beibehalten
- `transform-style: preserve-3d` auf den Items fuer echte 3D-Tiefe

### Konkrete Code-Aenderungen

1. **`getItemStyle` ueberarbeiten:**
```
Aktive Karte:
  transform: translateZ(60px) scale(1.05)
  opacity: 1
  zIndex: 10
  filter: none
  boxShadow: 0 20px 60px rgba(0,0,0,0.15)

Karte davor (links):
  transform: translateX(-30px) translateZ(-80px) rotateY(12deg) scale(0.85)
  opacity: 0.6
  zIndex: 1
  filter: brightness(0.9)

Karte dahinter (rechts):
  transform: translateX(30px) translateZ(-80px) rotateY(-12deg) scale(0.85)
  opacity: 0.6
  zIndex: 1
  filter: brightness(0.9)
```

2. **Carousel opts aendern:** `align: "center"` damit die fokussierte Karte mittig steht

3. **CarouselContent:** `transform-style: preserve-3d` hinzufuegen, damit translateZ tatsaechlich greift

4. **CarouselItem:** `position: relative` und dynamischer `zIndex` damit die Ueberlappung korrekt dargestellt wird

## Ergebnis
- Die aktive Karte steht klar im Vordergrund mit sichtbarem Schattenwurf
- Inaktive Karten liegen sichtbar dahinter (kleiner, gedreht, abgedunkelt)
- Beim Scrollen per Pfeiltasten rotieren die Karten flüssig in den Vordergrund
- Echter 3D-Karussell-Effekt mit Tiefenwirkung
