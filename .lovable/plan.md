

# Fix: Windows-Kompatibilitaet fuer Teams-Links und Bot-Avatar-Upload

## Problem 1: Teams-Link kann auf Windows nicht eingefuegt werden

### Ursache
Der `onPaste`-Handler in `QuickMeetingJoin.tsx` und `MeetingBot.tsx` ruft `e.preventDefault()` auf und liest dann `e.clipboardData.getData('text')`. Wenn Microsoft Teams auf Windows den Link nur im HTML-Format in die Zwischenablage legt (nicht als plain text), gibt `getData('text')` einen leeren String zurueck. Das Ergebnis: Das URL-Feld wird geleert statt befuellt.

### Loesung
Den Paste-Handler in beiden Komponenten robuster machen:
1. Zuerst `text/plain` versuchen
2. Falls leer, `text/html` auslesen und daraus die URL extrahieren
3. Falls beides leer ist, das Default-Verhalten des Browsers nicht blockieren (kein `preventDefault()`)

Betroffene Dateien:
- `src/components/calendar/QuickMeetingJoin.tsx` (Zeile 133-137)
- `src/components/MeetingBot.tsx` (Zeile 89-93)

### Code-Aenderung (beide Dateien gleich)

```tsx
onPaste={(e) => {
  const plainText = e.clipboardData.getData('text/plain');
  const htmlText = e.clipboardData.getData('text/html');

  let url = plainText?.trim() || '';

  // Fallback: URL aus HTML extrahieren (Windows Teams kopiert oft nur HTML)
  if (!url && htmlText) {
    const match = htmlText.match(/https?:\/\/[^\s"<>]+/);
    if (match) url = match[0];
  }

  if (url) {
    e.preventDefault();
    setMeetingUrl(url);
  }
  // Kein preventDefault wenn nichts gefunden - Browser-Default greifen lassen
}}
```

## Problem 2: Bot-Avatar-Upload auf Windows

### Status
Das `accept`-Attribut im File-Input (`Settings.tsx`, Zeile 601) enthaelt bereits sowohl MIME-Typen als auch Dateiendungen:
```
accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
```
Das ist korrekt und sollte auf Windows funktionieren. Keine Aenderung noetig.

## Zusammenfassung

| Datei | Aenderung |
|-------|-----------|
| `QuickMeetingJoin.tsx` | Paste-Handler: HTML-Fallback fuer Windows Teams |
| `MeetingBot.tsx` | Paste-Handler: HTML-Fallback fuer Windows Teams |
| `Settings.tsx` | Keine Aenderung noetig (accept-Attribut bereits korrekt) |

