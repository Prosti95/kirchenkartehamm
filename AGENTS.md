# AGENTS.md — Kirchenkarte Projekthandbuch für KI-Assistenten

## Projektübersicht

Interaktive Kirchenkarte für den **Evangelischen Kirchenkreis Hamm**. Zeigt Gottesdienstorte auf einer Leaflet-Karte mit tropfenförmigen Bild-Pins. Das Admin-Tool ermöglicht Nicht-Technikern die Datenpflege ohne Git-Kenntnisse.

**Deployment:** GitHub Pages aus `docs/`-Ordner. CI validiert JSON-Daten und führt Playwright-Tests aus.

---

## Architektur

| Komponente | Datei | Beschreibung |
|---|---|---|
| Öffentliche Karte | `docs/index.html` + `script.js` + `style.css` | Leaflet-Map, read-only, einbettbar via iframe |
| Admin-Tool | `docs/admin.html` | Standalone Single-File-App (~2100 Zeilen), alle Funktionen in einer HTML-Datei |
| Kirchendaten | `docs/data/churches.json` | Array von Kirchen-Objekten (Name, Adresse, Koordinaten, Foto, etc.) |
| Label-Daten | `docs/data/labels.json` | Städte- und Stadtteil-Labels mit Koordinaten |
| Stadtgrenzen | `docs/data/*-boundary.geojson` | GeoJSON-Polygone für Hamm, Werne, Bönen, etc. |
| Kirchenbilder | `docs/images/churches/*.jpg` | ~36 Fotos, referenziert über `photoName` in churches.json |
| Tests | `tests/admin.spec.js`, `tests/map.spec.js` | Playwright E2E-Tests |
| CI | `.github/workflows/validate.yml` | JSON-Validierung + Playwright |

---

## Datenmodell

### Kirche
```json
{
  "name": "Pauluskirche",
  "stadtteil": "Hamm-Mitte",
  "address": { "street": "Marktplatz 16", "zipCode": "59065", "city": "Hamm" },
  "coordinates": { "lat": 51.6813, "lng": 7.8196 },
  "besonderheiten": ["Text 1", "Text 2"],
  "website": "https://...",
  "buchungsLink": "https://...",
  "photoName": "Pauluskirche Hamm.jpg"
}
```

### Labels
```json
{
  "cities": [{ "name": "HAMM", "coordinates": { "lat": 51.68, "lng": 7.82 }, "type": "city" }],
  "districts": [{ "name": "Herringen", "coordinates": { "lat": 51.68, "lng": 7.77 } }]
}
```

### Patch-Format (Änderungsdatei)
```json
{
  "type": "kirchenkarte-patch",
  "exported": "2026-03-27T10:00:00.000Z",
  "changes": [
    { "action": "added|modified|removed", "name": "Kirchenname", "church": { ... } }
  ]
}
```

---

## Globale Variablen (admin.html)

Alle mit `var` deklariert (nicht `let`), damit sie in Playwright via `page.evaluate()` erreichbar sind.

| Variable | Typ | Zweck |
|---|---|---|
| `churches` | Array | Aktuelle Kirchenliste (wird bearbeitet) |
| `baselineChurches` | Array/null | Snapshot nach GitHub-Laden (für Diff) |
| `labels` | Object | `{ cities: [], districts: [] }` |
| `baselineLabels` | Object/null | Snapshot nach GitHub-Laden |
| `selectedChurchIndex` | Number | Aktuell gewählte Kirche (-1 = keine) |
| `newImages` | Object | `{ "dateiname.jpg": Blob }` — hochgeladene Bilder |
| `adminMap` | Leaflet Map | Admin-Karteninstanz |
| `churchMarkers` | Array | Draggable Kirchen-Marker |
| `labelMarkers` | Array | Draggable Label-Marker |
| `pinMode` | Boolean | Pin-Modus (Klick auf Karte = neue Kirche) |
| `_cropState` | Object/null | Zustand der Bild-Zuschnitt-Vorschau (imgEl, scale, panX, panY, natW, natH, coverW, coverH) |
| `window._currentDiffs` | Array | Aktuell angezeigte Diff-Einträge (für Einzelrückgängig) |

---

## Wichtige Funktionen (admin.html)

### Daten laden & speichern
- `loadFromGitHub()` — Lädt churches.json + labels.json von GitHub CDN, setzt Baseline
- `autoSave()` — Speichert alles in localStorage
- `autoRestore()` — Stellt von localStorage wieder her
- `discardAllChanges()` — Reset auf Baseline, leert newImages

