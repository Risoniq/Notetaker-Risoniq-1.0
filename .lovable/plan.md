

# Admin Quota-Management & Dashboard-Sperrung bei erschöpftem Kontingent

## Übersicht

Die Admin-Seite hat bereits die Quota-Anzeige mit Fortschrittsbalken und Zahnrad zum Bearbeiten. Die Aufgabe ist nun:

1. **Korrekte `used_minutes`-Berechnung im Admin-Dashboard** - Nur fertige Recordings zählen
2. **Dashboard-Sperrung** - Bei erschöpftem Kontingent kann kein Bot mehr gesendet werden, aber vergangene Meetings bleiben verfügbar

---

## Änderungen

### 1. Admin-Dashboard: used_minutes nur aus "done"-Recordings

**Datei: `supabase/functions/admin-dashboard/index.ts`**

Aktuell wird `stats.duration` aus allen Recordings summiert. Die Berechnung soll nur "done"-Recordings berücksichtigen:

```typescript
// In der recordingsMap-Logik
if (recordings) {
  for (const rec of recordings) {
    if (!rec.user_id) continue;
    
    const existing = recordingsMap.get(rec.user_id) || { 
      count: 0, 
      duration: 0,  // Nur für done-Status
      words: 0, 
      lastActivity: null, 
      hasActiveBot: false 
    };
    
    // Nur fertige Recordings für Quota-Berechnung zählen
    if (rec.status === 'done') {
      existing.count += 1;
      existing.duration += rec.duration || 0;
      existing.words += rec.word_count || 0;
    }
    
    // lastActivity für alle Recordings tracken
    if (!existing.lastActivity || new Date(rec.created_at) > new Date(existing.lastActivity)) {
      existing.lastActivity = rec.created_at;
    }
    
    // Active Bot unabhängig vom Status
    if (activeBotStatuses.includes(rec.status)) {
      existing.hasActiveBot = true;
    }
    
    recordingsMap.set(rec.user_id, existing);
  }
}
```

### 2. Dashboard: Bot-Steuerung bei erschöpftem Kontingent sperren

**Datei: `src/pages/Index.tsx`**

Statt nur ein Modal anzuzeigen, soll die Bot-Steuerung deaktiviert werden und eine permanente Warnung angezeigt werden:

```tsx
{/* Quota Exhausted Warning Banner */}
{quota?.is_exhausted && (
  <Alert className="border-destructive bg-destructive/10">
    <AlertTriangle className="h-4 w-4 text-destructive" />
    <AlertDescription>
      <strong>Kontingent erschöpft:</strong> Du kannst keine weiteren Meetings aufnehmen. 
      Deine bisherigen Aufnahmen stehen weiterhin zur Analyse bereit.
    </AlertDescription>
  </Alert>
)}

{/* Bot-Steuerung - nur wenn Kontingent verfügbar */}
{!quota?.is_exhausted && (
  <GlassCard title="Bot zu Meeting senden">
    <QuickMeetingJoin onBotStarted={setActiveRecordingId} />
  </GlassCard>
)}
```

### 3. QuickMeetingJoin: Quota-Check integrieren

**Datei: `src/components/calendar/QuickMeetingJoin.tsx`**

Optional als zusätzliche Absicherung: Quota im Komponenten-State prüfen und Button deaktivieren:

```tsx
interface QuickMeetingJoinProps {
  onBotStarted?: (recordingId?: string) => void;
  disabled?: boolean;  // Neue Prop für Quota-Sperrung
}

// Im JSX:
<Button
  onClick={handleSendBot}
  disabled={isLoading || !meetingUrl.trim() || disabled}
>
```

### 4. QuotaExhaustedModal verbessern

**Datei: `src/components/quota/QuotaExhaustedModal.tsx`**

Klarere Meldung, dass vergangene Meetings weiterhin verfügbar sind:

```tsx
<DialogDescription className="text-center space-y-2">
  <p className="text-base">
    Vielen Dank für die Teilnahme an der Testversion!
  </p>
  <p className="text-sm">
    Dein Meeting-Kontingent ist aufgebraucht. Du kannst keine weiteren 
    Meetings aufnehmen, aber alle bisherigen Aufnahmen und Transkripte 
    stehen dir weiterhin zur Analyse bereit.
  </p>
  <p className="text-sm font-medium text-primary">
    Upgrade auf die Vollversion für unbegrenzte Meeting-Aufnahmen.
  </p>
</DialogDescription>
```

### 5. Backend-Absicherung (Optional aber empfohlen)

**Datei: `supabase/functions/create-bot/index.ts`**

Quota-Check auf Server-Seite, bevor ein Bot erstellt wird:

```typescript
// Quota prüfen bevor Bot erstellt wird
const { data: quotaData } = await supabaseAdmin
  .from('user_quotas')
  .select('max_minutes')
  .eq('user_id', user.id)
  .maybeSingle();

const maxMinutes = quotaData?.max_minutes ?? 120;

const { data: recordings } = await supabaseAdmin
  .from('recordings')
  .select('duration')
  .eq('user_id', user.id)
  .eq('status', 'done');

const usedSeconds = recordings?.reduce((sum, r) => sum + (r.duration || 0), 0) || 0;
const usedMinutes = Math.round(usedSeconds / 60);

if (usedMinutes >= maxMinutes) {
  return new Response(JSON.stringify({ 
    error: 'Quota exhausted',
    message: 'Dein Meeting-Kontingent ist erschöpft. Upgrade auf die Vollversion für unbegrenzte Meetings.'
  }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

---

## Zusammenfassung der Dateien

| Datei | Änderung |
|-------|----------|
| `supabase/functions/admin-dashboard/index.ts` | `used_minutes` nur aus "done"-Recordings berechnen |
| `src/pages/Index.tsx` | Warn-Banner + Bot-Steuerung ausblenden bei erschöpftem Kontingent |
| `src/components/quota/QuotaExhaustedModal.tsx` | Klarere Meldung mit Hinweis auf weiterhin verfügbare Inhalte |
| `supabase/functions/create-bot/index.ts` | Quota-Check auf Server-Seite (Absicherung) |
| (Optional) `src/components/calendar/QuickMeetingJoin.tsx` | `disabled` Prop hinzufügen |

---

## Erwartetes Ergebnis

1. **Admin-Dashboard:** Zeigt korrekte verbrauchte Minuten (nur abgeschlossene Meetings)
2. **Quota-Bearbeitung:** Weiterhin über Zahnrad im Admin-Dashboard möglich
3. **Erschöpftes Kontingent im Dashboard:**
   - Warn-Banner oben angezeigt
   - Bot-Steuerung ausgeblendet/deaktiviert
   - Bisherige Aufnahmen und Transkripte weiterhin zugänglich
4. **Server-seitige Absicherung:** Bot-Erstellung wird auch ohne Frontend-Check blockiert

