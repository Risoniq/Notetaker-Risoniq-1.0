

## Fehlendes Meeting wiederherstellen

### Was wird gemacht

1. **Recording-Eintrag anlegen** per SQL INSERT:
   - `recall_bot_id`: `321f271c-8a47-4689-8395-3ef7f6203fa5`
   - `user_id`: `d0f4e5ce-de92-4507-8c50-69e204545eec` (so@ec-pd.com)
   - `status`: `pending`
   - `source`: `bot`
   - `title`: Kalender-Meeting (11.02.2026)
   - `meeting_id`: Neue UUID

2. **Sync triggern**: `sync-recording` Edge Function mit der Bot-ID aufrufen, um Transkript und Video von Recall.ai zu holen (sofern vorhanden).

### Hinweis
Falls der Bot manuell entfernt wurde, hat Recall.ai moeglicherweise trotzdem eine Teilaufnahme gespeichert. Der Sync-Versuch wird zeigen, ob Daten vorliegen.

