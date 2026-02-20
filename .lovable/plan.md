
# Echtzeit-Sync nach Meeting-Ende via Recall.ai Webhook

## Problem
Aktuell erkennt das System ein beendetes Meeting nur ueber den Cron-Job `auto-sync-recordings`, der alle 5 Minuten laeuft. Das bedeutet bis zu 5 Minuten Verzoegerung, bis Analyse und Video-Backup starten. Es gibt keinen Echtzeit-Trigger von Recall.ai.

## Loesung
Recall.ai unterstuetzt den Parameter `status_change_url` in der Bot-Konfiguration. Wenn sich der Bot-Status aendert (z.B. `done`, `call_ended`), sendet Recall.ai automatisch einen POST-Request an diese URL. Wir erstellen eine neue Edge Function, die diesen Webhook empfaengt und sofort `sync-recording` triggert.

## Aenderungen

### 1. Neue Edge Function: `recall-status-webhook` (neues File)
**Datei:** `supabase/functions/recall-status-webhook/index.ts`

Diese Funktion empfaengt Status-Updates von Recall.ai und triggert den Sync-Prozess:

- Empfaengt POST von Recall.ai mit Bot-Status-Daten (`bot_id`, `status.code`, `status.sub_code`)
- Sucht die zugehoerige Recording in der Datenbank anhand der `recall_bot_id`
- Bei relevanten Status-Codes (`done`, `call_ended`, `recording_done`, `analysis_done`, `fatal`) wird sofort `sync-recording` aufgerufen
- Ignoriert Zwischen-Status wie `joining_call`, `in_call_recording` (diese brauchen keinen Sync)
- Verwendet den Service-Role-Key fuer den internen `sync-recording`-Aufruf
- Kein JWT noetig (Recall.ai sendet keine Auth-Header), aber Bot-ID wird gegen die DB validiert

### 2. Bot-Config erweitern: `status_change_url`
**Datei:** `supabase/functions/create-bot/index.ts`

In der Bot-Konfiguration (Zeile 406-433) wird `status_change_url` hinzugefuegt:

```text
botConfig.status_change_url = `${supabaseUrl}/functions/v1/recall-status-webhook`
```

Dies teilt Recall.ai mit, wohin Status-Updates gesendet werden sollen. Ab sofort wird bei jedem Bot-Status-Wechsel sofort ein Webhook gesendet.

### 3. Config.toml erweitern
**Datei:** `supabase/config.toml`

Neuer Eintrag fuer die Webhook-Funktion:
```toml
[functions.recall-status-webhook]
verify_jwt = false
```

## Ablauf nach der Aenderung

```text
Meeting endet
    |
    v
Recall.ai erkennt: alle Teilnehmer weg (everyone_left_timeout: 60s)
    |
    v
Recall.ai sendet POST an recall-status-webhook (status: "done")
    |
    v
recall-status-webhook findet Recording via recall_bot_id
    |
    v
Ruft sync-recording auf (mit Service-Role-Key)
    |
    v
sync-recording laedt Transkript + Video, speichert Backup, startet Analyse
```

Der bestehende Cron-Job (`auto-sync-recordings`) bleibt als Fallback bestehen, falls ein Webhook verloren geht.

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/recall-status-webhook/index.ts` | Neue Edge Function: empfaengt Recall.ai Status-Webhooks |
| `supabase/functions/create-bot/index.ts` | `status_change_url` zur Bot-Config hinzufuegen |
| `supabase/config.toml` | Neuer Eintrag fuer `recall-status-webhook` |

## Sicherheit
- Die Webhook-Funktion validiert, dass eine Recording mit der empfangenen `bot_id` existiert (verhindert gefaelschte Anfragen)
- Der interne `sync-recording`-Aufruf verwendet den Service-Role-Key
- Kein sensibles Secret wird nach aussen exponiert