### Kirchen CRUD
- `renderChurchList()` — Baut Liste mit Status-Punkten (grün=neu, orange=geändert)
- `renderChurchDetail()` — Generiert Detailformular + Crop-Vorschau
- `updateChurch(path, value)` — Verschachteltes Update (z.B. `"address.street"`)
- `addChurch()` / `deleteChurch(index)` — Mit Bestätigungsdialog

### Bilder
- `handleImageFiles(files)` — Komprimiert async, speichert in newImages
- `compressImage(file)` — Canvas JPEG 1200px/85%, mit onerror-Fallback
- `showCropPreview()` — Tropfenförmige Vorschau zum Verschieben/Zoomen
- `saveCrop()` — Rendert sichtbaren Ausschnitt als 600×600 JPEG
- `downloadImagesZip()` — JSZip-Export aller neuen Bilder

### Diff & Export
- `updateDiff()` — Hybrid-Diff-Algorithmus (Key + Position), zeigt Änderungen
- `revertChange(diffIndex)` — Einzelne Änderung rückgängig machen
- `exportChanges()` — Erzeugt Patch-JSON mit Zeitstempel
- `importPatch(file)` — Liest Patch, zeigt Merge-UI
- `applyPatchItem(index)` / `applyAllPatchItems()` — Wendet Änderungen an

### Validierung
- `validate()` — Prüft alle Pflichtfelder, PLZ 5-stellig, Koordinaten im Raum Hamm (Lat 51.4–52.0, Lng 7.3–8.2), URLs mit https://

### Hilfsfunktionen
- `esc(str)` — XSS-sichere HTML-Escape-Funktion (div.textContent-Trick). **IMMER verwenden bei innerHTML!**
- `toast(msg, type)` — Slide-in-Benachrichtigung (success/error/info)

---

## Öffentliche Karte (script.js)

| Variable | Zweck |
|---|---|
| `map` | Leaflet-Karteninstanz |
| `currentActiveMarker` | Aktuell ausgewählter Marker |
| `markerGroup` | FeatureGroup aller Kirchen-Marker |

Alle drei mit `var` deklariert für Playwright-Zugriff.

### Tropfen-Popup (Teardrop)
```css
.teardrop-popup {
    width: 280px; height: 280px;
    border-radius: 50% 50% 50% 0;    /* Tropfenform */
    transform: rotate(-45deg);         /* Spitze nach unten */
    overflow: hidden;
    border: 6px solid #1e40af;
}
.teardrop-popup img {
    transform: rotate(45deg) scale(1.5); /* Gegenrotation + Füllung */
}
```

---

## Testinfrastruktur

### Ausführung
```bash
npm test              # Alle Tests (admin + map)
npm run test:headed   # Mit sichtbarem Browser
```

### Konfiguration (playwright.config.js)
- **timeout:** 60000ms
- **Browser:** Chromium headless
- **Admin-Tests:** Laden via `file:///` (kein Server nötig)
- **Map-Tests:** `http://localhost:4173` (webServer: `npx serve docs -l 4173`)

### Teststruktur
- `tests/admin.spec.js` — ~132 Tests: CRUD, Export, Import, Diff, Validierung, Bilder, Karte, Crop
- `tests/map.spec.js` — ~56 Tests: Karte laden, Labels, Pins, Info-Box, Popup
- `run-tests.js` — Helper: Fängt Playwright-Output in .txt-Datei ab

### Test-Helper
```javascript
// admin.spec.js
async function loadData(page) {
  await page.getByText('Aktuelle Daten laden').first().click();
  await page.locator('#church-list .list-item').first().waitFor({ timeout: 15000 });
}

// map.spec.js
async function waitForMap(page) {
  await page.waitForFunction(() => window.map && window.markerGroup, { timeout: 15000 });
}
```

---

## CI Pipeline (.github/workflows/validate.yml)

### validate Job
1. Python JSON-Syntax-Check (churches.json, labels.json)
2. ajv-cli Schema-Validierung
3. Python Bild-Referenz-Check (alle photoName → Datei existiert)

### playwright Job
1. Node.js + Dependencies installieren
2. Playwright-Browser installieren
3. `npx playwright test` ausführen

---

## Bekannte Gotchas & Fallstricke

### 1. Asynchrone Bildkomprimierung
`compressImage()` ist async (Canvas toBlob). Tests **müssen** auf `.image-card` im Grid warten, bevor `newImages` geprüft wird:
```javascript
// FALSCH:
await page.locator('#images-file-input').setInputFiles({...});
expect(await page.evaluate(() => Object.keys(newImages).length)).toBe(1); // Race Condition!

// RICHTIG:
await page.locator('#images-file-input').setInputFiles({...});
await expect(page.locator('#images-grid .image-card')).toHaveCount(1); // Warten!
expect(await page.evaluate(() => Object.keys(newImages).length)).toBe(1);
```

