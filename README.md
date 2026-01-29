# Trauorte Hamm - Interaktive Kirchenkarte

Eine interaktive Karte aller Trauorte im Evangelischen Kirchenkreis Hamm, optimiert für die Einbettung als iFrame in ChurchDesk oder andere Website-Baukästen.

## 🌐 Live-Demo

Nach dem Deployment ist die Karte verfügbar unter:
```
https://<ihr-github-username>.github.io/Trauortehamm/
```

## ✨ Features

- 🗺️ Interaktive Karte mit 22 Gottesdienstorten in der Region Hamm
- 📍 Violette Marker für alle Kirchen, grün beim Anklicken
- 🖼️ Kirchenfotos in grünen Info-Boxen
- 🌿 Hervorgehobener Hamm-Bereich (Kirchenkreis-Grenze)
- 📱 Vollständig responsive und mobil-optimiert
- 🔗 iFrame-ready für einfache Einbettung
- ⚡ Schnell und performant mit Leaflet.js und OpenStreetMap

## 📁 Projektstruktur

```
Trauortehamm/
├── docs/                           # GitHub Pages Publishing-Ordner
│   ├── index.html                  # Haupt-HTML-Datei
│   ├── style.css                   # Styling der Karte und Popups
│   ├── script.js                   # JavaScript-Logik und Marker-Verwaltung
│   ├── .nojekyll                   # Deaktiviert Jekyll-Verarbeitung
│   ├── data/
│   │   └── churches.json           # Kirchendaten (Name, Koordinaten, etc.)
│   └── images/
│       ├── placeholder.webp        # Platzhalter für fehlende Fotos
│       └── churches/               # Kirchenfotos
│           ├── christuskirche.jpg
│           ├── pauluskirche.jpg
│           └── ...
└── README.md                       # Diese Datei
```

## 🚀 GitHub Pages Setup

### 1. Repository erstellen
1. Erstelle ein neues GitHub Repository mit dem Namen `Trauortehamm`
2. Pushe diesen Code zum Repository:
```bash
git init
git add .
git commit -m "Initial commit: Kirchenkarte Hamm"
git branch -M main
git remote add origin https://github.com/<ihr-username>/Trauortehamm.git
git push -u origin main
```

### 2. GitHub Pages aktivieren
1. Gehe zu den Repository-Settings
2. Navigiere zu **Pages** im linken Menü
3. Unter **Source** wähle:
   - Branch: `main`
   - Folder: `/docs`
4. Klicke auf **Save**
5. Nach ~5-10 Minuten ist die Karte live unter `https://<ihr-username>.github.io/Trauortehamm/`

### 3. HTTPS aktivieren
In den Pages-Settings sollte **Enforce HTTPS** automatisch aktiviert sein. Falls nicht, aktiviere es manuell.

## 🖼️ Kirchenfotos hinzufügen

### Foto-Anforderungen
- **Format**: JPEG oder PNG
- **Maximale Breite**: 800px (größere Bilder werden automatisch skaliert)
- **Empfohlene Dateigröße**: < 200 KB pro Bild
- **Seitenverhältnis**: 16:9 oder 4:3 (wird automatisch auf 280x180px zugeschnitten)

### Fotos hochladen
1. Speichere Fotos im Ordner `docs/images/churches/`
2. Verwende aussagekräftige Dateinamen (z.B. `christuskirche.jpg`)
3. Aktualisiere den entsprechenden Eintrag in `docs/data/churches.json`

### Beispiel
Wenn du ein Foto `pauluskirche.jpg` hast:
1. Kopiere es nach `docs/images/churches/pauluskirche.jpg`
2. Die JSON-Datei sollte bereits den korrekten `photoName` enthalten:
```json
{
  "name": "Pauluskirche",
  "photoName": "pauluskirche.jpg",
  ...
}
```

### Platzhalter für fehlende Fotos
Falls ein Foto fehlt oder nicht geladen werden kann, wird automatisch `images/placeholder.webp` angezeigt. Du kannst dieses Platzhalter-Bild durch ein eigenes ersetzen.

## 📝 Kirchendaten aktualisieren

### JSON-Struktur

Die Kirchendaten befinden sich in `docs/data/churches.json` und folgen dieser Struktur:

