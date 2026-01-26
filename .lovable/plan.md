
# Sprecher-Blasen nur um Namen wickeln

## Analyse

Die aktuelle `ColoredTranscript`-Komponente in `src/components/transcript/ColoredTranscript.tsx` verwendet folgende Klassen fuer die Sprecher-Badges:

```tsx
<div 
  className="shrink-0 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
  style={{ backgroundColor, color, border }}
>
  {line.speaker}
</div>
```

Das Problem: Die Blasen sind in einem `flex` Container, und obwohl `shrink-0` verhindert, dass sie kleiner werden, wird nicht explizit sichergestellt, dass sie nur so breit wie ihr Inhalt sind.

## Loesung

Zusaetzliche CSS-Klassen hinzufuegen, die die Blasen auf ihre natuerliche Inhaltsbreite beschraenken:

- `w-fit` oder `max-w-fit` - Setzt die Breite auf die minimale Inhaltsbreite
- `self-start` - Verhindert, dass Flexbox die Hoehe auf den Container ausdehnt

## Aenderung

**Datei:** `src/components/transcript/ColoredTranscript.tsx`

**Zeile 24-33 aendern von:**
```tsx
<div 
  className="shrink-0 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
  style={{ 
    backgroundColor: line.color.bg,
    color: line.color.text,
    border: `1px solid ${line.color.border}`,
  }}
>
  {line.speaker}
</div>
```

**Zu:**
```tsx
<div 
  className="shrink-0 w-fit self-start px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
  style={{ 
    backgroundColor: line.color.bg,
    color: line.color.text,
    border: `1px solid ${line.color.border}`,
  }}
>
  {line.speaker}
</div>
```

## Erlaeuterung der Aenderungen

| Klasse | Zweck |
|--------|-------|
| `w-fit` | Setzt die Breite auf `fit-content` - die Blase ist nur so breit wie der Name |
| `self-start` | Verhindert vertikales Stretching im Flexbox-Container |

## Zusaetzliche Pruefung

Falls die Blasen auch in der `SpeakerLegend`-Komponente (Zeile 56-70) das gleiche Problem haben, wird dort ebenfalls `w-fit` hinzugefuegt.

## Visuelles Ergebnis

**Vorher:**
```text
┌──────────────────────────────────────┐  Hallo, wie geht es dir?
│ Max Mustermann                       │
└──────────────────────────────────────┘
```

**Nachher:**
```text
┌─────────────────┐  Hallo, wie geht es dir?
│ Max Mustermann  │
└─────────────────┘
```

Die Blase passt sich jetzt nur an die Laenge des Namens an, nicht an den umgebenden Container.