### 2. Buffer.alloc(N) in Tests sind keine gültigen Bilder
`Buffer.alloc(500)` erzeugt Null-Bytes — kein gültiges JPEG. Die `compressImage`-Funktion hat einen `onerror`-Fallback, der das Original-File zurückgibt. In Tests funktioniert dies, aber `img.onload` in `showCropPreview` feuert nie → Crop-Vorschau zeigt Platzhalter statt Bild.

### 3. Hybrid-Diff-Algorithmus
Kirchenvergleich nutzt **zwei Phasen**:
1. **Key-Match:** `name|city` als Schlüssel → erkennt Löschungen aus der Mitte korrekt
2. **Positions-Match:** Ungematchte Einträge werden positionsbasiert gepaart → erkennt Umbenennungen als Änderung (nicht als Löschung+Neuanlage)

Ohne Phase 2 würde eine Namensänderung als "Kirche gelöscht + neue Kirche hinzugefügt" erscheinen.

### 4. Teardrop-Drag braucht Koordinatenrotation
Der Crop-Container ist `-45°` rotiert → Mausbewegungen müssen um `+45°` zurückgedreht werden:
```javascript
const cos45 = Math.SQRT1_2;
const rdx = (dx - dy) * cos45;
const rdy = (dx + dy) * cos45;
```

### 5. Leaflet divIcon braucht `iconSize: null`
Ohne `iconSize: null` nutzt Leaflet die Standardgröße 12×12px. Stadt-Labels mit blauem Hintergrund werden dann abgeschnitten, unabhängig von der Textlänge.

### 6. Selektoren nach UI-Text-Änderungen
Der Workflow-Guide im Export-Tab enthält die gleichen Texte wie manche Buttons (z.B. "Kirchendaten herunterladen"). Tests müssen `getByRole('button', { name: /.../ })` statt `getByText()` verwenden, um Mehrdeutigkeiten zu vermeiden.

### 7. Photo-Dropdown ist case-sensitiv
`"Pauluskirche.webp"` ≠ `"pauluskirche.webp"`. Der Dropdown zeigt alle verfügbaren Dateinamen — manuelles Tippen vermeiden.

### 8. Komprimierung ändert Dateiendung
`compressImage()` benennt alle Dateien zu `.jpg` um (auch `.png`, `.webp`). Das wird in `handleChurchPhoto` automatisch in `c.photoName` übernommen.

---

## Workflow: Datenpflege

### Zuständige einer Kirche
1. admin.html öffnen → "Aktuelle Daten laden"
2. Kirche suchen, Daten bearbeiten
3. Tab "Speichern & Teilen" → "Meine Änderungen als Datei speichern"
4. Datei `aenderungen_DATUM.json` per E-Mail/OneDrive an Koordinatorin senden

### Koordinatorin
1. admin.html öffnen → "Aktuelle Daten laden"
2. Patch-Dateien in "Änderungen einpflegen" ziehen
3. Änderungen prüfen und übernehmen
4. "Kirchendaten herunterladen" + "Beschriftungen herunterladen"
5. JSON-Dateien auf GitHub in `docs/data/` hochladen
6. CI validiert und GitHub Pages deployed automatisch

---

## Entwicklungshinweise

### Neues Feld zu Kirchen hinzufügen
1. `addChurch()` — Default-Wert setzen
2. `renderChurchDetail()` — Formularfeld hinzufügen
3. `updateChurch()` — Verschachtelten Pfad unterstützen (falls nötig)
4. `validate()` — Validierungsregel hinzufügen (falls Pflichtfeld)
5. `updateDiff()` — In den Änderungs-Vergleich aufnehmen
6. `exportChanges()` / `applyPatchItemSilent()` — Patch-Format erweitern
7. `createPopupContent()` in script.js — Auf der Karte anzeigen (falls gewünscht)
8. Schema in `tools/schemas/` aktualisieren
9. Tests ergänzen

### Neue Tests schreiben
- Admin-Tests laden via `file:///` — kein Server nötig
- Map-Tests brauchen `http://localhost:4173` (webServer in playwright.config.js)
- Nach Bild-Upload immer auf `.image-card` warten (async Komprimierung)
- `loadData(page)` als Helper für GitHub-Daten-Laden verwenden
- `page.evaluate(() => ...)` für direkten Zugriff auf globale Variablen

### Code-Konventionen
- **XSS:** Jeder String aus `churches`/`labels`/`newImages` durch `esc()` laufen lassen
- **Globale Variablen:** `var` verwenden (nicht `let`), für Playwright-Zugriff
- **CSS in admin.html:** Inline `<style>` Block, keine externe CSS-Datei
- **Kein Build-System:** Vanilla JS, CDN-Libraries, kein Bundler/Transpiler