```json
{
  "kirchenkreis": "Evangelischer Kirchenkreis Hamm",
  "gottesdienstorte": [
    {
      "name": "Christuskirche",
      "photoName": "christuskirche.jpg",
      "stadtteil": "Hamm-Westen / Lange Reihe",
      "address": {
        "street": "Friedrich-Ebert-Str. 5",
        "zipCode": "59063",
        "city": "Hamm"
      },
      "coordinates": {
        "lat": 51.6805,
        "lng": 7.8082
      },
      "besonderheiten": [
        "Wenig Parkplätze",
        "Kein Konfetti"
      ]
    }
  ]
}
```

### Felder-Beschreibung

| Feld | Typ | Pflicht | Beschreibung | Beispiel |
|------|-----|---------|--------------|----------|
| `name` | String | Ja | Name der Kirche/des Gottesdienstortes | `"Christuskirche"` |
| `photoName` | String | Nein | Dateiname des Fotos in `images/churches/` | `"christuskirche.jpg"` |
| `stadtteil` | String | Nein | Stadtteil/Ort (wird aktuell nicht angezeigt) | `"Hamm-Westen"` |
| `address.street` | String | Ja | Straße und Hausnummer | `"Friedrich-Ebert-Str. 5"` |
| `address.zipCode` | String | Ja | Postleitzahl | `"59063"` |
| `address.city` | String | Ja | Stadt | `"Hamm"` |
| `coordinates.lat` | Number | Ja | Breitengrad (Latitude) | `51.6805` |
| `coordinates.lng` | Number | Ja | Längengrad (Longitude) | `7.8082` |
| `besonderheiten` | Array | Nein | Liste von Besonderheiten (z.B. Parkplätze, Konfetti) | `["Wenig Parkplätze"]` |

### Neue Kirche hinzufügen

1. Öffne `docs/data/churches.json`
2. Füge einen neuen Eintrag im `gottesdienstorte`-Array hinzu:
```json
{
  "name": "Neue Kirche",
  "photoName": "neue_kirche.jpg",
  "address": {
    "street": "Musterstraße 123",
    "zipCode": "59063",
    "city": "Hamm"
  },
  "coordinates": {
    "lat": 51.6800,
    "lng": 7.8100
  },
  "besonderheiten": [
    "🅿️ Viele Parkplätze",
    "🎊 Konfetti erlaubt"
  ]
}
```
3. Speichere die Datei
4. Committe und pushe die Änderungen zu GitHub

**Hinweis**: Du kannst Emojis direkt in den `besonderheiten`-Texten verwenden!

### Koordinaten ermitteln

Es gibt mehrere Möglichkeiten, die Koordinaten (Latitude/Longitude) einer Adresse zu finden:

