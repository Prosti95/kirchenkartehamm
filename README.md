# Trauorte Hamm – Interaktive Kirchenkarte

Eine interaktive Karte aller Trauorte im Evangelischen Kirchenkreis Hamm.

## 🌐 Links

- **Karte:** https://prosti95.github.io/kirchenkartehamm/
- **Admin-Tool:** https://prosti95.github.io/kirchenkartehamm/admin.html

## ✨ Features

- 🗺️ Interaktive Karte aller Trauorte im Kirchenkreis Hamm
- 📍 Pins für jeden Gottesdienstort mit Foto und Infos
- 📱 Optimiert für Handy, Tablet und Desktop
- 🛠️ Admin-Tool zum einfachen Bearbeiten der Kirchendaten
- 📤 Änderungen per E-Mail/OneDrive austauschen und zusammenführen
- 🔄 Automatische Datenprüfung vor dem Speichern

## 📁 Projektstruktur

```
kirchenkartehamm/
├── docs/                           # Öffentliche Webseite
│   ├── index.html                  # Karte (Startseite)
│   ├── admin.html                  # Admin-Tool zum Bearbeiten
│   ├── style.css                   # Design
│   ├── script.js                   # Karten-Logik
│   ├── data/
│   │   ├── churches.json           # Kirchendaten
│   │   └── labels.json             # Beschriftungen auf der Karte
│   └── images/
│       └── churches/               # Kirchenfotos
├── tests/                          # Automatische Tests
└── README.md                       # Diese Datei
```

## 📋 Ablauf: Kirchendaten aktualisieren

### Für Zuständige einer Kirche

1. **Admin-Tool öffnen:** Rufen Sie die Admin-Seite im Browser auf
2. **Daten laden:** Klicken Sie oben auf **„Aktuelle Daten laden"**
3. **Kirche bearbeiten:** Im Tab **„Kirchen"** Ihre Kirche suchen und die Daten anpassen (Adresse, Besonderheiten, Foto usw.)
4. **Änderungen speichern:** Wechseln Sie zum Tab **„Speichern & Teilen"** und klicken Sie auf **„Meine Änderungen als Datei speichern"**
5. **Datei senden:** Senden Sie die heruntergeladene Datei per **E-Mail oder OneDrive** an die Koordinatorin

### Für die Koordinatorin

1. **Admin-Tool öffnen:** Rufen Sie die Admin-Seite im Browser auf
2. **Daten laden:** Klicken Sie oben auf **„Aktuelle Daten laden"**
3. **Änderungen einpflegen:** Im Tab **„Speichern & Teilen"** unter **„Änderungen von Kolleg:innen einpflegen"** die erhaltenen Dateien laden und die Änderungen einzeln oder alle auf einmal übernehmen
4. **Fertige Dateien herunterladen:** Klicken Sie auf **„Kirchendaten herunterladen"** (und ggf. **„Beschriftungen herunterladen"**)
5. **Bei GitHub hochladen:** Laden Sie die heruntergeladenen Dateien im GitHub-Repository hoch (Ordner `docs/data/`)

> **Tipp:** Das Admin-Tool speichert Ihren Zwischenstand automatisch im Browser. Wenn Sie die Seite versehentlich schließen, sind Ihre Änderungen beim nächsten Öffnen noch da.

## 🚀 Ersteinrichtung (nur einmalig nötig)

Die Karte wird über GitHub Pages gehostet. Einmalige Einrichtung:

1. Repository bei GitHub erstellen
2. In den Repository-Settings unter **Pages** den Branch `main` und Ordner `/docs` auswählen
3. Nach wenigen Minuten ist die Karte unter der GitHub Pages-URL erreichbar

## 🖼️ Kirchenfotos

### Foto-Anforderungen
- **Format:** JPEG oder PNG
- **Empfohlene Dateigröße:** unter 200 KB pro Bild
- **Seitenverhältnis:** 16:9 oder 4:3 (wird automatisch zugeschnitten)

### Foto hochladen
Im Admin-Tool können Sie Fotos direkt bei der jeweiligen Kirche hochladen. Das Bild wird beim Export automatisch mit in die Datei aufgenommen.

Falls ein Foto fehlt, wird automatisch ein Platzhalter-Bild angezeigt.

## 📝 Felder pro Kirche

| Feld | Pflicht | Beschreibung | Beispiel |
|------|---------|--------------|----------|
| Name | Ja | Name der Kirche | Christuskirche |
| Straße + Nr. | Ja | Adresse | Friedrich-Ebert-Str. 5 |
| PLZ | Ja | Postleitzahl (5-stellig) | 59063 |
| Stadt | Ja | Stadt | Hamm |
| Koordinaten | Ja | Position auf der Karte (wird automatisch aus Adresse ermittelt) | – |
| Stadtteil | Nein | Stadtteil oder Ortsteil | Hamm-Westen |
| Besonderheiten | Nein | z. B. Parkplätze, Konfetti-Regeln | Wenig Parkplätze |
| Website | Nein | Link zur Kirchenseite | https://... |
| Buchungslink | Nein | Link zum Buchungskalender | https://... |
| Foto | Nein | Bild der Kirche | christuskirche.jpg |

## 🔗 Karte in eine Webseite einbetten

Die Karte kann z. B. in ChurchDesk oder andere Website-Baukästen eingebunden werden:

```html
<iframe 
    src="https://prosti95.github.io/kirchenkartehamm/" 
    width="100%" 
    height="600"
    style="border: 1px solid #ddd; border-radius: 8px;"
    allowfullscreen
    loading="lazy">
</iframe>
```

##  Häufige Fragen

### Die Karte zeigt keine Kirchen an
- Prüfen Sie, ob die Datei `docs/data/churches.json` korrekt ist (im Admin-Tool laden und schauen, ob Kirchen angezeigt werden)

### Ein Foto wird nicht angezeigt
- Prüfen Sie, ob der Dateiname im Admin-Tool korrekt eingetragen ist
- Achten Sie auf Groß-/Kleinschreibung
- Das Foto muss im Ordner `docs/images/churches/` liegen

### Die Kirche ist an der falschen Stelle auf der Karte
- Im Admin-Tool die Kirche öffnen und auf **„Adresse auf Karte finden"** klicken
- Alternativ: Im Tab **„Karte"** den Pin an die richtige Stelle ziehen

## 📄 Lizenz

Dieses Projekt ist für den Evangelischen Kirchenkreis Hamm erstellt. Die Kartendaten stammen von OpenStreetMap und unterliegen der [ODbL-Lizenz](https://www.openstreetmap.org/copyright).

## 🤝 Kontakt & Support

Bei Fragen oder Problemen wenden Sie sich an die Koordinatorin oder den Administrator des Kirchenkreises.

---

**Erstellt mit ❤️ für den Evangelischen Kirchenkreis Hamm**
