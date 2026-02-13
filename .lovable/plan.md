

## TOM-Compliance-Pruefung: Ergebnisse und Handlungsbedarf

Ich habe das TOM-Dokument (v3.0) mit dem aktuellen Code der Anwendung abgeglichen. Hier die Ergebnisse:

---

### Status: KONFORM (bereits umgesetzt)

| TOM-Anforderung | Umsetzung im Code |
|---|---|
| **Passwortrichtlinien** (2.2) - Min. 8 Zeichen, Gross/Klein, Zahlen | `Auth.tsx` prueft alle Kriterien + Sonderzeichen (uebertrifft TOM) |
| **E-Mail-Verifizierung** (2.2) - Zwei-Faktor via E-Mail | Signup erfordert E-Mail-Bestaetigung, kein Auto-Confirm |
| **Passwort-Zuruecksetzen** | Vollstaendig implementiert mit Reset-Dialog |
| **RLS-Policies** (2.3) - Rollenbasierte Zugriffskontrolle | Supabase Linter zeigt keine Probleme, user_id-basierte Policies |
| **TLS 1.3 Verschluesselung** (2.4) | Automatisch durch Supabase/Vercel gewaehrleistet |
| **Rollenkonzept Notetaker** (1.2) | Admin, Teamlead, Projektgebunden, User - alle implementiert |
| **JWT-Token Autorisierung** (2.3) | Alle API-Calls nutzen Bearer Token Authentication |
| **Passwort-Staerke-Anzeige** | Visueller Indikator beim Signup (uebertrifft TOM) |

---

### Status: KRITISCH - Sofort umzusetzen

#### 1. Session-Timeout bei Inaktivitaet (Risiko 7 im TOM)

**TOM-Anforderung:** Session-Timeout nach 15 Minuten Inaktivitaet mit Re-Authentifizierung, Warnung 2 Minuten vorher, "Aktivitaet beibehalten"-Button.

**Aktueller Zustand:** Keine Session-Timeouts implementiert. Sessions bleiben aktiv bis zum manuellen Logout oder Token-Ablauf (24h). Der `useAuth` Hook hat keinerlei Inaktivitaets-Tracking.

**Umsetzung:**
- Neuen Hook `useSessionTimeout` erstellen
- Inaktivitaets-Timer (15 Min) mit Event-Listenern (mousemove, keydown, click)
- Warndialog 2 Minuten vor Ablauf
- "Sitzung verlaengern"-Button im Dialog
- Automatischer Logout bei Ablauf
- Integration in `AppLayout` (alle geschuetzten Seiten)

#### 2. Multi-Faktor-Authentifizierung (MFA) ueber Authenticator-App (Risiko 1 im TOM)

**TOM-Anforderung:** MFA ueber Authenticator-Apps (TOTP) nachrüsten.

**Aktueller Zustand:** Nur E-Mail-Verifizierung beim Signup. Kein TOTP/MFA implementiert.

**Umsetzung:**
- Supabase Auth MFA (TOTP) aktivieren
- MFA-Einrichtung in Settings-Seite integrieren (QR-Code Enrollment)
- MFA-Challenge beim Login einfuegen
- Optional: MFA als Pflicht fuer Admin-Accounts

---

### Status: HOCH - Binnen 3 Monaten

#### 3. Kontosperrung nach 5 Fehlversuchen (Risiko 1 im TOM)

**TOM-Anforderung:** Automatische Kontosperrung nach 5 fehlgeschlagenen Login-Versuchen innerhalb von 15 Minuten.

**Aktueller Zustand:** Login-Fehler werden dem User angezeigt, aber nicht gezaehlt. Keine Sperrlogik vorhanden.

**Umsetzung:**
- Datenbank-Tabelle `login_attempts` (user_email, timestamp, ip)
- Edge Function oder Database Function zum Zaehlen
- Sperrung fuer 15-30 Minuten nach 5 Fehlversuchen
- Entsperrung durch Admin oder Zeitablauf

#### 4. Verschluesselte Datenexporte (2.4)

**TOM-Anforderung:** Datenexporte als verschluesselte ZIP-Dateien mit Passwortschutz.

**Aktueller Zustand:** Transkript-Downloads erfolgen als unverschluesselte Textdateien (`RecordingDetailSheet.tsx` erstellt plain-text Blobs). Bulk-Export ebenfalls unverschluesselt.

---

### Status: MITTEL - Binnen 6 Monaten

#### 5. Audit-Logging fuer Benutzeraktionen (2.5)

**TOM-Anforderung:** Protokollierung von Login, Kampagnenerstellung, Datenexport, Berechtigungsaenderungen.

**Aktueller Zustand:** Supabase Auth Logs decken Login/Logout ab. Anwendungsseitige Aktionen (Datenexport, Projektaenderungen) werden nicht explizit protokolliert.

#### 6. Loeschbestaetigung nur durch Admins (2.5)

**TOM-Anforderung:** Nur Administratoren koennen Daten dauerhaft loeschen, mit Bestaetigungspflicht.

**Aktueller Zustand:** Soft-Delete ist implementiert (deleted_at Feld), aber die Bestaetigungsmechanismen sollten geprueft werden.

---

### Empfohlene Umsetzungsreihenfolge

| Prioritaet | Massnahme | Aufwand |
|---|---|---|
| 1 (KRITISCH) | Session-Timeout (15 Min Inaktivitaet) | Mittel - neuer Hook + Dialog |
| 2 (KRITISCH) | MFA ueber Authenticator-App | Hoch - Supabase MFA Config + UI |
| 3 (HOCH) | Kontosperrung nach Fehlversuchen | Mittel - DB-Tabelle + Logik |
| 4 (HOCH) | Verschluesselte Exports | Mittel - ZIP-Library + Passwort |
| 5 (MITTEL) | Erweitertes Audit-Logging | Niedrig - DB-Trigger |

---

### Technische Details

**Session-Timeout (Prioritaet 1):**

Betroffene Dateien:
- `src/hooks/useSessionTimeout.ts` (neu) - Inaktivitaets-Tracking
- `src/components/session/SessionTimeoutWarning.tsx` (neu) - Warndialog
- `src/components/layout/AppLayout.tsx` - Integration des Hooks

Logik:
1. Timer startet bei 15 Minuten, Reset bei User-Interaktion (mousemove, keydown, click, scroll)
2. Bei 13 Minuten: Warndialog mit Countdown und "Sitzung verlaengern"-Button
3. Bei 15 Minuten: `supabase.auth.signOut()` + Redirect zu `/auth`
4. Events werden gedrosselt (throttle 30s) um Performance nicht zu beeintraechtigen

**MFA (Prioritaet 2):**

Betroffene Dateien:
- `src/pages/Settings.tsx` - MFA-Enrollment Sektion
- `src/pages/Auth.tsx` - MFA-Challenge nach Login
- `src/hooks/useAuth.ts` - MFA-Verifizierungs-Flow

Voraussetzung: Supabase MFA muss in der Auth-Konfiguration aktiviert werden.

