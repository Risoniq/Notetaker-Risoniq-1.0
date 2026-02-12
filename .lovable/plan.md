

## Meeting mit Team/Teammitgliedern teilen - Dropdown neben Projektzuordnung

### Uebersicht

Neben dem bestehenden "Projekt zuordnen"-Dropdown auf der Meeting-Detailseite wird ein neues Dropdown eingefuegt, ueber das der Nutzer das Meeting mit seinem gesamten Team oder einzelnen Teammitgliedern teilen kann. Dafuer wird die bestehende `shared_recordings`-Tabelle und die `share-recording` Edge Function wiederverwendet.

### Aenderungen

**1. Neue Komponente: `src/components/meeting/TeamShareDropdown.tsx`**

Eine neue Komponente, die neben `ProjectAssignment` platziert wird. Sie:
- Laedt die Teams des aktuellen Users ueber die `team_members`-Tabelle
- Laedt alle Teammitglieder der gefundenen Teams (mit E-Mail-Aufloesung)
- Zeigt ein Dropdown mit zwei Bereichen:
  - "Ganzes Team teilen" (teilt mit allen Mitgliedern eines Teams auf einmal)
  - Einzelne Teammitglieder zum Auswaehlen
- Bereits geteilte Mitglieder werden als Badges mit X-Button angezeigt (wie bei ProjectAssignment)
- Nutzt die bestehende `share-recording` Edge Function fuer jede Freigabe

**2. Edge Function `share-recording/index.ts` erweitern**

Neue Action `share-team` hinzufuegen:
- Empfaengt `recording_id` und eine Liste von `user_ids`
- Erstellt fuer jeden User einen Eintrag in `shared_recordings` (ignoriert Duplikate)
- Spart mehrere Einzelaufrufe

**3. MeetingDetail.tsx anpassen**

- `TeamShareDropdown` neben `ProjectAssignment` in Zeile 681 einfuegen
- Layout: Beide Dropdowns nebeneinander in einer Zeile

### Technische Details

| Datei | Aenderung |
|-------|-----------|
| `src/components/meeting/TeamShareDropdown.tsx` | Neue Komponente: Team-/Mitglieder-Dropdown mit Share-Logik |
| `supabase/functions/share-recording/index.ts` | Neue Action `share-team` fuer Bulk-Sharing mit mehreren User-IDs |
| `src/pages/MeetingDetail.tsx` | TeamShareDropdown neben ProjectAssignment einfuegen (Zeile 680-682) |

### Ablauf

1. User oeffnet Meeting-Detailseite
2. Neben dem Projekt-Dropdown erscheint ein "Mit Team teilen"-Dropdown (Users-Icon)
3. Dropdown zeigt: Team-Name (alle teilen) + einzelne Mitglieder mit Checkboxen
4. Bei Auswahl wird `share-recording` Edge Function aufgerufen
5. Bereits geteilte Mitglieder werden als Badges angezeigt und koennen per X entfernt werden

### Keine Datenbank-Aenderungen noetig

Die bestehende `shared_recordings`-Tabelle deckt den Use Case bereits ab. Fuer jedes Teammitglied wird ein eigener Eintrag erstellt.

