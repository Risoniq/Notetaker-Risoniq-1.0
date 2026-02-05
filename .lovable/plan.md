
## Ziel
Wenn eine Audiodatei hochgeladen wird, soll kein "Bot versucht beizutreten"-Feld erscheinen, sondern nur der Fortschritt der Transkription innerhalb der Upload-Karte angezeigt werden.

## Analyse des Problems
Aktuell passiert Folgendes:
1. Benutzer lädt Audio-Datei hoch
2. `AudioUploadCard` zeigt Fortschritt (Hochladen → Transkribieren → Erfolg) ✓
3. Nach Erfolg wird `onUploadComplete(recordingId)` aufgerufen
4. Dies öffnet den `RecordingViewer` mit Bot-spezifischen Meldungen ✗

Der `RecordingViewer` ist nur für Bot-gesteuerte Meetings konzipiert und zeigt:
- "Warte auf Bot..."
- "Bot tritt bei..."
- "Bot nimmt auf..."

## Lösung
Für manuelle Uploads soll **kein** `RecordingViewer` geöffnet werden, da:
- Die `AudioUploadCard` bereits einen eigenen Fortschrittsbalken hat
- Die Transkription synchron abläuft (nicht asynchron wie beim Bot)
- Nach Erfolg ist das Recording bereits fertig und kann in der Recordings-Liste gefunden werden

### Umsetzung

**Datei: `src/pages/Index.tsx`**

Die Logik anpassen, sodass `setActiveRecordingId` nur vom Bot verwendet wird:

```typescript
// Nur Bot-Aufnahmen setzen activeRecordingId
<QuickMeetingJoin onBotStarted={setActiveRecordingId} />

// Audio-Upload öffnet NICHT den RecordingViewer
<AudioUploadCard onUploadComplete={() => {
  // Optional: zur Recordings-Seite navigieren oder Query invalidieren
}} />
```

Alternativ (bessere UX): Den Callback entfernen, da die `AudioUploadCard` bereits selbst Feedback gibt:

```diff
- <AudioUploadCard onUploadComplete={setActiveRecordingId} />
+ <AudioUploadCard />
```

---

## Technische Details

Die Änderung ist minimal:
1. In `Index.tsx` den `onUploadComplete`-Callback von `AudioUploadCard` entfernen
2. Der Upload zeigt weiterhin seinen eigenen Fortschritt und Erfolg
3. Der `RecordingViewer` wird nur für echte Bot-Aufnahmen verwendet
