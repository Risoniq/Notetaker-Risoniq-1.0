
## Bot-Avatar wird nicht ins Meeting uebernommen - Stack Overflow Fix

### Problem

Die Edge Function Logs zeigen den exakten Fehler:

```
RangeError: Maximum call stack size exceeded
  at fetchImageAsBase64 (create-bot/index.ts:154:38)
```

Das Bild wird korrekt von der Storage-URL geladen, aber die Base64-Konvertierung auf Zeile 172 crasht:

```javascript
const base64String = btoa(String.fromCharCode(...uint8Array));
```

Der Spread-Operator `...uint8Array` versucht, **jedes einzelne Byte** des Bildes als separates Funktionsargument zu uebergeben. Ein typisches JPEG (z.B. 200KB) hat 200.000 Bytes - JavaScript erlaubt aber nur ca. 65.000 Funktionsargumente. Der Call Stack laeuft ueber, die Funktion gibt `null` zurueck, und der Bot wird ohne Avatar erstellt.

### Ursache

- **Datei**: `supabase/functions/create-bot/index.ts`, Zeile 172
- **Fehlerhafte Zeile**: `btoa(String.fromCharCode(...uint8Array))`
- **Problem**: Spread-Operator auf grossen Arrays verursacht Stack Overflow

### Loesung

Die `fetchImageAsBase64`-Funktion wird so geaendert, dass das Bild in **8KB-Chunks** verarbeitet wird, statt alle Bytes auf einmal:

```text
Vorher (crasht bei Bildern > ~65KB):
  btoa(String.fromCharCode(...uint8Array))

Nachher (funktioniert fuer beliebig grosse Bilder):
  Schleife ueber 8KB-Bloecke -> String zusammenbauen -> btoa()
```

### Betroffene Datei

| Datei | Aenderung |
|---|---|
| `supabase/functions/create-bot/index.ts` | `fetchImageAsBase64`-Funktion: Chunked Base64-Konvertierung statt Spread-Operator |

### Technisches Detail

Die neue Implementierung:

```text
function fetchImageAsBase64(imageUrl):
  1. Bild per fetch() laden (unveraendert)
  2. ArrayBuffer in Uint8Array konvertieren (unveraendert)
  3. NEU: In 8192-Byte-Chunks durchlaufen
     - Fuer jeden Chunk: Byte fuer Byte zu String konvertieren
     - Kein Spread-Operator, kein Stack Overflow
  4. btoa() auf den fertigen String anwenden
```

### Keine weiteren Aenderungen noetig

- **Storage-Bucket**: `bot-avatars` ist oeffentlich (public = true) - korrekt
- **Frontend**: Alle 3 Aufrufer (MeetingBot, QuickMeetingJoin, RecallUpcomingMeetings) senden `botAvatarUrl` korrekt
- **DB-Speicherung**: Avatar-URL wird korrekt in `recall_calendar_users.bot_avatar_url` gespeichert
- **Recall.ai-Config**: `automatic_video_output` mit `kind: "jpeg"` und `b64_data` ist korrekt konfiguriert

Das einzige Problem ist die Base64-Konvertierung in der Edge Function.
