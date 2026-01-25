
# Dashboard vereinfachen: Nur manuelle Ansicht

## Übersicht

Das Dashboard wird vereinfacht, indem die Tab-Navigation entfernt wird. Die **Kalender-Automatik** (RecallCalendarView) bleibt weiterhin in den **Einstellungen** verfügbar (dort ist bereits die Kalender-Integration mit den Aufnahme-Einstellungen). Das Hauptdashboard zeigt nur noch die manuelle Bot-Steuerung und Desktop-Aufnahme.

## Änderungen

### 1. Dashboard (src/pages/Index.tsx)

Die 3-Tab-Navigation wird entfernt. Stattdessen wird das Dashboard folgendermaßen aufgebaut:

```
┌─────────────────────────────────────────────────────────────┐
│  Quota Progress Bar                                         │
├─────────────────────────────────────────────────────────────┤
│  Header: Dashboard                                          │
│  "Lass einen Bot deine Meetings aufnehmen..."              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐ ┌─────────────────────────────┐│
│  │ Schnell-Beitritt        │ │ Manueller Bot               ││
│  │ (QuickMeetingJoin)      │ │ (MeetingBot)                ││
│  └─────────────────────────┘ └─────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Desktop-Aufnahme (DesktopRecordingTab)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐ ┌─────────────────────────────┐│
│  │ Letzte Aktivitäten      │ │ Aufnahmen                   ││
│  │ (RecentActivityList)    │ │ (RecordingsList)            ││
│  └─────────────────────────┘ └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Änderungen im Detail:**
- Entfernung der Tabs-Komponente und TabsList/TabsTrigger/TabsContent
- Entfernung des Imports für `RecallCalendarView`, `Calendar` (Icon), `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- Direktes Rendern der manuellen Komponenten ohne Tab-Wrapper
- Beibehaltung von `QuickMeetingJoin`, `MeetingBot`, `RecordingViewer`, `DesktopRecordingTab`

### 2. Einstellungen (src/pages/Settings.tsx)

Die Kalender-Integration existiert bereits mit:
- RecallCalendarConnection (Google & Microsoft OAuth)
- Aufnahme-Einstellungen (auto_record, record_all, record_only_owned, record_external)

**Optional hinzufügen:** Eine Kalender-Ansicht innerhalb der Einstellungen, die anstehende Meetings zeigt (wie `RecallCalendarView`). Dies ist aber bereits implizit durch die Verbindung nutzbar.

### 3. Optionale Anpassungen

- Der Hinweis in `RecallCalendarView` ("Verbinde deinen Kalender in den Einstellungen...") bleibt relevant, da er auf die Einstellungen verweist
- Die Navigation in `AppLayout` bleibt unverändert (Dashboard, Transkripte, Einstellungen)

---

## Technische Details

### Dateien die geändert werden:

| Datei | Änderung |
|-------|----------|
| `src/pages/Index.tsx` | Tab-Navigation entfernen, Komponenten direkt rendern |

### Entfernte Imports (Index.tsx):
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` von `@/components/ui/tabs`
- `RecallCalendarView` von `@/components/calendar/RecallCalendarView`
- `Calendar` Icon von `lucide-react`

### Neue Layout-Struktur (Index.tsx):
1. Quota Progress Bar (unverändert)
2. Header (unverändert)
3. Bot-Steuerung Grid (2 Spalten):
   - Links: QuickMeetingJoin
   - Rechts: MeetingBot + aktive Aufnahme
4. Desktop-Aufnahme Section
5. Dashboard Grid (2 Spalten, unverändert):
   - Letzte Aktivitäten
   - Aufnahmen

### Beibehaltene Funktionalität:
- Alle manuellen Bot-Funktionen bleiben erhalten
- Desktop-Aufnahme bleibt im Dashboard
- Kalender-Automatik ist weiterhin über Einstellungen steuerbar
- Die Aufnahme-Preferences (auto_record etc.) sind in den Einstellungen konfigurierbar
