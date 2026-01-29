// Globale Variablen
let map;
let currentActiveMarker = null;
let markerGroup;

// Pin-Icon aus SVG-Datei erstellen
const createPinIcon = (isActive) => {
    return L.icon({
        iconUrl: 'images/pin.svg',
        iconSize: [32, 43],
        iconAnchor: [16, 43],
        popupAnchor: [0, -43],
        className: isActive ? 'pin-active' : 'pin-inactive'
    });
};

const defaultIcon = createPinIcon(false);
const activeIcon = createPinIcon(true);

// Popup-Inhalt erstellen (nur Bild - tropfenförmig)
const createPopupContent = (church) => {
    const imagePath = church.photoName 
        ? `images/churches/${church.photoName}`
        : 'images/placeholder.webp';
    
    return `
        <div class="teardrop-popup">
            <img src="${imagePath}" 
                 alt="${church.name}"
                 loading="lazy"
                 onerror="this.src='images/placeholder.webp'">
        </div>
    `;
};

// Info-Box Control für fixe Anzeige oben rechts
L.Control.InfoBox = L.Control.extend({
    onAdd: function() {
        const div = L.DomUtil.create('div', 'info-box-control');
        div.innerHTML = `
            <div class="info-box-content">
                <div class="info-box-placeholder">Klicken Sie auf eine Kirche</div>
            </div>
        `;
        return div;
    }
});

// Info-Box mit Kirchendaten aktualisieren
const updateInfoBox = (church) => {
    const infoBox = document.querySelector('.info-box-content');
    if (!infoBox) return;
    
    if (!church) {
        infoBox.innerHTML = '<div class="info-box-placeholder">Klicken Sie auf eine Kirche</div>';
        infoBox.parentElement.classList.remove('active');
        return;
    }
    
    const features = church.besonderheiten && church.besonderheiten.length > 0 
        ? `<div class="info-features">
             <ul>${church.besonderheiten.map(f => `<li>${f}</li>`).join('')}</ul>
           </div>`
        : '';
    
    infoBox.innerHTML = `
        <button class="info-box-close" onclick="closeInfoBox()">&times;</button>
        <h3>${church.name}</h3>
        <div class="info-address">
            <div>${church.address.street}</div>
            <div>${church.address.zipCode} ${church.address.city}</div>
        </div>
        ${features}
    `;
    infoBox.parentElement.classList.add('active');
};

// Info-Box schließen (global für onclick)
window.closeInfoBox = function() {
    updateInfoBox(null);
    if (currentActiveMarker) {
        currentActiveMarker.setIcon(defaultIcon);
        currentActiveMarker.closePopup();
        currentActiveMarker = null;
    }
};

// Marker zu Karte hinzufügen
const addMarkers = (churches) => {
    markerGroup = L.featureGroup();
    
    churches.forEach(church => {
        // Marker erstellen
        const marker = L.marker([church.coordinates.lat, church.coordinates.lng], {
            icon: defaultIcon,
            title: church.name
        });
        
        const popupContent = createPopupContent(church);
        marker.bindPopup(popupContent, {
            maxWidth: 320,
            className: 'custom-popup',
            closeButton: true,
            autoPan: true,
            autoPanPadding: [50, 50]
        });
        
        // Event-Handler für Marker-Click
        marker.on('click', function() {
            // Vorherigen aktiven Marker zurücksetzen
            if (currentActiveMarker && currentActiveMarker !== marker) {
                currentActiveMarker.setIcon(defaultIcon);
            }
            // Aktuellen Marker als aktiv markieren
            marker.setIcon(activeIcon);
            currentActiveMarker = marker;
            
            // Info-Box mit Kirchendaten aktualisieren
            updateInfoBox(church);
        });
        
        marker.on('popupopen', function() {
            // Viewbox erweitern damit Popup und Info-Box beide sichtbar sind
            setTimeout(() => {
                const markerLatLng = marker.getLatLng();
                map.panTo(markerLatLng, {
                    animate: true,
                    duration: 0.5,
                    easeLinearity: 0.25
                });
            }, 100);
        });
        
        marker.on('popupclose', function() {
            // Marker zurücksetzen wenn Popup geschlossen wird
            if (currentActiveMarker === marker) {
                marker.setIcon(defaultIcon);
                updateInfoBox(null);
                currentActiveMarker = null;
            }
        });
        
        markerGroup.addLayer(marker);
    });
    
    map.addLayer(markerGroup);
    
    // Karte an Marker-Bounds anpassen
    if (churches.length > 0) {
        map.fitBounds(markerGroup.getBounds(), {
            padding: [50, 50]
        });
    }
};

// Kirchendaten laden
const loadChurches = async () => {
    try {
        const response = await fetch('data/churches.json');
        if (!response.ok) {
            throw new Error('Kirchendaten konnten nicht geladen werden');
        }
        const data = await response.json();
        addMarkers(data.gottesdienstorte);
    } catch (error) {
        console.error('Fehler beim Laden der Kirchendaten:', error);
        alert('Die Kirchendaten konnten nicht geladen werden. Bitte laden Sie die Seite neu.');
    }
};

