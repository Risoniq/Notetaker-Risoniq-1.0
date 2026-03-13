

# Fix: Abgedunkeltes Dashboard durch fehlerhafte GlassCard-Styles

## Ursache

In `src/components/ui/glass-card.tsx` (Zeile 20) wurden versehentlich zwei CSS-Klassen hinzugefuegt:
- `bg-[#a5bce3]` -- ein blau-graues Hintergrundfarbe
- `text-primary` -- faerbt alle Texte in der Primaerfarbe

Diese Klassen stehen in Konflikt mit den eigentlichen Variant-Styles (`bg-white/85`, etc.). Obwohl tailwind-merge die bg-Klasse normalerweise korrekt ueberschreibt, koennte `bg-[#a5bce3]` als Arbitrary-Value in bestimmten Browsern/Versionen durchscheinen. Zudem ist `text-primary` auf allen GlassCards falsch und veraendert die Textdarstellung.

## Loesung

### `src/components/ui/glass-card.tsx` bereinigen
- `bg-[#a5bce3]` und `text-primary` aus der Base-Klasse in Zeile 20 entfernen
- Diese beiden Klassen waren nicht im urspruenglichen Design und wurden versehentlich hinzugefuegt

Vorher:
```
cn("rounded-[20px] p-6 border border-white/50 dark:border-white/10 shadow-[...] text-primary bg-[#a5bce3]", ...)
```

Nachher:
```
cn("rounded-[20px] p-6 border border-white/50 dark:border-white/10 shadow-[...]", ...)
```

Minimaler Eingriff, keine Auswirkung auf laufende Meetings.

