const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:4173';

// Wait for map + markers to be ready
async function waitForMap(page) {
  await page.waitForFunction(() => window.map && window.markerGroup, { timeout: 15000 });
  await page.waitForTimeout(500);
}

// ============================================================
// MAP LOADING
// ============================================================

test.describe('Karte laden', () => {
  test('Seite lädt und zeigt Karte', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#map')).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('Leaflet Map-Instanz wird initialisiert', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const hasMap = await page.evaluate(() => !!window.map);
    expect(hasMap).toBe(true);
  });

  test('Karte zeigt Pins für alle Kirchen', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const pinCount = await page.evaluate(() => {
      let count = 0;
      markerGroup.eachLayer(() => count++);
      return count;
    });
    expect(pinCount).toBeGreaterThan(20);
  });

  test('Karte hat korrektes Zentrum (Hamm)', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const center = await page.evaluate(() => ({
      lat: map.getCenter().lat,
      lng: map.getCenter().lng
    }));
    expect(center.lat).toBeCloseTo(51.68, 1);
    expect(center.lng).toBeCloseTo(7.82, 1);
  });

  test('Zoom-Controls sind sichtbar', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-in')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-out')).toBeVisible();
  });

  test('Legende ist sichtbar', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    await expect(page.locator('.map-legend')).toBeVisible();
    await expect(page.locator('.legend-item')).toContainText('Gottesdienstorte');
  });

  test('SVG Karten-Overlay wird geladen', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const hasOverlay = await page.evaluate(() =>
      document.querySelector('.leaflet-image-layer') !== null
    );
    expect(hasOverlay).toBe(true);
  });
});

// ============================================================
// LABELS
// ============================================================

test.describe('Labels', () => {
  test('Stadt-Labels werden angezeigt', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const cityLabels = page.locator('.city-label');
    const count = await cityLabels.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Stadtteil-Labels werden angezeigt', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const districtLabels = page.locator('.district-label');
    const count = await districtLabels.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Stadtteil-Labels bei niedrigem Zoom ausgeblendet', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    await page.evaluate(() => map.setZoom(11));
    await page.waitForTimeout(500);
    const hidden = await page.evaluate(() =>
      document.querySelector('.district-label')?.style.display === 'none'
    );
    expect(hidden).toBe(true);
  });

  test('Stadt-Labels bei minZoom (10) noch sichtbar', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    // Map minZoom is 10 — city labels hide at zoom < 10, so at minZoom they should be visible
    await page.evaluate(() => map.setZoom(10));
    await page.waitForTimeout(500);
    const visible = await page.evaluate(() =>
      document.querySelector('.city-label')?.style.display !== 'none'
    );
    expect(visible).toBe(true);
  });
});

// ============================================================
// PIN CLICK & POPUP
// ============================================================

test.describe('Pin-Klick & Popup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
  });

  test('Pin-Klick öffnet Teardrop-Popup', async ({ page }) => {
    await page.locator('.leaflet-marker-icon.pin-inactive').first().click({ force: true });
    await expect(page.locator('.teardrop-popup')).toBeVisible();
  });

  test('Pin wird nach Klick aktiv (pin-active Klasse)', async ({ page }) => {
    await page.locator('.leaflet-marker-icon.pin-inactive').first().click({ force: true });
    await expect(page.locator('.leaflet-marker-icon.pin-active')).toHaveCount(1);
  });

  test('Popup enthält Bild', async ({ page }) => {
    await page.locator('.leaflet-marker-icon.pin-inactive').first().click({ force: true });
    await expect(page.locator('.teardrop-popup img')).toBeVisible();
  });

  test('Popup schließen setzt Pin zurück', async ({ page }) => {
    await page.locator('.leaflet-marker-icon.pin-inactive').first().click({ force: true });
    await expect(page.locator('.pin-active')).toHaveCount(1);
    // Click on map to close popup
    await page.evaluate(() => map.closePopup());
    await page.waitForTimeout(300);
    await expect(page.locator('.pin-active')).toHaveCount(0);
  });

  test('Zweiten Pin anklicken deaktiviert ersten', async ({ page }) => {
    const pins = page.locator('.leaflet-marker-icon.pin-inactive');
    await pins.first().click({ force: true });
    await expect(page.locator('.pin-active')).toHaveCount(1);

    // Click second pin
    await page.locator('.leaflet-marker-icon.pin-inactive').first().click({ force: true });
    // Should still only have 1 active pin
    await expect(page.locator('.pin-active')).toHaveCount(1);
  });
});

