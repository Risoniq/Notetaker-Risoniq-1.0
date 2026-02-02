
# Plan: Tooltip für abgeschnittene Sprechernamen

## Übersicht

Fügt einen Tooltip zu den Sprechernamen in der Legende des Pie-Charts hinzu, sodass der vollständige Name beim Hover angezeigt wird.

## Änderung

### Datei: `src/components/meeting/DeepDiveModal.tsx`

**Import hinzufügen:**
```typescript
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

Hinweis: Der Import wird als `UITooltip` aliased, da `Tooltip` bereits von Recharts importiert wird.

**Sprecher-Legende anpassen (Zeilen 87-99):**

Aktuelle Implementierung:
```tsx
<span className="text-[11px] text-muted-foreground truncate">
  {speaker.name}
</span>
```

Neue Implementierung mit Tooltip:
```tsx
<UITooltip>
  <TooltipTrigger asChild>
    <span className="text-[11px] text-muted-foreground truncate cursor-default">
      {speaker.name}
    </span>
  </TooltipTrigger>
  <TooltipContent side="top" className="max-w-xs">
    <p>{speaker.name}</p>
  </TooltipContent>
</UITooltip>
```

## Betroffene Datei

| Datei | Aktion |
|-------|--------|
| `src/components/meeting/DeepDiveModal.tsx` | Import ergänzen, Tooltip um Sprechernamen wickeln |

## Ergebnis

- Beim Hover über einen abgeschnittenen Sprechernamen erscheint ein Tooltip mit dem vollständigen Namen
- Der Tooltip erscheint oberhalb des Elements (`side="top"`)
- Der Cursor zeigt `default` an, um Interaktivität zu signalisieren ohne Klick-Erwartung
