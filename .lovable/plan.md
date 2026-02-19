
# Recall.ai Gallery View: Alle Teilnehmer gleichzeitig aufnehmen

## Problem
Aktuell nimmt der Recall.ai-Bot nur die jeweils sprechende Person auf (Standard-Layout "active speaker"). Bildschirmfreigaben werden zwar aufgenommen, aber immer nur ein Video-Feed gleichzeitig.

## Loesung
Recall.ai bietet das Layout `gallery_view_v2`, das alle Teilnehmer gleichzeitig in einer Galerie-Ansicht aufnimmt -- inklusive Bildschirmfreigaben. Dies wird ueber den Parameter `video_mixed_layout` in der `recording_config` konfiguriert.

## Aenderung

**Datei:** `supabase/functions/create-bot/index.ts`

In der Bot-Konfiguration (Zeile 406-431) wird `recording_config` um das Gallery-Layout erweitert:

```ts
recording_config: {
  video_mixed_layout: "gallery_view_v2",  // NEU: Alle Teilnehmer gleichzeitig
  video_mixed_mp4: {},                     // NEU: Sicherstellen dass Mixed-Video erzeugt wird
  transcript: {
    provider: {
      recallai_streaming: {
        mode: "prioritize_accuracy",
        language_code: "auto"
      }
    }
  },
  meeting_metadata: {}
}
```

### Was sich aendert
- `video_mixed_layout: "gallery_view_v2"` -- zeigt alle Teilnehmer in einer Kachelansicht (wie die Galerieansicht in Zoom/Teams/Meet)
- `video_mixed_mp4: {}` -- stellt sicher, dass das gemischte Video als MP4 verfuegbar ist
- Bildschirmfreigaben werden automatisch mit eingeblendet, wenn ein Teilnehmer seinen Bildschirm teilt

### Was gleich bleibt
- Transkription, Speaker Timeline, Auto-Leave, Avatar, Quota-Check -- alles unveraendert
- Die `sync-recording`-Logik muss nicht angepasst werden, da sie bereits `video_mixed` aus den `media_shortcuts` liest

## Betroffene Datei

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/create-bot/index.ts` | `recording_config` um `video_mixed_layout` und `video_mixed_mp4` erweitern |
