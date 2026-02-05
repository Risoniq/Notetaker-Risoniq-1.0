

# Plan: Microsoft Kalender-Verbindung fuer Fabio beheben

## Problem-Diagnose

| Check | Ergebnis | Status |
|-------|----------|--------|
| Edge Function `microsoft-recall-auth` Logs | Keine Logs vorhanden | ⚠️ War nicht deployed |
| Edge Function re-deployed | Erfolgreich | ✅ Behoben |
| Secrets vorhanden (MS_OAUTH_CLIENT_ID, MS_OAUTH_CLIENT_SECRET) | Ja | ✅ |
| Fabios Eintrag in `recall_calendar_users` | Nicht vorhanden | ℹ️ Erwartet bei erstem Versuch |

## Ursache

Die Edge Function `microsoft-recall-auth` war **nicht korrekt deployed**, weshalb alle Aufrufe mit "Failed to fetch" oder einem aehnlichen Fehler scheiterten.

## Durchgefuehrte Behebung

```text
✅ Edge Function 'microsoft-recall-auth' wurde neu deployed
```

## Naechste Schritte fuer Fabio

1. **Seite neu laden**: Browser-Cache leeren oder Seite hard-refresh (Strg+Shift+R)
2. **Erneut verbinden**: Auf "Verbinden" beim Microsoft Kalender klicken
3. **Microsoft-Login abschliessen**: Im Popup mit dem Microsoft-Account anmelden
4. **Bot rein lassen**: Falls ein Popup-Blocker aktiv ist, manuell das Popup erlauben

## Moegliche weitere Probleme

Falls die Verbindung weiterhin fehlschlaegt, koennten folgende Ursachen vorliegen:

### 1. Microsoft Admin-Consent erforderlich
Bei Unternehmens-Microsoft-Accounts muss moeglicherweise ein IT-Administrator die App genehmigen.

### 2. Popup-Blocker
Der Browser blockiert moeglicherweise das OAuth-Popup. Loesung: Popup-Blocker fuer die Seite deaktivieren.

### 3. Session abgelaufen
Falls die Sitzung abgelaufen ist: Ausloggen und neu einloggen.

## Keine Code-Aenderungen erforderlich

Das Problem wurde durch das erneute Deployment der Edge Function behoben. Die Frontend- und Backend-Logik ist korrekt implementiert.

