

## Projekt-Einladung um Team-Auswahl erweitern

### Uebersicht

Der bestehende Einladungsdialog (`InviteToProjectDialog`) wird um einen zweiten Bereich ergaenzt: eine Listenauswahl aller Teammitglieder des aktuellen Users. So kann man Mitglieder entweder per E-Mail einladen (fuer externe) oder direkt aus der Teamliste auswaehlen.

### Aenderungen

**1. Edge Function `project-invite/index.ts` - Neue Action `list-team-members`**

Eine neue Action, die alle Teammitglieder des aufrufenden Users zurueckgibt (gruppiert nach Team, mit E-Mail-Aufloesung). Bereits eingeladene Mitglieder werden markiert. Logik:
- Teams des Users ueber `team_members` laden
- Alle Mitglieder dieser Teams laden (ohne den User selbst)
- E-Mails ueber `auth.admin.listUsers()` aufloesen
- Rueckgabe: `{ members: [{ userId, email, teamId, teamName }] }`

**2. Edge Function `project-invite/index.ts` - Neue Action `invite-by-user-id`**

Ergaenzend zur bestehenden `invite`-Action (per E-Mail) eine neue Action, die direkt eine `userId` akzeptiert. Damit entfaellt die E-Mail-Suche, da der User bereits aus der Liste ausgewaehlt wurde. Prueft weiterhin: Projekt-Owner, gleiche Team-Zugehoerigkeit, keine Duplikate.

**3. `InviteToProjectDialog.tsx` - UI erweitern**

Der Dialog bekommt zwei Bereiche:

| Bereich | Beschreibung |
|---------|-------------|
| Teammitglieder-Liste (oben) | Checkboxen mit allen Teammitgliedern, gruppiert nach Team. Bereits eingeladene sind ausgegraut/markiert. "Alle einladen"-Button pro Team. |
| E-Mail-Einladung (unten) | Das bestehende E-Mail-Eingabefeld bleibt erhalten fuer externe Einladungen. |

Technische Details:
- Beim Oeffnen des Dialogs werden parallel `list` (bestehende Mitglieder) und `list-team-members` geladen
- Klick auf ein Teammitglied ruft `invite-by-user-id` auf und aktualisiert die Liste
- Bereits eingeladene Mitglieder (aus der `members`-Liste) werden als "checked" und disabled angezeigt
- "Alle einladen"-Button pro Team laedt alle noch nicht eingeladenen Mitglieder ein

### Zusammenfassung

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/project-invite/index.ts` | Neue Actions `list-team-members` und `invite-by-user-id` |
| `src/components/projects/InviteToProjectDialog.tsx` | Teammitglieder-Liste mit Checkboxen oberhalb des E-Mail-Felds |

Keine Datenbank-Aenderungen noetig - die bestehende `project_members`-Tabelle wird wiederverwendet.

