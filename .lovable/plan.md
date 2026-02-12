

## Fix: Endlosschleife in RLS-Policies (Kritisch)

### Problem

Die letzte Migration hat eine zirkulaere Abhaengigkeit zwischen den RLS-Policies von `projects` und `project_members` erstellt:

- `project_members` SELECT-Policy prueft `EXISTS (... FROM projects ...)`
- `projects` SELECT-Policy prueft `EXISTS (... FROM project_members ...)`

PostgreSQL erkennt diese Endlosschleife und blockiert alle Queries, die diese Tabellen beruehren - inklusive der gesamten Recordings-Seite.

### Loesung

Die `project_members` SELECT-Policy darf NICHT auf `projects` verweisen, da `projects` bereits auf `project_members` verweist. Stattdessen speichern wir die Pruefung "ist der User Project-Owner?" direkt ueber die `project_id` und `invited_by` Spalten, ohne die `projects`-Tabelle zu konsultieren.

### Datenbank-Migration

1. **`project_members` SELECT-Policy ersetzen**: Statt `EXISTS (SELECT FROM projects)` nur `auth.uid() = user_id OR auth.uid() = invited_by` verwenden - der `invited_by` ist immer der Owner, da die INSERT-Policy das bereits sicherstellt.

2. **`project_members` INSERT-Policy anpassen**: Die Owner-Pruefung ueber `projects` ist hier unproblematisch, da INSERT auf `project_members` nicht rekursiv SELECT auf `projects` triggert. Diese bleibt bestehen.

3. **`project_members` DELETE-Policy anpassen**: Gleiche Logik - `auth.uid() = user_id OR auth.uid() = invited_by` statt `EXISTS (SELECT FROM projects)`.

### Betroffene Policies (Drop + Recreate)

| Policy | Tabelle | Aenderung |
|--------|---------|-----------|
| "Users can view project memberships" | project_members | Entferne projects-Subquery, nutze nur user_id/invited_by |
| "Owners and members can remove memberships" | project_members | Entferne projects-Subquery, nutze nur user_id/invited_by |

### Technische Details

Die Rekursionskette war:
```text
recordings SELECT
  -> project_recordings SELECT (via RLS)
    -> project_members SELECT (via RLS)
      -> projects SELECT (via RLS)
        -> project_members SELECT (via RLS)  <-- ENDLOSSCHLEIFE
```

Nach dem Fix:
```text
recordings SELECT
  -> project_recordings SELECT (via RLS)
    -> project_members SELECT (via RLS, prueft nur user_id/invited_by)
      -> KEIN weiterer Tabellenzugriff -> OK
```

### Dateien

| Datei | Aenderung |
|-------|-----------|
| Neue Migration SQL | Drop + Recreate der zwei project_members Policies |

Keine Frontend-Aenderungen noetig - sobald die Policies repariert sind, funktioniert alles wieder.

