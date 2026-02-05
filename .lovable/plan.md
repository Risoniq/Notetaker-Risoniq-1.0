

## Ziel
Die Kalender-Verbindung (Google + Microsoft) soll wieder funktionieren. Aktuell schlagen beide mit "Failed to send a request to the Edge Function" fehl.

## Diagnose

### Symptome
- Console-Logs zeigen `FunctionsFetchError: Failed to send a request to the Edge Function`
- Darunter: `TypeError: Failed to fetch` - was auf einen CORS-Fehler oder nicht erreichbare Funktion hinweist
- **Keine Logs** in `google-recall-auth` und `microsoft-recall-auth` - die Anfragen kommen nie an

### Ursache
Die Edge Functions sind wahrscheinlich **nicht deployed** oder das Deployment ist fehlgeschlagen. Grund: Die Funktionen verwenden noch veraltete Import-URLs (`https://esm.sh/` und `https://deno.land/std@`), die laut Projekt-Architektur zu "Bundle generation timed out" Fehlern führen können.

---

## Umsetzungsplan

### Schritt 1: Imports auf npm: Specifier migrieren

Beide Funktionen müssen aktualisiert werden:

**`supabase/functions/google-recall-auth/index.ts`**
```typescript
// Vorher:
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Nachher:
import { createClient } from "npm:@supabase/supabase-js@2";
```

**`supabase/functions/microsoft-recall-auth/index.ts`**
```typescript
// Gleiche Änderungen
```

Zusätzlich: Von `serve()` auf `Deno.serve()` umstellen (moderner Standard).

### Schritt 2: Funktionen deployen

Nach der Code-Aktualisierung beide Funktionen gezielt deployen:
- `google-recall-auth`
- `microsoft-recall-auth`

### Schritt 3: Deployment verifizieren

Per Test-Aufruf prüfen, dass die Funktionen erreichbar sind (sollten 401 statt 404 zurückgeben).

### Schritt 4: End-to-End Test

Kalender-Seite erneut aufrufen und Verbindung testen.

---

## Technische Details

### Dateien die geändert werden

| Datei | Änderung |
|-------|----------|
| `supabase/functions/google-recall-auth/index.ts` | Import-Migration auf `npm:`, `Deno.serve()` |
| `supabase/functions/microsoft-recall-auth/index.ts` | Import-Migration auf `npm:`, `Deno.serve()` |

### Import-Änderungen

```typescript
// ALT (problematisch):
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// NEU (stabil):
import { createClient } from "npm:@supabase/supabase-js@2";

// serve() → Deno.serve()
Deno.serve(async (req) => {
  // ... Rest bleibt gleich
});
```

---

## Akzeptanzkriterien

- Beide Funktionen antworten nicht mehr mit 404
- Console-Logs zeigen keine `FunctionsFetchError` mehr
- Kalender-Verbindung kann gestartet werden (OAuth-Popup öffnet sich)
- Nach OAuth-Callback wird Status als "verbunden" angezeigt

