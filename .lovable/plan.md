
## Ziel
Die automatische Analyse (Key Points + To‑Dos) soll nach der ElevenLabs-Transkription zuverlässig laufen. Aktuell passiert das nicht, weil die Backend‑Funktion `analyze-transcript` in deiner Cloud-Umgebung **nicht erreichbar/deployed** ist (HTTP 404 NOT_FOUND).

## Was ich bereits sicher festgestellt habe (harte Ursache)
- `transcribe-audio` speichert die ElevenLabs-Transkription bereits korrekt in der Datenbank (`recordings.transcript_text`) und setzt `status: 'done'`.
- Danach versucht `transcribe-audio` automatisch die Analyse zu triggern:
  - Request an: `${SUPABASE_URL}/functions/v1/analyze-transcript`
  - Ergebnis in den Logs: **{"code":"NOT_FOUND","message":"Requested function was not found"}**
- Ein direkter Aufruf von `/analyze-transcript` liefert ebenfalls **404 NOT_FOUND**.
→ Das ist kein Prompt-/Parsing-Problem, sondern: **Die Funktion ist in der Umgebung nicht bereitgestellt** (oder wurde nie erfolgreich deployed).

## Umsetzungsschritte (Fix)
### 1) `analyze-transcript` in der Cloud bereitstellen (Deployment)
- Backend-Funktion `analyze-transcript` gezielt deployen.
- Danach sofort per einfachem Request verifizieren, dass sie nicht mehr 404 zurückgibt (mindestens 401/405 wäre schon ein gutes Zeichen, 404 muss weg sein).

### 2) End-to-End Test über den echten Upload-Flow
- Im UI eine Audiodatei erneut hochladen (derselbe Weg wie bisher).
- Erwartung:
  1. `transcribe-audio` läuft durch, speichert `recordings.transcript_text`, setzt Status auf `done`
  2. Danach erfolgreicher Trigger: `AI analysis triggered successfully`
  3. `analyze-transcript` schreibt `summary`, `key_points`, `action_items` in `recordings`

### 3) Fehlerrobustheit verbessern (damit es “nicht wieder still” scheitert)
Auch wenn der aktuelle Blocker das Deployment ist, empfehle ich im gleichen Zug zwei Verbesserungen, weil “Analyse funktioniert nicht” häufig sonst erneut durchschlägt:

**3.1 Robustere JSON-Extraktion in `analyze-transcript`**
- Der Code macht aktuell ein sehr striktes `JSON.parse()` nach einfachem Entfernen von ```json```-Blöcken.
- Verbesserung: JSON sauber aus Mixed-Text extrahieren (Objekt-Grenzen `{...}` finden), typische Fehler reparieren (Trailing Commas / Control Chars). Das reduziert Ausfälle bei langen/ungewöhnlichen Transkripten.

**3.2 Besseres Logging + Fehler-Rückgabe**
- Wenn AI-Gateway 402/429 oder JSON-Parse fehlschlägt, sollte die Funktion eine klare Fehlermeldung zurückgeben.
- Optional: in der Datenbank ein Feld/Status setzen (z.B. `analysis_status: error`) – nur falls ihr so etwas bereits nutzt oder wollt.

### 4) (Optional) Konsistenz in Modellwahl
- In `analyze-transcript` wird aktuell `google/gemini-2.5-flash` genutzt.
- Standard (laut Lovable AI Guidance) wäre `google/gemini-3-flash-preview`.
- Nicht zwingend für den Fix, aber sinnvoll für bessere Stabilität/Qualität.

## Akzeptanzkriterien (woran wir “es geht” erkennen)
- Ein Upload erzeugt eine Recording-Zeile mit:
  - `transcript_text` gefüllt
  - `summary`, `key_points`, `action_items` innerhalb kurzer Zeit gefüllt (oder nach “Analyse neu starten” Button)
- Keine 404 NOT_FOUND mehr bei `analyze-transcript`
- In `transcribe-audio` Logs steht nach Upload: “AI analysis triggered successfully”
- In `analyze-transcript` Logs sieht man: Auth ok → Transcript length → AI Response received → Analysis saved successfully

## Risiken / Edge Cases
- Wenn `analyze-transcript` nach Deployment zwar erreichbar ist, aber dann 401/403 wirft:
  - Dann ist es ein Auth-Header/Token-Thema (Service Role vs User Token). Das prüfen wir anhand der neuen Logs.
- Wenn Analyse speichert, aber UI zeigt nichts:
  - Dann ist es ein Frontend-Refresh/Caching-Thema (React Query Invalidation). Würden wir dann im zweiten Schritt angehen.

## Konkrete Änderungen, die ich nach deiner Freigabe umsetze
1. Backend: `analyze-transcript` deployen (und ggf. einmal `transcribe-audio` mitdeployen).
2. Backend: `analyze-transcript` JSON-Parsing robuster machen (Extraktion + Reparatur).
3. Backend: Logging/Fehlertexte klarer machen, damit man in Zukunft sofort sieht, warum Analyse scheitert.
4. Test: Upload erneut ausführen und prüfen, ob Key Points / To‑Dos im Recording auftauchen.

