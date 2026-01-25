
# Dark Mode Toggle hinzufügen

## Übersicht
Ein Dark Mode Toggle wird in der Header-Navigation integriert, der es Benutzern ermöglicht, zwischen Hell-, Dunkel- und System-Modus zu wechseln.

## Änderungen

### 1. ThemeProvider in App.tsx einbinden
Die App muss mit dem `ThemeProvider` von `next-themes` umwickelt werden, damit der Theme-Wechsel funktioniert.

**Datei: `src/App.tsx`**
- Import von `ThemeProvider` aus `next-themes` hinzufügen
- Die gesamte App mit `<ThemeProvider>` umwickeln
- Konfiguration: `attribute="class"`, `defaultTheme="system"`, `enableSystem`

### 2. Dark Mode Toggle-Komponente erstellen
Eine neue Komponente mit einem Dropdown-Menü für die Theme-Auswahl.

**Neue Datei: `src/components/ui/theme-toggle.tsx`**
- Verwendet `useTheme` Hook von `next-themes`
- Dropdown mit drei Optionen:
  - ☀️ Hell (Light)
  - 🌙 Dunkel (Dark)
  - 💻 System (Auto)
- Button mit Sun/Moon Icon, das sich je nach Theme ändert
- Glasmorphism-Styling passend zum Design

### 3. Toggle in AppLayout integrieren
Der Toggle wird rechts in der Header-Navigation platziert.

**Datei: `src/components/layout/AppLayout.tsx`**
- Import der `ThemeToggle`-Komponente
- Platzierung im Header neben der Navigation

## Vorschau

```text
┌─────────────────────────────────────────────────────────────┐
│  🎤 Meeting Recorder    [Dashboard][Kalender][...]   [🌓]  │
└─────────────────────────────────────────────────────────────┘
```

Der Toggle erscheint als Icon-Button rechts im Header.

---

## Technische Details

### ThemeProvider Konfiguration (App.tsx)
```typescript
import { ThemeProvider } from "next-themes";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        {/* ... Rest der App */}
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
```

### ThemeToggle Komponente
```typescript
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="glass" size="icon">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Theme wechseln</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Hell</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dunkel</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Dateien die geändert werden:
1. `src/App.tsx` - ThemeProvider hinzufügen
2. `src/components/ui/theme-toggle.tsx` - Neue Komponente erstellen
3. `src/components/layout/AppLayout.tsx` - Toggle im Header integrieren
