// Globale Variablen
let map;
let currentActiveMarker = null;
let markerGroup;

// Pin-Icon aus SVG-Datei erstellen (zoom-abhaengige Groesse)
const createPinIcon = (isActive, zoom) => {
    // Basisgroesse bei Zoom 11, skaliert mit Zoom-Level
    const scale = zoom ? Math.max(0.4, Math.min(1, (zoom - 9) / 4)) : 1;
    const w = Math.round(32 * scale);
    const h = Math.round(43 * scale);
    return L.icon({
        iconUrl: 'images/pin.svg',
        iconSize: [w, h],
        iconAnchor: [w / 2, h],
        popupAnchor: [0, -h],
        className: isActive ? 'pin-active' : 'pin-inactive'
    });
};

const defaultIcon = createPinIcon(false);
const activeIcon = createPinIcon(true);

// Pin-Groessen und Label-Sichtbarkeit bei Zoom aktualisieren
const updateZoomDependentElements = () => {
    const zoom = map.getZoom();
    const newDefault = createPinIcon(false, zoom);
    const newActive = createPinIcon(true, zoom);

    if (markerGroup) {
        markerGroup.eachLayer(marker => {
            if (marker === currentActiveMarker) {
                marker.setIcon(newActive);
            } else {
                marker.setIcon(newDefault);
            }
        });
    }

    // District-Labels ab Zoom < 12 ausblenden
    document.querySelectorAll('.district-label').forEach(el => {
        el.style.display = zoom < 12 ? 'none' : '';
    });

    // City-Labels ab Zoom < 10 ausblenden
    document.querySelectorAll('.city-label').forEach(el => {
        el.style.display = zoom < 10 ? 'none' : '';
    });
};

// Popup-Inhalt erstellen (nur Bild - tropfenförmig)
const createPopupContent = (church) => {
    const imagePath = church.photoName 
        ? `images/churches/${church.photoName}`
        : 'images/placeholder.webp';
    
    const imageElement = church.website
        ? `<a href="${church.website}" target="_blank" rel="noopener noreferrer" class="popup-image-link">
               <img src="${imagePath}" 
                    alt="${church.name}"
                    loading="lazy"
                    onerror="this.src='images/placeholder.webp'">
           </a>`
        : `<img src="${imagePath}" 
                alt="${church.name}"
                loading="lazy"
                onerror="this.src='images/placeholder.webp'">`;
    
    return `
        <div class="teardrop-popup">
            ${imageElement}
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
             <ul>${church.besonderheiten.map(f => {
                 // Unterstützt sowohl String als auch Objekt mit {text, emoji}
                 if (typeof f === 'string') {
                     return `<li>${f}</li>`;
                 } else {
                     const emoji = f.emoji || '';
                     return `<li data-emoji="${emoji}">${f.text}</li>`;
                 }
             }).join('')}</ul>
           </div>`
        : '';
    
    const websiteButton = church.website
        ? `<a href="${church.website}" target="_blank" rel="noopener noreferrer" class="info-website-button">
               Weitere Infos
           </a>`
        : '';

    const bookingButton = church.buchungsLink
        ? `<a href="${church.buchungsLink}" target="_blank" rel="noopener noreferrer" class="info-website-button">
               Zum Buchungskalender
           </a>`
        : '';
    
    infoBox.innerHTML = `
        <button class="info-box-close" onclick="closeInfoBox()">&times;</button>
        <h3>${church.name}</h3>
        <div class="info-address">
            <div>${church.address.street}</div>
            <div>${church.address.zipCode} ${church.address.city}</div>
        </div>
        ${features}
        ${websiteButton}
        ${bookingButton}
    `;
    infoBox.parentElement.classList.add('active');
};

