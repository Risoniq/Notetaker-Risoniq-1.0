

## Analyse: Edge Function `admin-dashboard` nicht erreichbar

### Problem
Die Admin-Seite zeigt den Fehler "Failed to send a request to the Edge Function", weil die **`admin-dashboard`** Edge Function einen **404 Not Found** auf OPTIONS-Requests zurückgibt. Das bedeutet die Funktion ist **nicht deployed**.

### Ursache
Aus den Analytics-Logs:
```
OPTIONS | 404 | https://kltxpsrghuxzfbctkdnz.supabase.co/functions/v1/admin-dashboard
```

Die Funktion existiert im Code, aber ist nicht auf dem Supabase-Server aktiv.

---

## Lösung

### 1. Edge Function deployen
Die `admin-dashboard` Edge Function muss deployed werden. Dies erfordert ein Re-Deployment.

### 2. CORS-Header prüfen
Die aktuelle CORS-Konfiguration in der Funktion ist unvollständig:
```typescript
// Aktuell:
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',

// Erforderlich:
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
```

---

## Technische Details

### Betroffene Datei
`supabase/functions/admin-dashboard/index.ts` (Zeile 4-5)

### Änderung
CORS-Header erweitern um alle vom Supabase-Client gesendeten Header.

### Deployment
Nach der Änderung wird die Funktion automatisch neu deployed.

---

## Erwartetes Ergebnis
Nach dem Fix wird die Admin-Seite erfolgreich laden und die Benutzer-/Team-Übersicht anzeigen.

