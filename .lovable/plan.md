
# Plan: MeetingDetail-Seite für Impersonation anpassen

## Problem

Wenn ein Admin die "Ansicht anzeigen"-Funktion nutzt und ein Meeting eines anderen Benutzers öffnet, erscheint "Synchronisierung fehlgeschlagen", weil:

1. `fetchRecording()` macht eine direkte Supabase-Abfrage
2. Die RLS-Policies blockieren den Zugriff, da der Admin nicht der Eigentümer ist
3. Obwohl die `sync-recording` Edge Function Admin-Zugriff erlaubt, scheitert bereits das initiale Laden des Recordings

## Lösung

### Schritt 1: admin-view-user-data erweitern

Datei: `supabase/functions/admin-view-user-data/index.ts`

Neuen `data_type: 'single_recording'` hinzufügen, der ein einzelnes Recording per ID abruft:

```typescript
case 'single_recording': {
  const { recording_id } = await req.json();
  const { data: recording, error } = await supabaseAdmin
    .from('recordings')
    .select('*')
    .eq('id', recording_id)
    .eq('user_id', target_user_id)
    .maybeSingle();

  if (error) throw error;
  responseData = { recording };
  break;
}
```

### Schritt 2: MeetingDetail.tsx Impersonation-Support

Datei: `src/pages/MeetingDetail.tsx`

Änderungen:
- `useImpersonation` Hook importieren und nutzen
- `fetchRecording()` anpassen:
  - Im Impersonation-Modus: `admin-view-user-data` Edge Function mit `data_type: 'single_recording'` aufrufen
  - Sonst: bestehende direkte Supabase-Abfrage beibehalten
- Impersonation-Banner bereits oben anzeigen (bereits in AppLayout)

## Betroffene Dateien

| Datei | Aktion |
|-------|--------|
| `supabase/functions/admin-view-user-data/index.ts` | `single_recording` case hinzufügen |
| `src/pages/MeetingDetail.tsx` | Impersonation-Support in `fetchRecording()` |

## Technische Details

### fetchRecording() Anpassung

```typescript
const fetchRecording = useCallback(async () => {
  if (!id) return null;
  
  try {
    // Wenn Admin impersoniert, Edge Function nutzen
    if (isAdmin && isImpersonating && impersonatedUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase.functions.invoke('admin-view-user-data', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          target_user_id: impersonatedUserId, 
          data_type: 'single_recording',
          recording_id: id 
        },
      });

      if (error) throw error;
      return data?.recording as Recording | null;
    }

    // Normale Abfrage für eigene Recordings
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as Recording | null;
  } catch (error) {
    console.error('Error fetching recording:', error);
    return null;
  }
}, [id, isAdmin, isImpersonating, impersonatedUserId]);
```

### Edge Function Request-Format

Die Edge Function erwartet für `single_recording`:
```json
{
  "target_user_id": "uuid-des-benutzers",
  "data_type": "single_recording",
  "recording_id": "uuid-des-recordings"
}
```

Die Validierung prüft, dass das Recording dem `target_user_id` gehört, um sicherzustellen, dass der Admin nur Recordings des impersonierten Benutzers abrufen kann.

## Sicherheit

- Admin-Berechtigung wird in der Edge Function geprüft
- Das Recording muss dem `target_user_id` gehören
- Keine Möglichkeit, beliebige Recordings abzurufen

## Nach der Implementierung

1. Als Admin einloggen
2. Im Admin Dashboard "Ansicht anzeigen" für einen Benutzer klicken
3. Ein Meeting des Benutzers öffnen
4. Das Meeting sollte korrekt laden und die Synchronisierung funktionieren
