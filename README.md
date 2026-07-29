# simplersvp

Minimalistische RSVP-Speedreading-WebApp (GitHub-Pages- und Offline-fähig).

## Start

Da die App einen Service Worker nutzt, sollte sie über einen lokalen Server geöffnet werden:

```bash
python3 -m http.server 8080
```

Dann im Browser öffnen:

- http://localhost:8080

## Funktionen

- Ein-Wort-RSVP-Anzeige im Zentrum
- Einstellbare Geschwindigkeit (200–1000 WPM)
- Start/Stop per Tap auf die Wortanzeige
- Text laden via:
  - Direkt-Eingabe (Textarea)
  - `.txt`/`.md` Datei-Auswahl
  - Drag & Drop von `.txt`/`.md`
- Offline-Fähigkeit via Service Worker
- Responsive Dark-Mode UI
