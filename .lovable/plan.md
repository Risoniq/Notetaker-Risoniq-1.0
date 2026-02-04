

# Plan: Teamlead-Rolle mit Subuser-Einsicht

## Uebersicht

Erweiterung der Team-Funktionalitaet um eine **Teamlead-Rolle**, die:
- Meetings und Transkripte aller Team-Mitglieder (Subuser) einsehen kann
- Team-Statistiken im Dashboard sehen kann
- Keine Admin-Rechte hat (kann keine Benutzer verwalten, nur lesen)

## Rollenmodell

```text
┌────────────────────────────────────────────────────────────┐
│                      ADMIN                                  │
│  - Vollzugriff auf alle Daten                              │
│  - Kann Teams/User verwalten                               │
└────────────────────────────────────────────────────────────┘
                           │
┌────────────────────────────────────────────────────────────┐
│                     TEAMLEAD                                │
│  - Sieht Meetings aller Team-Mitglieder                    │
│  - Sieht Team-Statistiken                                  │
│  - Kann eigene Meetings aufnehmen                          │
│  - Keine Verwaltungsrechte                                 │
└────────────────────────────────────────────────────────────┘
                           │
┌────────────────────────────────────────────────────────────┐
│                    MEMBER (Subuser)                         │
│  - Sieht nur eigene Meetings                               │
│  - Teilt Team-Kontingent                                   │
└────────────────────────────────────────────────────────────┘
```

## Datenbank-Aenderungen

### 1. team_members.role Werte erweitern

Aktuell: `role = 'member'` (Standard)

Neu: Unterstuetzung fuer `role = 'lead'` zusaetzlich zu `'member'`

Keine Schemaaenderung noetig - das `role` Feld ist bereits ein TEXT-Typ.

### 2. Neue RLS Policy fuer Recordings

Teamleads muessen Recordings aller Team-Mitglieder lesen koennen:

```sql
-- Teamleads koennen Recordings ihrer Team-Mitglieder sehen
CREATE POLICY "Teamleads can view team recordings"
ON public.recordings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members AS my_membership
    JOIN public.team_members AS target_membership 
      ON my_membership.team_id = target_membership.team_id
    WHERE my_membership.user_id = auth.uid()
      AND my_membership.role = 'lead'
      AND target_membership.user_id = recordings.user_id
  )
);
```

## Backend-Aenderungen

### 1. admin-assign-team-member erweitern

Unterstuetzung fuer `role` Parameter beim Zuweisen:
- `action: 'assign'` mit `role: 'lead'` oder `role: 'member'`
- `action: 'set-role'` um Rolle eines bestehenden Mitglieds zu aendern

### 2. Neue Edge Function: teamlead-dashboard

Fuer Teamleads, die Team-Statistiken sehen wollen:

```typescript
// Prueft ob User ein Teamlead ist
// Laedt alle Recordings der Team-Mitglieder
// Berechnet Team-Statistiken
```

### 3. Neue Edge Function: teamlead-recordings

Fuer Teamleads, die Team-Recordings laden wollen:

```typescript
// Gibt alle Recordings aller Team-Mitglieder zurueck
// Mit Info welchem Mitglied die Aufnahme gehoert
```

## Frontend-Aenderungen

### 1. Admin.tsx - Teamlead-Zuweisung

Im TeamMembersDialog:
- Dropdown neben jedem Mitglied: "Mitglied" | "Teamlead"
- Badge-Anzeige fuer Teamleads
- Nur ein Teamlead pro Team erlaubt (oder mehrere - je nach Wunsch)

### 2. Neuer Hook: useTeamleadCheck

```typescript
// Prueft ob aktueller User Teamlead in einem Team ist
// Gibt team_id und team_name zurueck falls ja
export function useTeamleadCheck() {
  // Abfrage: team_members WHERE user_id = me AND role = 'lead'
  return { isTeamlead, teamId, teamName, teamMembers };
}
```

### 3. Dashboard (Index.tsx) - Team-Modus fuer Teamleads

Wenn User Teamlead ist:
- Neuer Toggle: "Meine Meetings" | "Team-Meetings"
- RecordingsList zeigt im Team-Modus alle Team-Recordings
- AccountAnalyticsCard zeigt Team-Statistiken