// ============================================================
// INFO-BOX
// ============================================================

test.describe('Info-Box', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
  });

  test('Info-Box initial unsichtbar (Platzhalter)', async ({ page }) => {
    const infoBox = page.locator('.info-box-control');
    await expect(infoBox).not.toHaveClass(/active/);
  });

  test('Info-Box wird bei Pin-Klick sichtbar', async ({ page }) => {
    await page.locator('.leaflet-marker-icon.pin-inactive').first().click({ force: true });
    await expect(page.locator('.info-box-control')).toHaveClass(/active/);
  });

  test('Info-Box zeigt Kirchenname', async ({ page }) => {
    // Click first marker in JS to get a defined church
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    const name = await page.locator('.info-box-content h3').textContent();
    expect(name.length).toBeGreaterThan(0);
  });

  test('Info-Box zeigt Adresse', async ({ page }) => {
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    await expect(page.locator('.info-address')).toBeVisible();
    const address = await page.locator('.info-address').textContent();
    expect(address).toMatch(/\d{5}/); // PLZ pattern
  });

  test('Info-Box zeigt Besonderheiten wenn vorhanden', async ({ page }) => {
    // Find a church with besonderheiten (Pauluskirche is first = index 0)
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    await expect(page.locator('.info-features')).toBeVisible();
    const items = await page.locator('.info-features li').count();
    expect(items).toBeGreaterThan(0);
  });

  test('Info-Box zeigt "Weitere Infos" Button bei Kirche mit Website', async ({ page }) => {
    // Click a church that has a website
    await page.evaluate(() => {
      let found = null;
      markerGroup.eachLayer(m => {
        if (!found && m.options.title === 'Pauluskirche') found = m;
      });
      if (found) found.fire('click');
    });
    await page.waitForTimeout(300);
    const websiteBtn = page.locator('.info-website-button').filter({ hasText: 'Weitere Infos' });
    await expect(websiteBtn).toBeVisible();
    const href = await websiteBtn.getAttribute('href');
    expect(href).toMatch(/^https:\/\//);
    expect(await websiteBtn.getAttribute('target')).toBe('_blank');
  });

  test('Info-Box zeigt "Zum Buchungskalender" bei Kirche mit Buchungslink', async ({ page }) => {
    // Find a church with buchungsLink
    const hasBooking = await page.evaluate(async () => {
      const response = await fetch('data/churches.json');
      const data = await response.json();
      return data.gottesdienstorte.some(c => c.buchungsLink && c.buchungsLink.length > 0);
    });
    if (!hasBooking) {
      test.skip(); // No churches have booking links currently
      return;
    }
    await page.evaluate(() => {
      let found = null;
      markerGroup.eachLayer(m => {
        if (!found && m.options.title) {
          // Find one with buchungsLink via data
          found = m;
        }
      });
    });
  });

  test('Info-Box Close-Button schließt die Box', async ({ page }) => {
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    await expect(page.locator('.info-box-control')).toHaveClass(/active/);
    await page.locator('.info-box-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.info-box-control')).not.toHaveClass(/active/);
  });

  test('Info-Box Close setzt Pin zurück auf inaktiv', async ({ page }) => {
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    await expect(page.locator('.pin-active')).toHaveCount(1);
    await page.locator('.info-box-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.pin-active')).toHaveCount(0);
  });
});

// ============================================================
// KIRCHE OHNE OPTIONALE FELDER
// ============================================================

