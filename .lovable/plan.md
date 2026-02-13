

## Favicon austauschen

### Aenderung

1. Das hochgeladene Bild `user-uploads://Risoniq_Logo_pos_icon.png` in das public-Verzeichnis kopieren als `public/favicon.png`
2. In `index.html` den bestehenden Favicon-Verweis durch einen Link auf die neue PNG-Datei ersetzen:
   - `<link rel="icon" href="/favicon.png" type="image/png">`

### Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `public/favicon.png` | Neue Datei (Kopie des Uploads) |
| `index.html` | Favicon-Link aktualisieren |

