

## Problem

Der "Recall Transkript erstellen" Button crasht mit dem Fehler `400: Keine Aufnahmen beim Recall Bot gefunden`, weil der Recall.ai Bot keine Aufnahmen hat. Die bisherigen Frontend-Fixes haben nicht funktioniert, weil `supabase.functions.invoke` bei HTTP 400 den Response-Body nicht im `data`-Feld zurueckgibt -- er ist `null`. Die Fehlermeldung im `error`-Objekt ist generisch ("non-2xx status code") und enthaelt nicht den eigentlichen Text.

## Loesung

Das Problem muss an **zwei Stellen** behoben werden:

### 1. Edge Function: Fehler als 200 mit Error-Flag zurueckgeben

**Datei:** `supabase/functions/recall-transcribe/index.ts` (Zeile 109-114)

Statt HTTP 400 wird ein HTTP 200 mit `{ success: false, error: "..." }` zurueckgegeben. So kann das Frontend den Fehler sauber aus `data` lesen.

```typescript
// Vorher:
if (!botData.recordings || botData.recordings.length === 0) {
  return new Response(JSON.stringify({ error: "Keine Aufnahmen beim Recall Bot gefunden" }), {
    status: 400, ...
  });
}

// Nachher:
if (!botData.recordings || botData.recordings.length === 0) {
  return new Response(JSON.stringify({ success: false, error: "Keine Aufnahmen beim Recall Bot gefunden" }), {
    status: 200, ...
  });
}
```

### 2. Frontend: data.error pruefen

**Datei:** `src/pages/MeetingDetail.tsx` (Zeile 749-757)

Nach `supabase.functions.invoke` wird zusaetzlich `data?.error` geprueft (jetzt funktioniert es, weil die Edge Function 200 zurueckgibt):

```typescript
if (error) throw error;
if (data?.error) {
  if (data.error.includes('Keine Aufnahmen')) {
    toast.error("Dieser Bot hat keine Aufnahmen erzeugt. Ein Transkript kann nicht erstellt werden.");
  } else {
    toast.error(data.error);
  }
  setIsRecallTranscribing(false);
  return;
}
```

Der `catch`-Block bleibt als Fallback fuer echte Netzwerk-/Serverfehler bestehen, wird aber vereinfacht.

### Zusammenfassung

- Root Cause: `supabase.functions.invoke` gibt bei HTTP 400 `data: null` zurueck, daher war der Fehlertext nie lesbar
- Fix: Edge Function gibt 200 mit `success: false` zurueck, Frontend liest `data.error` zuverlaessig
- Kein Crash, keine Blank-Screen mehr -- stattdessen eine benutzerfreundliche Toast-Meldung