#### Methode 1: OpenStreetMap (Empfohlen, kostenlos)
1. Gehe zu [https://www.openstreetmap.org](https://www.openstreetmap.org)
2. Suche nach der Adresse der Kirche
3. Klicke auf den Standort
4. Die Koordinaten werden in der URL angezeigt: `#map=18/51.6805/7.8082`
5. Format: `lat=51.6805`, `lng=7.8082`

#### Methode 2: Google Maps
1. Gehe zu [https://maps.google.com](https://maps.google.com)
2. Suche nach der Adresse
3. Rechtsklick auf den Marker
4. Wähle "Was ist hier?"
5. Koordinaten werden unten angezeigt (z.B. `51.6805, 7.8082`)

#### Methode 3: Nominatim Geocoding-Service
Für mehrere Adressen auf einmal:
```bash
# Beispiel-Request
https://nominatim.openstreetmap.org/search?q=Friedrich-Ebert-Str.+5,+59063+Hamm&format=json
```

### Kirche entfernen
1. Öffne `docs/data/churches.json`
2. Lösche den entsprechenden Eintrag aus dem `gottesdienstorte`-Array
3. Entferne das zugehörige Foto aus `docs/images/churches/` (optional)
4. Speichere, committe und pushe die Änderungen

### Kirche bearbeiten
1. Öffne `docs/data/churches.json`
2. Finde den entsprechenden Eintrag
3. Aktualisiere die gewünschten Felder
4. Speichere, committe und pushe die Änderungen

## 🔗 iFrame-Einbindung

### Basis-Integration (ChurchDesk)

Füge diesen Code in deinen ChurchDesk Website-Baukasten ein:

```html
<iframe 
    src="https://<ihr-username>.github.io/Trauortehamm/" 
    width="100%" 
    height="600"
    style="border: 1px solid #ddd; border-radius: 8px;"
    allowfullscreen
    loading="lazy">
</iframe>
```

### Responsive iFrame (empfohlen)

Für bessere Mobile-Darstellung:

```html
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
    <iframe 
        src="https://<ihr-username>.github.io/Trauortehamm/" 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
        allowfullscreen
        loading="lazy">
    </iframe>
</div>
```

### iFrame-Parameter anpassen

| Parameter | Beschreibung | Empfehlung |
|-----------|--------------|------------|
| `width` | Breite des iFrames | `100%` oder `800px` |
| `height` | Höhe des iFrames | `600px` für Desktop |
| `style` | CSS-Styling | Border, Border-Radius für bessere Optik |
| `allowfullscreen` | Vollbild-Modus erlauben | Empfohlen |
| `loading="lazy"` | Verzögertes Laden | Empfohlen für Performance |

## 🛠️ Lokale Entwicklung

### Voraussetzungen
- Ein moderner Webbrowser
- Optonal: Ein lokaler Webserver (z.B. Python, Node.js, VS Code Live Server)

### Lokaler Test

**Option 1: Python HTTP Server**
```bash
cd docs
python -m http.server 8000
# Öffne http://localhost:8000 im Browser
```

**Option 2: Node.js http-server**
```bash
cd docs
npx http-server -p 8000
# Öffne http://localhost:8000 im Browser
```

**Option 3: VS Code Live Server**
1. Installiere die Extension "Live Server"
2. Rechtsklick auf `docs/index.html`
3. Wähle "Open with Live Server"

**Wichtig**: Öffne `index.html` nicht direkt per Doppelklick, da moderne Browser aus Sicherheitsgründen lokale JSON-Dateien blockieren. Verwende immer einen lokalen Webserver!

## 🔧 Technologie-Stack

- **Kartenbibliothek**: [Leaflet.js 1.9.4](https://leafletjs.com/)
- **Kartendaten**: [OpenStreetMap](https://www.openstreetmap.org/)
- **Tile Layer**: [CartoDB Positron](https://carto.com/basemaps/)
- **Hosting**: [GitHub Pages](https://pages.github.com/)
- **Keine Build-Tools**: Reine HTML/CSS/JavaScript-Lösung

## 📱 Browser-Unterstützung

- ✅ Chrome/Edge (aktuelle Version)
- ✅ Firefox (aktuelle Version)
- ✅ Safari (iOS 12+, macOS 10.14+)
- ✅ Mobile Browser (iOS Safari, Chrome Mobile)

## 🐛 Troubleshooting

### Karte lädt nicht
- Überprüfe die Browser-Konsole (F12) auf Fehlermeldungen
- Stelle sicher, dass `docs/data/churches.json` gültig ist ([JSON-Validator](https://jsonlint.com/))
- Prüfe, ob alle Dateipfade korrekt sind

### Fotos werden nicht angezeigt
- Überprüfe, ob die Dateinamen in `churches.json` mit den tatsächlichen Dateinamen übereinstimmen
- Achte auf Groß-/Kleinschreibung bei Dateinamen
- Stelle sicher, dass Fotos im Ordner `docs/images/churches/` liegen

### Marker an falscher Position
- Überprüfe die Koordinaten in `churches.json`
- Latitude (Breitengrad) sollte ~51.x für Hamm sein
- Longitude (Längengrad) sollte ~7.x für Hamm sein
- Vertausche nicht lat und lng!

### GitHub Pages zeigt 404
- Warte 5-10 Minuten nach dem ersten Push
- Überprüfe in den Repository-Settings, ob Pages aktiviert ist
- Stelle sicher, dass der `/docs` Ordner als Source-Folder ausgewählt ist

## 📄 Lizenz

Dieses Projekt ist für den Evangelischen Kirchenkreis Hamm erstellt. Die Kartendaten stammen von OpenStreetMap und unterliegen der [ODbL-Lizenz](https://www.openstreetmap.org/copyright).

## 🤝 Kontakt & Support

Bei Fragen oder Problemen:
1. Überprüfe die Troubleshooting-Sektion oben
2. Schaue in die GitHub Issues des Repositories
3. Kontaktiere den Administrator des Kirchenkreises

---

**Erstellt mit ❤️ für den Evangelischen Kirchenkreis Hamm**