### 4. Transkripte-Seite erweitern

Fuer Teamleads:
- Filter-Dropdown: "Alle Team-Mitglieder" oder einzelne Mitglieder
- Anzeige wem die Aufnahme gehoert (Badge mit E-Mail/Name)

### 5. QuotaProgressBar erweitern

Fuer Teamleads:
- Zeigt "Team-Kontingent" mit Aufschluesselung pro Mitglied

## Implementierungsreihenfolge

### Phase 1: Datenbank
1. RLS Policy fuer Teamlead-Recordings-Zugriff
2. Sicherstellen dass team_members.role flexibel ist

### Phase 2: Backend
3. admin-assign-team-member: role Parameter
4. Neue Edge Function: teamlead-recordings
5. admin-dashboard: Teamlead-Rolle im User-Objekt

### Phase 3: Frontend - Admin
6. TeamMembersDialog: Rollenzuweisung UI
7. TeamCard: Teamlead-Badge anzeigen

### Phase 4: Frontend - User Experience
8. useTeamleadCheck Hook
9. Dashboard: Team-Modus Toggle
10. RecordingsList: Team-Recordings laden
11. AccountAnalyticsCard: Team-Statistiken
12. Transkripte: Team-Filter

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `supabase/migrations/...` | RLS Policy fuer Teamlead |
| `supabase/functions/admin-assign-team-member/index.ts` | role Parameter |
| `supabase/functions/teamlead-recordings/index.ts` | NEU |
| `supabase/functions/admin-dashboard/index.ts` | team_role im User |
| `src/hooks/useTeamleadCheck.ts` | NEU |
| `src/components/admin/TeamMembersDialog.tsx` | Rollen-Dropdown |
| `src/components/admin/TeamCard.tsx` | Teamlead-Badge |
| `src/pages/Index.tsx` | Team-Toggle fuer Teamleads |
| `src/components/recordings/RecordingsList.tsx` | Team-Modus |
| `src/components/dashboard/AccountAnalyticsCard.tsx` | Team-Stats |
| `src/pages/Transcripts.tsx` | Team-Filter |

## Sicherheitsueberlegungen

| Aspekt | Massnahme |
|--------|-----------|
| RLS fuer Recordings | Teamleads nur SELECT, kein UPDATE/DELETE |
| Backend-Validierung | Edge Functions pruefen Teamlead-Status |
| Keine Admin-Rechte | Teamlead kann keine Benutzer verwalten |
| Team-Isolation | Teamlead sieht nur sein eigenes Team |

## UI-Mockups

### TeamMembersDialog mit Rollen

```text
┌────────────────────────────────────────────────────────────┐
│  Mitglieder: Marketing-Team                                │
├────────────────────────────────────────────────────────────┤
│  Aktuelle Mitglieder (3)                                   │
│  ┌────────────────────────────────────────────────────────┐│
│  │ ★ lead@firma.de              [Teamlead ▼]    [X]     ││
│  │   user1@firma.de             [Mitglied ▼]    [X]     ││
│  │   user2@firma.de             [Mitglied ▼]    [X]     ││
│  └────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

### Dashboard mit Team-Toggle

```text
┌────────────────────────────────────────────────────────────┐
│  Dashboard                    [Meine | Team ●]             │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │ Bot zu Meeting      │  │ Team-Analyse        │         │
│  │ senden              │  │ 3 Mitglieder aktiv  │         │
│  │                     │  │ 45h / 100h          │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                            │
│  Team-Aufnahmen (15)                                       │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Meeting XYZ     user1@firma.de     vor 2h           │ │
│  │ Meeting ABC     user2@firma.de     vor 4h           │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## Risikobewertung

| Risiko | Bewertung | Mitigation |
|--------|-----------|------------|
| RLS-Komplexitaet | Mittel | Gruendliche Tests mit verschiedenen Usern |
| Performance | Niedrig | Index auf team_members.role |
| Berechtigungsluecken | Mittel | Edge Functions validieren Backend-seitig |
| UI-Komplexitaet | Mittel | Klare Trennung Team/Persoenlich |

