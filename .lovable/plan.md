

# Fix: Einfuehrungstour - Navigation, Spotlight und einmaliger Start

## Probleme

### 1. Tour-Elemente werden nicht gefunden
- Step 1 sucht `[data-tour="calendar-nav"]` -- dieses Attribut existiert nirgends in der Navigation
- Step 1 navigiert zu `/calendar`, aber diese Route leitet auf `/settings` weiter -- die Navigation kommt nie am richtigen Ziel an
- Steps 2-3 zeigen auf Elemente auf der Settings-Seite, aber die Tour navigiert nicht zuverlaessig dorthin

### 2. Tour startet nach jedem Login
- Der Tour-Status wird in `localStorage` gespeichert (browserspezifisch)
- Wenn ein User den Browser wechselt, Daten loescht oder ein anderes Geraet nutzt, startet die Tour erneut
- Loesung: Tour-Status in der Datenbank pro User speichern

---

## Aenderungen

### A. Datenbank: Tour-Status pro User speichern

Neue Spalte `tour_completed` (boolean, default false) in einer bestehenden User-Tabelle oder als eigene kleine Tabelle:

```sql
CREATE TABLE public.onboarding_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_status ENABLE ROW LEVEL SECURITY;

-- User kann eigenen Status lesen und aendern
CREATE POLICY "Users can view own onboarding status"
  ON public.onboarding_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding status"
  ON public.onboarding_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding status"
  ON public.onboarding_status FOR UPDATE
  USING (auth.uid() = user_id);
```

### B. Tour-Steps korrigieren (`TourStep.tsx`)

Die Steps muessen zur tatsaechlichen App-Struktur passen:

| Step | Aktuell (kaputt) | Neu (korrigiert) |
|------|-----------------|------------------|
| 0 | Welcome (center) | Welcome (center) -- bleibt |
| 1 | Sucht `calendar-nav`, navigiert zu `/calendar` | Sucht `[data-tour="settings-nav"]`, navigiert zu `/settings` |
| 2 | Sucht `calendar-connection` auf falscher Seite | Bleibt gleich, aber jetzt auf `/settings` korrekt |
| 3 | Sucht `auto-record` auf falscher Seite | Bleibt gleich, aber jetzt auf `/settings` korrekt |

### C. `data-tour` Attribut zur Navigation hinzufuegen (`AppLayout.tsx`)

Das Einstellungen-Nav-Item bekommt `data-tour="settings-nav"`, damit Step 1 das Element finden und highlighten kann.

### D. Tour-Provider und Hook anpassen

- `TourProvider.tsx`: Statt localStorage wird der DB-Status verwendet
- `useOnboardingTour.ts`: Beim Mount den DB-Status abfragen; Tour nur starten wenn `tour_completed = false` und der User zum allerersten Mal eingeloggt ist
- `skipTour` und `endTour` schreiben `tour_completed = true` in die Datenbank
- localStorage als Fallback/Cache beibehalten, aber die Quelle der Wahrheit ist die DB

### E. Navigation beim Step-Wechsel verbessern (`OnboardingTour.tsx`)

- Bei `handleNext`: Wenn der Step eine Navigation erfordert, zuerst navigieren und dann warten bis das Ziel-Element im DOM sichtbar ist (statt fester 300ms Timeout)
- Retry-Logik fuer `calculatePositions`: Wenn das Target-Element nicht gefunden wird, mehrmals versuchen (bis zu 1s)

---

## Zusammenfassung der betroffenen Dateien

| Datei | Aenderung |
|-------|-----------|
| Migration (SQL) | Neue Tabelle `onboarding_status` mit RLS |
| `src/components/onboarding/TourStep.tsx` | Steps korrigieren: `/settings` statt `/calendar`, `settings-nav` statt `calendar-nav` |
| `src/components/layout/AppLayout.tsx` | `data-tour="settings-nav"` an Einstellungen-Link |
| `src/components/onboarding/TourProvider.tsx` | DB-basierter Status statt nur localStorage |
| `src/hooks/useOnboardingTour.ts` | DB-Abfrage fuer Tour-Status |
| `src/components/onboarding/OnboardingTour.tsx` | Robustere Navigation und Element-Suche mit Retry |

