

# Diagnose: Alexander Schoelch kann nicht auf den Notetaker zugreifen

## Ursache gefunden

Alexander ist Mitglied in **zwei Teams** (ECPD und Risoniq). Der Hook `useUserQuota` in `src/hooks/useUserQuota.ts` verwendet `.maybeSingle()` um die Team-Mitgliedschaft abzufragen (Zeile 91). Bei Nutzern mit mehreren Team-Mitgliedschaften wirft `.maybeSingle()` einen Fehler, da mehr als eine Zeile zurueckgegeben wird.

Dieser unbehandelte Fehler in `useUserQuota` crasht die Index-Seite (Dashboard), was die ErrorBoundary ausloest und die "Etwas ist schiefgelaufen"-Seite anzeigt.

## Technisches Detail

```text
useUserQuota → .maybeSingle() bei 2 Team-Zeilen → PostgREST Fehler
→ Unhandled in fetchQuota catch → quota bleibt null
→ ABER: der Fehler wird im supabase-js als unhandled rejection geworfen
→ React ErrorBoundary faengt den Crash
```

## Loesung

### 1. Fix `useUserQuota.ts` - `.maybeSingle()` durch `.limit(1).maybeSingle()` ersetzen
- Zeile 87-91: `.limit(1)` vor `.maybeSingle()` einfuegen, damit bei mehreren Team-Mitgliedschaften nur die erste zurueckgegeben wird
- Alternativ: Alle Teams laden und das erste verwenden

### 2. Domain-Check
- Die Auth-Logs zeigen erfolgreiche Logins von `notetaker2pro.com` -- die Domain funktioniert korrekt
- Alle API-Aufrufe von `notetaker2pro.com` geben Status 200 zurueck
- Keine Domain-Probleme erkennbar