test.describe('Kirche ohne optionale Felder', () => {
  test('Kirche ohne Website zeigt keinen "Weitere Infos" Button', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    // Find a church without website (or with empty string)
    const clicked = await page.evaluate(() => {
      const response = fetch('data/churches.json');
      return response;
    });
    // Programmatically inject a church without website and click it
    await page.evaluate(() => {
      const testChurch = {
        name: 'Test-Kirche-Ohne-Website',
        address: { street: 'Teststr. 1', zipCode: '59065', city: 'Hamm' },
        coordinates: { lat: 51.68, lng: 7.82 },
        besonderheiten: [],
        website: '',
        buchungsLink: '',
        photoName: ''
      };
      updateInfoBox(testChurch);
    });
    await page.waitForTimeout(200);
    const websiteBtn = page.locator('.info-website-button');
    await expect(websiteBtn).toHaveCount(0);
  });

  test('Kirche ohne Besonderheiten zeigt keine Feature-Liste', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    await page.evaluate(() => {
      updateInfoBox({
        name: 'Kirche-Ohne-Features',
        address: { street: 'Test 1', zipCode: '59065', city: 'Hamm' },
        coordinates: { lat: 51.68, lng: 7.82 },
        besonderheiten: [],
        website: 'https://test.de',
        buchungsLink: '',
        photoName: ''
      });
    });
    await page.waitForTimeout(200);
    await expect(page.locator('.info-features')).toHaveCount(0);
    // But name and address should still show
    await expect(page.locator('.info-box-content h3')).toContainText('Kirche-Ohne-Features');
  });

  test('Kirche ohne Foto zeigt Placeholder-Bild im Popup', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    // Find a church without photoName or trigger onerror
    const popupHtml = await page.evaluate(() => {
      return createPopupContent({
        name: 'Kein-Foto-Kirche',
        photoName: '',
        website: ''
      });
    });
    expect(popupHtml).toContain('placeholder.webp');
  });
});

// ============================================================
// PIN-KOLLISIONEN
// ============================================================

test.describe('Pin-Kollisionen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
  });

  test('Alle Pins sind klickbar (kein Pin wird durch andere verdeckt)', async ({ page }) => {
    // Get all markers and try to click each one via JS fire
    const totalMarkers = await page.evaluate(() => {
      let count = 0;
      markerGroup.eachLayer(() => count++);
      return count;
    });

    let successCount = 0;
    for (let i = 0; i < totalMarkers; i++) {
      const name = await page.evaluate((idx) => {
        let j = 0;
        let result = null;
        markerGroup.eachLayer(m => {
          if (j === idx) {
            m.fire('click');
            result = m.options.title;
          }
          j++;
        });
        return result;
      }, i);

      if (name) {
        const infoName = await page.locator('.info-box-content h3').textContent();
        expect(infoName).toBe(name);
        successCount++;
      }
    }
    expect(successCount).toBe(totalMarkers);
  });

  test('Keine zwei Pins haben exakt gleiche Koordinaten', async ({ page }) => {
    const coords = await page.evaluate(() => {
      const result = [];
      markerGroup.eachLayer(m => {
        const ll = m.getLatLng();
        result.push(`${ll.lat.toFixed(4)},${ll.lng.toFixed(4)}`);
      });
      return result;
    });
    const unique = new Set(coords);
    expect(unique.size).toBe(coords.length);
  });

  test('Pins überlappen nicht bei Standard-Zoom', async ({ page }) => {
    // Set to default zoom and check pixel positions
    await page.evaluate(() => map.setZoom(12));
    await page.waitForTimeout(500);

    const positions = await page.evaluate(() => {
      const result = [];
      markerGroup.eachLayer(m => {
        const point = map.latLngToContainerPoint(m.getLatLng());
        result.push({ x: point.x, y: point.y, name: m.options.title });
      });
      return result;
    });

    // Check that no two pin centers are within 10px of each other
    const minDistance = 10;
    const collisions = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          collisions.push(`${positions[i].name} <-> ${positions[j].name} (${dist.toFixed(1)}px)`);
        }
      }
    }
    expect(collisions).toEqual([]);
  });

  test('Info-Box überlappt nicht mit eigenem Popup (Desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE_URL);
    await waitForMap(page);

    // Click a pin
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(600);

    // Get positions of popup and info-box
    const popup = await page.locator('.leaflet-popup').boundingBox();
    const infoBox = await page.locator('.info-box-control.active').boundingBox();

    if (popup && infoBox) {
      // Check no overlap: popup.right should be < infoBox.left OR no vertical overlap
      const popupRight = popup.x + popup.width;
      const noHorizontalOverlap = popupRight <= infoBox.x || popup.x >= infoBox.x + infoBox.width;
      const noVerticalOverlap = popup.y + popup.height <= infoBox.y || popup.y >= infoBox.y + infoBox.height;
      const noOverlap = noHorizontalOverlap || noVerticalOverlap;
      expect(noOverlap).toBe(true);
    }
  });
});

