
# Fix: "Automatisch beitreten" Toggle springt auf AN

## Problem

Der Schalter "Automatische Aufnahme" zeigt beim Laden der Einstellungsseite kurz den Standardwert (AUS) an, bevor die gespeicherten Praeferenzen aus der Datenbank geladen werden. Wenn der gespeicherte Wert AN ist, "springt" der Schalter sichtbar von AUS auf AN. Das passiert bei jedem Seitenaufruf und wirkt wie ein Bug.

## Ursache

Der Hook `useRecallCalendarMeetings` initialisiert den `preferences`-State sofort mit Standardwerten (`auto_record: false`), waehrend die tatsaechlichen Werte asynchron aus der Datenbank geladen werden. Es gibt keinen Loading-State fuer Praeferenzen, sodass die Switches sofort mit falschen Werten gerendert werden.

## Loesung

### Schritt 1: Loading-State fuer Praeferenzen im Hook hinzufuegen

**Datei:** `src/hooks/useRecallCalendarMeetings.ts`

- Neuen State `preferencesLoaded` (boolean, default `false`) hinzufuegen
- Nach erfolgreichem Laden der Praeferenzen auf `true` setzen
- Als Rueckgabewert exportieren

### Schritt 2: Switches erst nach Laden anzeigen

**Datei:** `src/pages/Settings.tsx`

- `preferencesLoaded` aus dem Hook destrukturieren
- Im Bereich "Aufnahme-Einstellungen" einen Loading-Skeleton oder Spinner anzeigen, solange `preferencesLoaded` false ist
- Die Switch-Elemente erst rendern, wenn die Praeferenzen vollstaendig geladen sind

## Technische Details

### Hook-Aenderung (useRecallCalendarMeetings.ts)

```typescript
// Neuer State
const [preferencesLoaded, setPreferencesLoaded] = useState(false);

// In loadPreferences, nach setPreferences:
if (data.success && data.preferences) {
  setPreferences(data.preferences);
  prefsLoadedRef.current = true;
  setPreferencesLoaded(true);   // NEU
}

// Auch bei Fehler oder wenn kein User-Eintrag existiert:
// setPreferencesLoaded(true) um den Default-State zu bestaetigen

// Export erweitern:
return {
  ...
  preferencesLoaded,
  ...
};
```

### UI-Aenderung (Settings.tsx)

```typescript
const { preferences, updatePreferences, fetchMeetings, preferencesLoaded } = useRecallCalendarMeetings();

// Im CardContent der Aufnahme-Einstellungen:
{!preferencesLoaded ? (
  <div className="flex items-center justify-center py-4">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
) : (
  // ... bestehende Switch-Elemente
)}
```

## Erwartetes Ergebnis

- Beim Laden der Seite wird ein Spinner statt der Switches angezeigt
- Sobald die Praeferenzen geladen sind, erscheinen die Switches mit dem korrekten gespeicherten Wert
- Kein "Springen" des Toggles mehr sichtbar
