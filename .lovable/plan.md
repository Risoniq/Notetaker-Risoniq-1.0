
# Plan: Dauerhafte Titel-Speicherung beheben

## Problem-Analyse

Die Titel-Änderungen werden zwar in die Datenbank gespeichert, aber folgende Faktoren können dazu führen, dass die Änderung "verloren geht":

1. **Race Condition mit Auto-Sync**: Der `useEffect` in `MeetingDetail.tsx` führt alle 30 Sekunden einen Sync durch (Zeile 206-227), der `fetchRecording()` aufruft und das lokale State überschreibt
2. **Kein React Query Cache**: Die Komponente nutzt direkten `useState` statt React Query, wodurch es keinen automatischen Cache-Invalidierung gibt
3. **Timing-Problem**: Wenn `fetchRecording()` parallel zum Title-Update läuft, überschreibt der Fetch-Response den gerade gesetzten Titel

## Lösung

Die `EditableTitle` Komponente muss sicherstellen, dass nach einem erfolgreichen Update **alle Query-Caches invalidiert werden**, sodass nachfolgende Fetches den aktuellen Wert bekommen.

### Änderung 1: Optimistisches Update mit Rollback in EditableTitle

Die Komponente wird erweitert, um:
- Den lokalen State sofort zu aktualisieren (optimistisch)
- Bei Fehler automatisch auf den alten Wert zurückzusetzen
- Den `onTitleChange` Callback mit dem neuen Wert aufzurufen

```text
┌─────────────────────────────────────────────────┐
│ 1. User ändert Titel                            │
│    ↓                                            │
│ 2. Lokaler State sofort aktualisiert           │
│    ↓                                            │
│ 3. Supabase Update im Hintergrund              │
│    ↓                                            │
│ 4a. Erfolg → onTitleChange aufrufen            │
│ 4b. Fehler → Rollback auf alten Wert           │
└─────────────────────────────────────────────────┘
```

### Änderung 2: MeetingDetail.tsx - Sync nach Title-Change überspringen

Im `onTitleChange` Callback wird ein Flag gesetzt, das verhindert, dass der nächste Auto-Sync den Titel überschreibt:

| Problem | Lösung |
|---------|--------|
| Auto-Sync überschreibt Titel | Flag `titleJustUpdated` setzen |
| Race Condition bei Fetch | `fetchRecording` prüft Flag |

### Änderung 3: React Query Integration (optional aber empfohlen)

Da das Projekt React Query bereits nutzt (`@tanstack/react-query`), wäre die sauberste Lösung, den Recording-Fetch als Query zu implementieren und `queryClient.invalidateQueries()` nach dem Title-Update aufzurufen.

## Technische Implementierung

### EditableTitle.tsx

- `handleSave()` aufrufen von `onTitleChange` direkt nach lokaler State-Änderung (optimistisch)
- Bei Supabase-Fehler: Rollback mit `setEditedTitle(title || '')`
- Bei Erfolg: Query Cache invalidieren (falls React Query verfügbar)

### MeetingDetail.tsx

- Statt lokalem `setRecording`, die `queryClient.setQueryData()` nutzen
- Alternativ: `refetchRef` Flag, das nach Title-Update kurzzeitig true ist und verhindert, dass der Auto-Sync den Titel überschreibt

## Dateien

| Datei | Aktion |
|-------|--------|
| `src/components/recordings/EditableTitle.tsx` | Optimistisches Update + Rollback |
| `src/pages/MeetingDetail.tsx` | Race Condition mit Auto-Sync beheben |

## Erwartetes Ergebnis

Nach der Änderung:
1. Titel wird sofort in der UI aktualisiert
2. Bei Fehler wird der alte Titel wiederhergestellt
3. Auto-Sync überschreibt den manuell gesetzten Titel nicht mehr
4. Reload der Seite zeigt den korrekten Titel aus der Datenbank