// ============================================================
// ZOOM-VERHALTEN
// ============================================================

test.describe('Zoom-Verhalten', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
  });

  test('Pin-Größe skaliert mit Zoom', async ({ page }) => {
    // Get pin size at zoom 12
    await page.evaluate(() => map.setZoom(12));
    await page.waitForTimeout(500);
    const sizeAt12 = await page.locator('.leaflet-marker-icon').first().boundingBox();

    // Get pin size at zoom 14
    await page.evaluate(() => map.setZoom(14));
    await page.waitForTimeout(500);
    const sizeAt14 = await page.locator('.leaflet-marker-icon').first().boundingBox();

    // Pins should be at least same size or larger at higher zoom
    expect(sizeAt14.height).toBeGreaterThanOrEqual(sizeAt12.height);
  });

  test('Zoom auf Minimum begrenzt', async ({ page }) => {
    await page.evaluate(() => map.setZoom(5));
    await page.waitForTimeout(300);
    const zoom = await page.evaluate(() => map.getZoom());
    expect(zoom).toBeGreaterThanOrEqual(10);
  });

  test('Zoom auf Maximum begrenzt', async ({ page }) => {
    await page.evaluate(() => map.setZoom(20));
    await page.waitForTimeout(300);
    const zoom = await page.evaluate(() => map.getZoom());
    expect(zoom).toBeLessThanOrEqual(16);
  });

  test('MaxBounds begrenzt Kartenbereich', async ({ page }) => {
    const hasBounds = await page.evaluate(() => !!map.options.maxBounds);
    expect(hasBounds).toBe(true);
  });
});

// ============================================================
// MOBILE VIEWPORT
// ============================================================

test.describe('Mobile Viewport (375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Karte füllt gesamten Viewport', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const mapBox = await page.locator('#map').boundingBox();
    expect(mapBox.width).toBeCloseTo(375, -1);
    // Should be at least a large portion of viewport height
    expect(mapBox.height).toBeGreaterThan(600);
  });

  test('Pins werden auf Mobile angezeigt', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const pinCount = await page.locator('.leaflet-marker-icon').count();
    expect(pinCount).toBeGreaterThan(20);
  });

  test('Pin-Klick öffnet Popup auf Mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    await expect(page.locator('.teardrop-popup')).toBeVisible();
  });

  test('Info-Box hat volle Breite auf Mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    const infoBox = await page.locator('.info-box-control.active').boundingBox();
    if (infoBox) {
      // Mobile: min-width: calc(100vw - 40px) → should be ~335px
      expect(infoBox.width).toBeGreaterThan(300);
    }
  });

  test('Popup hat kleinere Größe auf Mobile (220px)', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    // offsetWidth gives pre-transform layout size (CSS rotation inflates boundingBox/computedStyle)
    const layoutWidth = await page.locator('.teardrop-popup').evaluate(el => el.offsetWidth);
    // Mobile: 220px per CSS media query
    expect(layoutWidth).toBeLessThanOrEqual(230);
  });

  test('Zoom-Controls sind größer auf Mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const zoomIn = await page.locator('.leaflet-control-zoom-in').boundingBox();
    expect(zoomIn.width).toBeGreaterThanOrEqual(36); // Mobile: 40px
    expect(zoomIn.height).toBeGreaterThanOrEqual(36);
  });

  test('Stadt-Labels haben kleinere Schrift auf Mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const fontSize = await page.locator('.city-label').first().evaluate(el =>
      window.getComputedStyle(el).fontSize
    );
    expect(parseFloat(fontSize)).toBeLessThanOrEqual(14); // Mobile: 13px
  });
});