// Info-Box schließen (global für onclick)
window.closeInfoBox = function() {
    updateInfoBox(null);
    if (currentActiveMarker) {
        currentActiveMarker.setIcon(createPinIcon(false, map.getZoom()));
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
            const zoom = map.getZoom();
            // Vorherigen aktiven Marker zurücksetzen
            if (currentActiveMarker && currentActiveMarker !== marker) {
                currentActiveMarker.setIcon(createPinIcon(false, zoom));
            }
            // Aktuellen Marker als aktiv markieren
            marker.setIcon(createPinIcon(true, zoom));
            currentActiveMarker = marker;
            
            // Info-Box mit Kirchendaten aktualisieren
            updateInfoBox(church);
        });
        
        marker.on('popupopen', function() {
            // Viewbox anpassen damit Pin + Popup sichtbar bleiben
            setTimeout(() => {
                const markerLatLng = marker.getLatLng();
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    // Pin in untere Hälfte verschieben, damit Info-Box oben nicht verdeckt
                    const point = map.latLngToContainerPoint(markerLatLng);
                    const targetY = window.innerHeight * 0.65;
                    const offsetPoint = L.point(point.x, point.y - (targetY - point.y));
                    const newLatLng = map.containerPointToLatLng(offsetPoint);
                    map.panTo(newLatLng, { animate: true, duration: 0.5 });
                } else {
                    map.panTo(markerLatLng, {
                        animate: true,
                        duration: 0.5,
                        easeLinearity: 0.25
                    });
                }
            }, 100);
        });
        
        marker.on('popupclose', function() {
            // Marker zurücksetzen wenn Popup geschlossen wird
            if (currentActiveMarker === marker) {
                marker.setIcon(createPinIcon(false, map.getZoom()));
                updateInfoBox(null);
                currentActiveMarker = null;
            }
        });
        
        markerGroup.addLayer(marker);
    });
    
    map.addLayer(markerGroup);
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

// Orts- und Stadtteil-Labels laden und anzeigen
const loadLabels = async () => {
    try {
        const response = await fetch('data/labels.json');
        if (!response.ok) {
            console.warn('Labels konnten nicht geladen werden');
            return;
        }
        const data = await response.json();

        data.cities.forEach(city => {
            const cityLabel = L.divIcon({
                className: 'map-label city-label',
                html: city.name,
                iconSize: null,
                iconAnchor: [0, 0]
            });
            L.marker([city.coordinates.lat, city.coordinates.lng], {
                icon: cityLabel,
                interactive: false
            }).addTo(map);
        });

        data.districts.forEach(district => {
            const districtLabel = L.divIcon({
                className: 'map-label district-label',
                html: district.name,
                iconSize: null,
                iconAnchor: [0, 0]
            });
            L.marker([district.coordinates.lat, district.coordinates.lng], {
                icon: districtLabel,
                interactive: false
            }).addTo(map);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Labels:', error);
    }
};

// Alle Stadtgrenzen mit GeoJSON Boundaries
async function addRegionHighlight() {
    try {
        // Nur die gewuenschten 4 GeoJSON-Dateien laden
        const [hammResponse, werneResponse, ahlenResponse, sendenhorstResponse] = await Promise.all([
            fetch('data/hamm-boundary.geojson'),
            fetch('data/werne-boundary.geojson'),
            fetch('data/ahlen-boundary.geojson'),
            fetch('data/sendenhorst-boundary.geojson')
        ]);
        const hammData = await hammResponse.json();
        const werneData = await werneResponse.json();
        const ahlenData = await ahlenResponse.json();
        const sendenhorstData = await sendenhorstResponse.json();
        
        const allCities = [hammData, werneData, ahlenData, sendenhorstData];
        
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
        zoom: 12,
        minZoom: 10,
        maxZoom: 16,
        zoomControl: false,
        tap: true,
        tapTolerance: 15,
        touchZoom: true,
        dragging: true
    });
    
    // Stilisierte Hintergrundkarte als Image Overlay
    // Bounds = GeoJSON-Extent der 4 Staedte (SVG fuellt ViewBox komplett aus)
    const imageBounds = [[51.5566, 7.5406], [51.8860, 7.9974]];
    L.imageOverlay('images/Map.svg', imageBounds, {
        opacity: 1.0,
        interactive: false,
        zIndex: 1
    }).addTo(map);

    // Hintergrundfarbe fuer Bereiche ausserhalb des Bildes
    map.getContainer().style.backgroundColor = '#f5f5f5';
    
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

    // Labels laden (Staedte und Stadtteile)
    await loadLabels();
    
    // Kirchendaten laden
    await loadChurches();

    // Zoom-abhaengige Elemente initial setzen und bei Zoom aktualisieren
    updateZoomDependentElements();
    map.on('zoomend', updateZoomDependentElements);
};

// Karte beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', initMap);
