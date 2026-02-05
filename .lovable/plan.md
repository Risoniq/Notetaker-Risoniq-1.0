
# Plan: Kalender-Verbindungsfehler fuer Impersonation beheben

## Problem-Analyse

### Fehlermeldung in den Logs
```
ERROR [MicrosoftAuth] User ID mismatch: 
  provided 6e373589-24e0-4037-ac57-de56e0932ff4 (Fabio) 
  vs authenticated 704551d2-286b-4e57-80d0-721f198aea43 (Dominik/Admin)
```

### Ursache
Wenn ein Admin einen anderen Benutzer impersoniert und versucht, dessen Kalender zu verbinden, schlaegt die Sicherheitspruefung in der Edge Function fehl:

1. Admin (Dominik) impersoniert Fabio
2. Frontend sendet Fabios User-ID im Request
3. Edge Function prueft den Auth-Token → findet Dominik
4. User-ID-Mismatch → Request wird mit 403 Forbidden abgelehnt

### Betroffene Komponenten
- `src/hooks/useMicrosoftRecallCalendar.ts` - Nutzt nicht den Impersonation-Kontext
- `src/hooks/useGoogleRecallCalendar.ts` - Gleiches Problem
- `supabase/functions/microsoft-recall-auth/index.ts` - Strikte Validierung (korrekt!)
- `supabase/functions/google-recall-auth/index.ts` - Gleiches Verhalten

## Loesung

Es gibt zwei moegliche Ansaetze:

### Option A: Impersonation fuer Kalender-Verbindung deaktivieren (Empfohlen)
OAuth-Flows koennen nicht stellvertretend durchgefuehrt werden - der echte Benutzer muss sich selbst bei Microsoft/Google anmelden.

**Aenderungen:**
- In den Kalender-Komponenten eine Warnung anzeigen, wenn impersoniert wird
- Button zum Verbinden im Impersonation-Modus deaktivieren

### Option B: Admin-Override in Edge Function (Nicht empfohlen)
Admins koennten die Validierung umgehen, aber das hilft nicht - der OAuth-Flow wuerde trotzdem zum falschen Account fuehren.

## Empfohlene Implementierung (Option A)

### 1. RecallCalendarConnection.tsx anpassen
```typescript
// Import hinzufuegen
import { useImpersonation } from '@/contexts/ImpersonationContext';

// Im Component
const { isImpersonating } = useImpersonation();

// Warnung anzeigen und Button deaktivieren
{isImpersonating && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Kalender-Verbindungen koennen nicht waehrend der Impersonation 
      hergestellt werden. Der Benutzer muss sich selbst mit 
      Microsoft/Google anmelden.
    </AlertDescription>
  </Alert>
)}

// Buttons deaktivieren
<Button 
  onClick={connectMicrosoft} 
  disabled={isImpersonating || isLoading}
>
  Mit Microsoft verbinden
</Button>
```

### 2. Status-Pruefung bleibt aktiv
Admins koennen weiterhin den Verbindungsstatus sehen, aber keine neuen Verbindungen fuer andere Benutzer erstellen.

## Bereits verbundene Accounts

| Email | Google | Microsoft |
|-------|--------|-----------|
| dominik@risoniq.ai | Ja | Ja |
| support@risoniq.ai | Nein | Ja |
| as@ec-pd.com | Nein | Ja |
| so@ec-pd.com | Nein | Ja |

Fabios Account (`6e373589-...`) hat noch keine Kalender-Verbindung.

## Naechste Schritte

1. **Sofort**: Fabio muss sich selbst einloggen (nicht impersoniert) und die Microsoft-Kalender-Verbindung herstellen
2. **Code-Aenderung**: UI-Warnung hinzufuegen, dass Kalender-Verbindungen nicht im Impersonation-Modus moeglich sind
3. **Optional**: Status-Pruefung fuer impersonierte Benutzer ermoglichen (nur lesen, nicht verbinden)
