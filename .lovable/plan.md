

# Fix: Audio recording stops on tab switch

## Problem
In `MeetingNoteTaker.tsx`, both capture modes ("tab" and "mic") attach an `onended` handler to the audio track that immediately calls `stopRecording()`. When the user switches tabs or minimizes the browser, Chrome can fire transient `ended` events on media tracks -- especially on `getDisplayMedia` audio tracks -- which prematurely stops the recording.

## Root Cause
- **Lines 179-182 (tab mode):** `audioTracks[0].onended = () => stopRecording()` fires immediately on any track end event
- **Lines 201-204 (mic mode):** Same pattern -- no debounce, no validation
- No check whether the track is *actually* dead vs. a transient browser event during tab transitions

## Fix

**In `src/components/MeetingNoteTaker.tsx`**, debounce the `onended` handlers with a delay and verify the track's `readyState` before stopping:

```typescript
// Instead of immediate stopRecording(), debounce + verify
audioTracks[0].onended = () => {
  setTimeout(() => {
    // Only stop if track is genuinely ended and we're still recording
    if (audioTracks[0].readyState === 'ended' && !isStoppingRef.current) {
      console.log('Audio track confirmed ended, stopping recording');
      stopRecording();
    }
  }, 500);
};
```

Apply this pattern to both the **tab mode** (line ~179) and **mic mode** (line ~201) `onended` handlers.

This mirrors the existing debounce strategy already used in `QuickRecordingContext.tsx` (line 364-370) for display stream video tracks.

## Scope
- Single file change: `src/components/MeetingNoteTaker.tsx`
- Two handler modifications (tab + mic mode)