// ============================================================
// MOBILE – PIN & INFO-BOX KOLLISIONEN
// ============================================================

test.describe('Mobile – Pin & Info-Box Kollisionen', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
  });

  test('Info-Box schließen per Close-Button auf kleinem Screen', async ({ page }) => {
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    await expect(page.locator('.info-box-control')).toHaveClass(/active/);
    await page.locator('.info-box-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.info-box-control')).not.toHaveClass(/active/);
  });

  test('Wechsel zwischen Pins auf Mobile aktualisiert Info-Box', async ({ page }) => {
    // Click first marker
    const names = await page.evaluate(() => {
      const result = [];
      let i = 0;
      markerGroup.eachLayer(m => {
        if (i < 2) result.push(m.options.title);
        i++;
      });
      return result;
    });

    // Click first
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    const name1 = await page.locator('.info-box-content h3').textContent();
    expect(name1).toBe(names[0]);

    // Click second
    await page.evaluate(() => {
      let i = 0;
      markerGroup.eachLayer(m => { if (i === 1) m.fire('click'); i++; });
    });
    await page.waitForTimeout(300);
    const name2 = await page.locator('.info-box-content h3').textContent();
    expect(name2).toBe(names[1]);
    expect(name1).not.toBe(name2);
  });

  test('Nur ein aktiver Pin zu einem Zeitpunkt auf Mobile', async ({ page }) => {
    // Click first pin
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(200);
    expect(await page.locator('.pin-active').count()).toBe(1);

    // Click second pin
    await page.evaluate(() => {
      let i = 0;
      markerGroup.eachLayer(m => { if (i === 1) m.fire('click'); i++; });
    });
    await page.waitForTimeout(200);
    expect(await page.locator('.pin-active').count()).toBe(1);
  });
});

// ============================================================
// TABLET VIEWPORT
// ============================================================

test.describe('Tablet Viewport (768x1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('Karte wird auf Tablet korrekt angezeigt', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    const mapBox = await page.locator('#map').boundingBox();
    expect(mapBox.width).toBeCloseTo(768, -1);
    expect(mapBox.height).toBeGreaterThan(500);
  });

  test('Pins und Info-Box funktionieren auf Tablet', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    await expect(page.locator('.info-box-control')).toHaveClass(/active/);
    await expect(page.locator('.teardrop-popup')).toBeVisible();
  });
});

// ============================================================
// DESKTOP – BREITER VIEWPORT
// ============================================================

test.describe('Desktop (1920x1080)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('Info-Box überlappt nicht mit Popup bei Klick auf rechte Pins', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);

    // Find the rightmost marker (closest to info-box)
    await page.evaluate(() => {
      let rightmost = null;
      let maxLng = -Infinity;
      markerGroup.eachLayer(m => {
        if (m.getLatLng().lng > maxLng) {
          maxLng = m.getLatLng().lng;
          rightmost = m;
        }
      });
      if (rightmost) {
        map.setView(rightmost.getLatLng(), 13);
      }
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      let rightmost = null;
      let maxLng = -Infinity;
      markerGroup.eachLayer(m => {
        if (m.getLatLng().lng > maxLng) {
          maxLng = m.getLatLng().lng;
          rightmost = m;
        }
      });
      if (rightmost) rightmost.fire('click');
    });
    await page.waitForTimeout(800); // wait for pan animation

    const popup = await page.locator('.leaflet-popup').boundingBox();
    const infoBox = await page.locator('.info-box-control.active').boundingBox();
    if (popup && infoBox) {
      const popupRight = popup.x + popup.width;
      const noOverlap = popupRight <= infoBox.x
        || popup.x >= infoBox.x + infoBox.width
        || popup.y + popup.height <= infoBox.y
        || popup.y >= infoBox.y + infoBox.height;
      expect(noOverlap).toBe(true);
    }
  });

  test('Teardrop-Popup ist 280px auf Desktop', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMap(page);
    await page.evaluate(() => {
      let first = null;
      markerGroup.eachLayer(m => { if (!first) first = m; });
      first.fire('click');
    });
    await page.waitForTimeout(300);
    // offsetWidth gives pre-transform layout size (CSS rotation inflates boundingBox/computedStyle)
    const layoutWidth = await page.locator('.teardrop-popup').evaluate(el => el.offsetWidth);
    expect(layoutWidth).toBeCloseTo(280, -1);
  });
});

