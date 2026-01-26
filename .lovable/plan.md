

# Bot-Namen für Kalender-Automatik korrigieren

## Problem-Analyse

Die Logs zeigen klar das Problem:
```
[Sync] Sent preferences body: {"preferences":{...},"bot_name":"Risoniq Notetaker"}
[Sync] Full response from Recall.ai: {...,"preferences":{"bot_name":"dominikbauer Notetaker"}}
```

**Ursache:** Der `bot_name` wird auf der **Root-Ebene** des API-Payloads gesendet, aber Recall.ai erwartet ihn **innerhalb des `preferences`-Objekts**.

Laut Recall.ai API-Dokumentation ist die Response-Struktur:
```json
{
  "preferences": {
    "record_external": true,
    "record_internal": true,
    "bot_name": "string"  // <-- bot_name gehört HIER rein!
  }
}
```

## Geplante Änderung

**Datei: `supabase/functions/recall-calendar-meetings/index.ts`**

In der Funktion `syncPreferencesToRecall` (Zeile 587-662) muss der `bot_name` ins `preferences`-Objekt verschoben werden:

```text
VORHER (falsch):
┌─────────────────────────────┐
│ {                           │
│   preferences: {            │
│     record_external: true,  │
│     record_internal: true   │
│   },                        │
│   bot_name: "RISONIQ..."    │  ← Recall.ai ignoriert dies!
│ }                           │
└─────────────────────────────┘

NACHHER (korrekt):
┌─────────────────────────────┐
│ {                           │
│   preferences: {            │
│     record_external: true,  │
│     record_internal: true,  │
│     bot_name: "RISONIQ..."  │  ← Wird jetzt akzeptiert!
│   }                         │
│ }                           │
└─────────────────────────────┘
```

### Code-Änderung

In Zeile 619-625:

**Aktuell:**
```typescript
const updatePayload: Record<string, unknown> = { preferences: recallPreferences };

if (botConfig?.bot_name) {
  updatePayload.bot_name = botConfig.bot_name;  // FALSCH - auf Root-Ebene
}
```

**Neu:**
```typescript
const updatePayload: Record<string, unknown> = { 
  preferences: {
    ...recallPreferences,
    ...(botConfig?.bot_name && { bot_name: botConfig.bot_name })  // RICHTIG - in preferences
  }
};
```

## Ergebnis

Nach dieser Änderung wird der Bot-Name "RISONIQ Notetaker" korrekt an Recall.ai übertragen und bei allen automatisch geplanten Kalender-Meetings verwendet.

**Hinweis:** Nach dem Deployment muss einmalig die Bot-Einstellung in den Settings gespeichert werden, um den neuen Namen zu Recall.ai zu synchronisieren.

