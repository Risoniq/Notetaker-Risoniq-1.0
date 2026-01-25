
# Manueller Bot entfernen & QuickMeetingJoin erweitern

## Übersicht

Der "Manueller Bot" Bereich wird entfernt, da er die gleiche Funktionalität wie "Schnell-Beitritt" bietet. Die nützlichen Features werden in `QuickMeetingJoin` integriert.

## Änderungen

### 1. Dashboard (src/pages/Index.tsx)

**Entfernen:**
- GlassCard "Manueller Bot" mit MeetingBot-Komponente
- Import von `MeetingBot`

**Anpassen:**
- `QuickMeetingJoin` erhält den `onBotStarted` Callback, der die Recording-ID setzt
- Der `RecordingViewer` bleibt erhalten und wird direkt unter QuickMeetingJoin angezeigt

**Neues Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Quota Progress Bar                                         │
├─────────────────────────────────────────────────────────────┤
│  Header: Dashboard                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Bot zu Meeting senden (QuickMeetingJoin)                ││
│  │ + Teams-Warnung bei Enterprise-Meetings                 ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Aktive Aufnahme (RecordingViewer) - nur wenn aktiv      ││
│  └──────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Desktop-Aufnahme                                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐ ┌─────────────────────────────┐│
│  │ Letzte Aktivitäten      │ │ Aufnahmen                   ││
│  └─────────────────────────┘ └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2. QuickMeetingJoin erweitern (src/components/calendar/QuickMeetingJoin.tsx)

**Neue Features hinzufügen:**
- Teams Business/Enterprise Erkennung (wie in MeetingBot)
- Warnung bei externen Teams-Meetings anzeigen
- Recording-ID aus Response extrahieren und via Callback zurückgeben

**Interface ändern:**
```typescript
interface QuickMeetingJoinProps {
  onBotStarted?: (recordingId?: string) => void;  // recordingId hinzufügen
}
```

---

## Technische Details

### Dateien die geändert werden:

| Datei | Änderung |
|-------|----------|
| `src/pages/Index.tsx` | MeetingBot entfernen, Layout anpassen |
| `src/components/calendar/QuickMeetingJoin.tsx` | Teams-Warnung + Recording-ID Callback |

### Änderungen in Index.tsx:
- Import `MeetingBot` entfernen
- 2-Spalten Grid für Bot-Steuerung → 1-Spalten Layout
- QuickMeetingJoin erhält `onBotStarted` mit Recording-ID
- RecordingViewer bleibt unter QuickMeetingJoin

### Änderungen in QuickMeetingJoin.tsx:
- `useMemo` Import hinzufügen
- `isExternalTeamsMeeting` Erkennung hinzufügen
- `Alert` und `AlertTriangle` Import hinzufügen
- Warnung bei Teams Business/Enterprise anzeigen
- `recording.id` aus Response extrahieren und an Callback übergeben

### Beibehaltene Funktionalität:
- URL-Validierung (war nur in QuickMeetingJoin)
- Teams-Warnung (übernommen von MeetingBot)
- Recording-Viewer für aktive Aufnahmen
- Bot-Settings aus localStorage
