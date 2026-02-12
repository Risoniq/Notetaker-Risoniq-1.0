
## Multi-Team-Mitgliedschaft und klare Menustruktur

### Ueberblick

Aktuell kann ein User nur in EINEM Team sein. Das wird erweitert, sodass User in mehreren Teams Mitglied und/oder Teamlead sein koennen. Die Admin-Seite und das Dashboard erhalten eine klarere Struktur.

### 1. Datenbank-Aenderungen

Die `team_members`-Tabelle hat bereits einen UNIQUE-Constraint auf `(team_id, user_id)` - ein User kann also nicht doppelt im selben Team sein, aber technisch bereits in mehreren Teams. Das Problem liegt im Code:

- Die `admin-assign-team-member` Edge Function loescht bei "assign" ALLE bestehenden Team-Mitgliedschaften bevor sie den User zuweist
- Die `admin-dashboard` Edge Function mappt nur EIN Team pro User (`teamMemberMap.set`)
- Der `useTeamleadCheck` Hook nutzt `maybeSingle()` und gibt nur ein Team zurueck
- Die RLS-Policy "Teamleads can view team recordings" funktioniert bereits fuer mehrere Teams (JOIN-basiert)

**Keine DB-Schema-Aenderungen noetig** - die Tabelle unterstuetzt bereits Multi-Team.

### 2. Edge Function: `admin-assign-team-member`

- "assign" Action: NICHT mehr alle bestehenden Mitgliedschaften loeschen, sondern nur pruefen ob der User bereits in diesem Team ist, und falls nicht, hinzufuegen
- "remove" Action: Benoetigt jetzt eine `team_id`, damit nur die Mitgliedschaft in einem bestimmten Team entfernt wird (nicht alle)
- "set-role" Action: Benoetigt jetzt eine `team_id`, damit die Rolle nur in einem bestimmten Team geaendert wird

### 3. Edge Function: `admin-dashboard`

- Statt `teamMemberMap.set(userId, singleTeam)` ein Array pro User: `teamMemberships: [{teamId, teamName, teamRole}]`
- Die User-Daten enthalten dann `teams: [{id, name, role}]` statt `team_id/team_name/team_role`
- Kontingent-Berechnung: User-Kontingent wird ueber ALLE Teams summiert (oder das hoechste Team-Kontingent verwendet)

### 4. Edge Function: `teamlead-recordings`

- Statt `maybeSingle()` alle Lead-Mitgliedschaften abfragen
- Recordings aus ALLEN Teams sammeln, in denen der User Teamlead ist
- Deduplizierung falls ein Recording-Owner in mehreren Teams des Leads ist

### 5. Hook: `useTeamleadCheck`

- Gibt jetzt ein Array von Teams zurueck statt eines einzelnen Teams
- `isTeamlead` ist `true` wenn mindestens ein Team mit Rolle "lead" existiert
- Neue Struktur: `teams: [{id, name, maxMinutes, members}]`

### 6. Frontend: Admin-Seite (`/admin`)

**Benutzer-Tab:**
- Statt eines einzelnen Team-Dropdowns: Anzeige aller Team-Badges des Users mit Rolle (Mitglied/Lead)
- Button "Teams verwalten" oeffnet einen Dialog wo man den User mehreren Teams zuweisen kann

**Teams-Tab (bestehend):**
- Bleibt wie bisher - TeamCard mit "Mitglieder verwalten" Dialog
- TeamMembersDialog: Aenderung der "Verfuegbare User"-Liste - User die bereits im Team sind werden nicht mehr angezeigt, aber User die in ANDEREN Teams sind bleiben verfuegbar (ohne Warnung)

### 7. Frontend: Dashboard und Recordings

**Dashboard (`/`):**
- Wenn User in mehreren Teams Teamlead ist: Dropdown/Tabs zur Team-Auswahl im Analytics-Bereich
- TeamAnalyticsCard erhaelt ein `teamId` Prop

**Recordings (`/recordings`):**
- Team-Toggle zeigt bei Multi-Team ein Dropdown mit Team-Auswahl statt nur "Meine/Team"
- Optionen: "Meine" | "Team A" | "Team B" | ...

### 8. Admin bleibt unsichtbar

- Der Admin sieht weiterhin ALLES (alle Recordings, alle Teams, alle User)
- Teamleads und normale User sehen den Admin-Bereich nicht (bestehendes Verhalten, keine Aenderung noetig)
- Im Admin-Dashboard ist der Admin ueber dem Team-Layer und kann alle Teams und User verwalten

### Zusammenfassung der Dateien

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/admin-assign-team-member/index.ts` | Multi-Team assign/remove/set-role |
| `supabase/functions/admin-dashboard/index.ts` | Teams-Array statt einzelnem Team pro User |
| `supabase/functions/teamlead-recordings/index.ts` | Alle Lead-Teams abfragen |
| `src/hooks/useTeamleadCheck.ts` | Array von Teams zurueckgeben |
| `src/pages/Admin.tsx` | Multi-Team-Badges und Zuweisung in User-Tab |
| `src/components/admin/TeamMembersDialog.tsx` | Multi-Team-kompatible Filterung |
| `src/pages/Recordings.tsx` | Team-Auswahl-Dropdown statt Toggle |
| `src/pages/Index.tsx` | Team-Auswahl im Dashboard |
| `src/components/dashboard/TeamAnalyticsCard.tsx` | Team-ID als Prop |
| `src/components/recordings/RecordingsList.tsx` | Team-ID fuer Recordings-Fetch |

### Technische Details

```text
Hierarchie:
+---------+
| Admin   |  Sieht alles, verwaltet alles
+---------+
     |
+------------+  +------------+
| Team A     |  | Team B     |  Teams mit eigenem Kontingent
+------------+  +------------+
  |  Lead: U1     |  Lead: U2, U3
  |  Member: U2   |  Member: U1, U4
  |  Member: U3   |
  
User U1 ist Member in Team A UND Member in Team B
User U2 ist Member in Team A UND Lead in Team B
```

Die Admin-Sicht bleibt komplett getrennt vom Team-Layer - normale User und Teamleads sehen weder den Admin-Menuepunkt noch Admin-spezifische Daten.