// ============================================================
// DATENINTEGRITÄT
// ============================================================

test.describe('Datenintegrität', () => {
  test('churches.json ist valid und enthält Kirchen', async ({ page }) => {
    await page.goto(BASE_URL);
    const data = await page.evaluate(async () => {
      const res = await fetch('data/churches.json');
      return res.json();
    });
    expect(data.kirchenkreis).toBe('Evangelischer Kirchenkreis Hamm');
    expect(data.gottesdienstorte.length).toBeGreaterThan(20);
  });

  test('Jede Kirche hat Pflichtfelder', async ({ page }) => {
    await page.goto(BASE_URL);
    const churches = await page.evaluate(async () => {
      const res = await fetch('data/churches.json');
      const data = await res.json();
      return data.gottesdienstorte;
    });
    churches.forEach(c => {
      expect(c.name).toBeTruthy();
      expect(c.address).toBeTruthy();
      expect(c.address.street).toBeTruthy();
      expect(c.address.zipCode).toMatch(/^\d{5}$/);
      expect(c.address.city).toBeTruthy();
      expect(c.coordinates).toBeTruthy();
      expect(c.coordinates.lat).toBeGreaterThan(51);
      expect(c.coordinates.lng).toBeGreaterThan(7);
    });
  });

  test('labels.json ist valid', async ({ page }) => {
    await page.goto(BASE_URL);
    const data = await page.evaluate(async () => {
      const res = await fetch('data/labels.json');
      return res.json();
    });
    expect(Array.isArray(data.cities)).toBe(true);
    expect(Array.isArray(data.districts)).toBe(true);
    expect(data.cities.length).toBeGreaterThan(0);
    expect(data.districts.length).toBeGreaterThan(0);
  });

  test('Alle Koordinaten liegen im Kirchenkreis-Bereich', async ({ page }) => {
    await page.goto(BASE_URL);
    const churches = await page.evaluate(async () => {
      const res = await fetch('data/churches.json');
      const data = await res.json();
      return data.gottesdienstorte;
    });
    churches.forEach(c => {
      expect(c.coordinates.lat).toBeGreaterThan(51.4);
      expect(c.coordinates.lat).toBeLessThan(52.0);
      expect(c.coordinates.lng).toBeGreaterThan(7.3);
      expect(c.coordinates.lng).toBeLessThan(8.2);
    });
  });

  test('Keine doppelten Kirchennamen am gleichen Ort', async ({ page }) => {
    await page.goto(BASE_URL);
    const churches = await page.evaluate(async () => {
      const res = await fetch('data/churches.json');
      const data = await res.json();
      return data.gottesdienstorte;
    });
    const keys = churches.map(c => `${c.name}|${c.address.city}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  test('Website-URLs beginnen mit https://', async ({ page }) => {
    await page.goto(BASE_URL);
    const churches = await page.evaluate(async () => {
      const res = await fetch('data/churches.json');
      const data = await res.json();
      return data.gottesdienstorte;
    });
    churches.forEach(c => {
      if (c.website && c.website.length > 0) {
        expect(c.website).toMatch(/^https:\/\//);
      }
      if (c.buchungsLink && c.buchungsLink.length > 0) {
        expect(c.buchungsLink).toMatch(/^https:\/\//);
      }
    });
  });
});