// Alle Stadtgrenzen mit GeoJSON Boundaries
async function addRegionHighlight() {
    try {
        // Alle 6 GeoJSON-Dateien laden
        const [hammResponse, werneResponse, ahlenResponse, sendenhorstResponse, drensteinfurtResponse, aschebergResponse] = await Promise.all([
            fetch('data/hamm-boundary.geojson'),
            fetch('data/werne-boundary.geojson'),
            fetch('data/ahlen-boundary.geojson'),
            fetch('data/sendenhorst-boundary.geojson'),
            fetch('data/drensteinfurt-boundary.geojson'),
            fetch('data/ascheberg-boundary.geojson')
        ]);
        const hammData = await hammResponse.json();
        const werneData = await werneResponse.json();
        const ahlenData = await ahlenResponse.json();
        const sendenhorstData = await sendenhorstResponse.json();
        const drensteinfurtData = await drensteinfurtResponse.json();
        const aschebergData = await aschebergResponse.json();
        
        const allCities = [hammData, werneData, ahlenData, sendenhorstData, drensteinfurtData, aschebergData];
        
        // Weltweite Box als äußerer Ring
        const worldBounds = [
            [-90, -180],
            [90, -180],
            [90, 180],
            [-90, 180],
            [-90, -180]
        ];
        
        // Koordinaten für alle Städte extrahieren
        const allCoordinates = allCities.map(cityData => {
            // GeoJSON kann direkt MultiPolygon sein oder Feature mit geometry
            if (cityData.type === 'MultiPolygon') {
                return cityData.coordinates[0][0];
            } else if (cityData.geometry) {
                return cityData.geometry.type === 'MultiPolygon'
                    ? cityData.geometry.coordinates[0][0]
                    : cityData.geometry.coordinates[0];
            }
            return cityData.coordinates[0];
        });
        
        // Invertierter Layer: Welt minus alle Städte
        const invertedLayer = {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [worldBounds, ...allCoordinates]
            }
        };
        
        // Weißer Overlay außerhalb aller Städte (unter Markern)
        L.geoJSON(invertedLayer, {
            style: {
                fillColor: '#ffffff',
                fillOpacity: 0.88,
                stroke: false
            },
            interactive: false,
            pane: 'tilePane'
        }).addTo(map);
        
        // Alle 6 Städte zu einem einzigen Polygon vereinen mit Turf.js
        let unionPolygon = null;
        
        allCities.forEach(cityData => {
            // Konvertiere zu Turf Feature
            let feature;
            if (cityData.type === 'MultiPolygon') {
                feature = turf.multiPolygon(cityData.coordinates);
            } else if (cityData.geometry) {
                feature = cityData;
            } else {
                feature = turf.polygon(cityData.coordinates);
            }
            
            // Union mit bestehendem Polygon
            if (unionPolygon === null) {
                unionPolygon = feature;
            } else {
                try {
                    unionPolygon = turf.union(unionPolygon, feature);
                } catch (e) {
                    console.warn('Union failed for a city, skipping:', e);
                }
            }
        });
        
        // Zeichne nur die äußere vereinte Grenze
        if (unionPolygon) {
            L.geoJSON(unionPolygon, {
                style: {
                    color: '#10b981',
                    weight: 2,
                    fillOpacity: 0,
                    opacity: 0.8
                },
                interactive: false
            }).addTo(map);
        }
        
        // Bounds berechnen für begrenztes Scrollen
        const allLats = [];
        const allLngs = [];
        allCoordinates.forEach(coords => {
            coords.forEach(([lng, lat]) => {
                allLats.push(lat);
                allLngs.push(lng);
            });
        });
        
        const padding = 0.08; // Etwas Puffer
        const minLat = Math.min(...allLats) - padding;
        const maxLat = Math.max(...allLats) + padding;
        const minLng = Math.min(...allLngs) - padding;
        const maxLng = Math.max(...allLngs) + padding;
        
        map.setMaxBounds([[minLat, minLng], [maxLat, maxLng]]);
        map.options.maxBoundsViscosity = 0.75; // Weiche Begrenzung
        
    } catch (error) {
        console.error('Fehler beim Laden der Region-Grenzen:', error);
    }
}

// Karte initialisieren
const initMap = async () => {
    // Karte mit begrenztem Scrollbereich
    map = L.map('map', {
        center: [51.68, 7.82],
        zoom: 11,
        minZoom: 10,
        maxZoom: 16,
        zoomControl: false,
        tap: true,
        tapTolerance: 15,
        touchZoom: true,
        dragging: true
    });
    
    // Tile Layer hinzufügen (CartoDB Light No Labels - sehr simpel)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Zoom-Controls unten rechts positionieren
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
    
    // Info-Box oben rechts hinzufügen
    new L.Control.InfoBox({ position: 'topright' }).addTo(map);
    
    // Legende hinzufügen
    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <div class="legend-item">
                <img src="images/pin.svg" width="20" height="27" alt="Pin">
                <span>Gottesdienstorte</span>
            </div>
        `;
        return div;
    };
    legend.addTo(map);
    
    // Hamm + Werne Highlight hinzufügen
    await addRegionHighlight();
    
    // Kirchendaten laden
    await loadChurches();
};

// Karte beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', initMap);
