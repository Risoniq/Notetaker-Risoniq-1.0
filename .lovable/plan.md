
# Onboarding-Tour für Kalender-Verbindung

## Übersicht

Eine interaktive Einführungstour wird erstellt, die neuen Benutzern erklärt, wie sie ihren Kalender verbinden können. Die Tour wird bei der ersten Anmeldung automatisch gestartet und kann in den Einstellungen jederzeit erneut ausgelöst werden.

## Komponenten-Architektur

```text
src/
├── components/
│   └── onboarding/
│       ├── OnboardingTour.tsx      # Haupt-Tour-Komponente
│       ├── TourStep.tsx            # Einzelner Tour-Schritt mit Spotlight
│       └── TourProvider.tsx        # Context für Tour-Zustand
├── hooks/
│   └── useOnboardingTour.ts        # Hook für Tour-Logik & Persistenz
└── pages/
    └── Settings.tsx                # Button zum erneuten Starten
```

## Tour-Schritte

Die Tour besteht aus 4 Schritten:

| Schritt | Ziel | Beschreibung |
|---------|------|--------------|
| 1 | Willkommen | Begruessung und Erklaerung des Zwecks |
| 2 | Navigation zum Kalender | Hinweis auf den Kalender-Link in der Navigation |
| 3 | Kalender verbinden | Erklaerung der Google/Microsoft-Verbindung |
| 4 | Automatische Aufnahme | Hinweis auf die Einstellung fuer automatische Aufnahmen |

## Datenpersistenz

Der Tour-Status wird in localStorage gespeichert:
- `onboarding:tour_completed` - Boolean, ob die Tour abgeschlossen wurde
- `onboarding:tour_skipped` - Boolean, ob die Tour uebersprungen wurde

## Implementierungsdetails

### 1. TourProvider (Context)

Stellt den globalen Tour-Zustand bereit:
- `isActive`: Ob die Tour gerade laeuft
- `currentStep`: Aktueller Schritt (0-basiert)
- `startTour()`: Tour starten
- `nextStep()`: Naechster Schritt
- `skipTour()`: Tour ueberspringen
- `endTour()`: Tour beenden

### 2. OnboardingTour-Komponente

Features:
- Overlay mit Backdrop-Blur fuer Fokus
- Spotlight-Effekt auf das aktuelle Element
- Positionierung der Tooltip-Box relativ zum Spotlight
- Fortschrittsanzeige (z.B. "Schritt 2 von 4")
- Buttons: "Ueberspringen" und "Weiter" / "Fertig"

### 3. TourStep-Komponente

Fuer jeden Schritt:
- CSS-Selektor fuer das Ziel-Element
- Titel und Beschreibung
- Position des Tooltips (oben, unten, links, rechts)
- Optionale Aktion (z.B. Navigation zur Kalender-Seite)

### 4. useOnboardingTour Hook

Logik:
- Prueft bei App-Start ob Tour bereits abgeschlossen
- Startet Tour automatisch fuer neue Benutzer
- Speichert Fortschritt in localStorage
- Bietet Funktion zum manuellen Neustarten

### 5. Settings-Erweiterung

Neuer Abschnitt "Hilfe & Anleitungen":
- Button "Kalender-Tour erneut starten"
- Kurze Beschreibung was die Tour zeigt

## Benutzerfluss

```text
┌─────────────────────────────────────────────────────────────┐
│                     Erster Login                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Tour starten?  │
                    │                 │
                    │ [Skip] [Start]  │
                    └─────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │   Tour zeigen   │             │  Skip markieren │
    │  Schritt 1-4    │             │  localStorage   │
    └─────────────────┘             └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │ Tour beenden    │
    │ localStorage    │
    └─────────────────┘
```

## UI-Design

Die Tour verwendet das bestehende Glassmorphism-Design:
- Backdrop: `bg-black/40 backdrop-blur-sm`
- Tooltip-Card: `GlassCard` Komponente
- Spotlight: Transparenter Ausschnitt im Overlay
- Buttons: Primaer fuer "Weiter", Ghost fuer "Ueberspringen"

## Dateiaenderungen

### Neue Dateien

1. **src/components/onboarding/TourProvider.tsx**
   - React Context fuer globalen Tour-Zustand
   - Funktionen: startTour, nextStep, skipTour, endTour

2. **src/components/onboarding/OnboardingTour.tsx**
   - Hauptkomponente die das Overlay und die Steps rendert
   - Spotlight-Logik mit getBoundingClientRect()
   - Animations mit CSS transitions

3. **src/components/onboarding/TourStep.tsx**
   - Konfiguration fuer jeden einzelnen Schritt
   - Positionierungslogik fuer den Tooltip

4. **src/hooks/useOnboardingTour.ts**
   - Hook der den Tour-Context konsumiert
   - Hilfsfunktionen und Persistenz-Logik

### Geaenderte Dateien

1. **src/App.tsx**
   - TourProvider um die App wrappen
   - OnboardingTour-Komponente einbinden

2. **src/pages/Index.tsx**
   - Automatischen Tour-Start bei erstem Login triggern

3. **src/pages/Settings.tsx**
   - Neuer Card-Abschnitt "Hilfe & Anleitungen"
   - Button zum erneuten Starten der Tour

4. **src/components/layout/AppLayout.tsx**
   - data-tour-Attribute zu Navigationselementen hinzufuegen
   - Ermoeglicht Spotlight auf "Kalender"-Link

5. **src/pages/Calendar.tsx**
   - data-tour-Attribute zu Verbindungs-Karten hinzufuegen
   - Ermoeglicht Spotlight auf Kalender-Verbindung

## Tour-Inhalt (Deutsch)

**Schritt 1 - Willkommen**
- Titel: "Willkommen beim Meeting Recorder!"
- Text: "Diese kurze Tour zeigt dir, wie du deinen Kalender verbindest, damit der Bot automatisch deinen Meetings beitritt."

**Schritt 2 - Navigation**
- Titel: "Kalender-Seite"
- Text: "Klicke hier, um zur Kalender-Verwaltung zu gelangen."
- Spotlight: Kalender-Link in der Navigation

**Schritt 3 - Kalender verbinden**
- Titel: "Kalender verbinden"
- Text: "Verbinde deinen Google- oder Microsoft-Kalender, um automatische Aufnahmen zu aktivieren."
- Spotlight: Kalender-Verbindungskarten

**Schritt 4 - Automatische Aufnahme**
- Titel: "Automatische Aufnahme aktivieren"
- Text: "Aktiviere diese Option, damit der Bot automatisch allen deinen Meetings beitritt."
- Spotlight: Auto-Record Switch
