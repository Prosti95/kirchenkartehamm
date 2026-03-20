# Anleitung: Kirchenkarte verwalten

## Übersicht

Mit dem **Admin-Tool** (`admin.html`) können Sie die Kirchendaten und Labels der Kirchenkarte bearbeiten, ohne JSON-Dateien direkt anfassen zu müssen. Das Tool läuft komplett im Browser — keine Installation nötig.

---

## 1. Admin-Tool öffnen

- Navigieren Sie zum Ordner `tools/` im Projekt
- **Doppelklick** auf `admin.html`
- Die Seite öffnet sich im Browser

---

## 2. Daten laden

### Option A: Von GitHub laden (empfohlen)
- Klicken Sie oben rechts auf **"📥 Von GitHub laden"**
- Die aktuellen Kirchendaten und Labels werden automatisch geladen

### Option B: Lokale Datei laden
- Ziehen Sie eine `churches.json` oder `labels.json` in den markierten Bereich
- Oder klicken Sie auf den Bereich um eine Datei auszuwählen

---

## 3. Kirchen bearbeiten

### Bestehende Kirche bearbeiten
1. Wechseln Sie zum Tab **"Kirchen"**
2. Klicken Sie auf eine Kirche in der Liste links
3. Bearbeiten Sie die Felder im Formular rechts
4. Änderungen werden sofort übernommen

### Neue Kirche hinzufügen
1. Klicken Sie auf **"+ Neue Kirche"** oben in der Liste
2. Füllen Sie mindestens die Pflichtfelder aus (mit * markiert):
   - Name
   - Straße + Nr.
   - PLZ (5 Ziffern)
   - Stadt
   - Koordinaten (Lat/Lng)

### Koordinaten finden
- **Automatisch:** Tragen Sie die Adresse ein und klicken Sie **"🔍 Koordinaten aus Adresse suchen"**
- **Manuell:** Klicken Sie **"🌐 Nominatim öffnen"** und suchen Sie dort
- **Per Karte:** Wechseln Sie zum Tab "Karte", klicken Sie "📌 Neuen Pin setzen" und klicken Sie auf die gewünschte Stelle

### Kirche auf der Karte verschieben
1. Wechseln Sie zum Tab **"Karte"**
2. **Ziehen** Sie einen Pin an die neue Position
3. Die Koordinaten werden automatisch aktualisiert

### Kirche löschen
- Öffnen Sie die Kirche und klicken Sie **"🗑 Löschen"**

---

## 4. Labels bearbeiten

1. Wechseln Sie zum Tab **"Labels"**
2. Bearbeiten Sie **Städte** (links) und **Stadtteile** (rechts)
3. Stadt-Namen werden automatisch in GROSSBUCHSTABEN umgewandelt

---

## 5. Bilder hinzufügen

1. Wechseln Sie zum Tab **"Bilder"**
2. Ziehen Sie Bilder in den markierten Bereich
3. **Empfehlungen:**
   - Format: JPEG oder PNG
   - Maximale Breite: 800px
   - Dateigröße: unter 200 KB (Warnung bei größeren Dateien)
4. Wechseln Sie zurück zum Kirchen-Tab und wählen Sie das Bild im Dropdown "Foto" aus

---

## 6. Änderungen prüfen und exportieren

1. Wechseln Sie zum Tab **"Export"**
2. **Validierung:** Fehlerhafte Einträge werden oben rot angezeigt
3. **Änderungsübersicht:** Zeigt alle Änderungen im Vergleich zur geladenen Version
   - 🟢 Grün = Neu hinzugefügt
   - 🟡 Gelb = Geändert
   - 🔴 Rot = Gelöscht
4. Laden Sie die Dateien herunter:
   - **"📥 churches.json"** — Kirchendaten
   - **"📥 labels.json"** — Labels
   - **"📥 Neue Bilder (ZIP)"** — Nur neue Bilder (falls vorhanden)

---

## 7. Auf GitHub hochladen

### JSON-Dateien hochladen
1. Öffnen Sie https://github.com/Prosti95/kirchenkartehamm im Browser
2. Navigieren Sie zu `docs/data/`
3. Klicken Sie auf **"Add file"** → **"Upload files"**
4. Ziehen Sie die heruntergeladene `churches.json` und/oder `labels.json` hinein
5. Schreiben Sie eine kurze Beschreibung (z.B. "Neue Kirche hinzugefügt")
6. Klicken Sie **"Commit changes"**

### Bilder hochladen
1. Navigieren Sie zu `docs/images/churches/`
2. Klicken Sie auf **"Add file"** → **"Upload files"**
3. Entpacken Sie die heruntergeladene `kirchenbilder.zip` und ziehen Sie die Bilder hinein
4. Klicken Sie **"Commit changes"**

### Automatische Prüfung
- Nach dem Hochladen läuft automatisch eine **Validierung** (GitHub Actions)
- Unter dem Tab **"Actions"** sehen Sie den Status:
  - ✅ Grüner Haken = Alles in Ordnung, Seite wird aktualisiert
  - ❌ Rotes X = Fehler in den Daten — bitte prüfen und korrigieren

---

## Häufige Fragen

**Kann ich etwas kaputt machen?**
Nein. GitHub speichert alle Versionen. Falls etwas schiefgeht, kann jede Änderung rückgängig gemacht werden.

**Was passiert bei ungültigen Daten?**
Die automatische Prüfung (GitHub Actions) blockiert die Aktualisierung der Webseite. Die alte Version bleibt online.

**Wo finde ich die Koordinaten einer Adresse?**
Am einfachsten über den "Koordinaten suchen"-Button im Admin-Tool. Alternativ über Google Maps (Rechtsklick → Koordinaten kopieren).

**Welche Bildformate werden unterstützt?**
JPEG (.jpg) und PNG (.png). WebP (.webp) funktioniert ebenfalls.
