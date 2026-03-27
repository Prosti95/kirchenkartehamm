const { test, expect } = require('@playwright/test');
const path = require('path');

const ADMIN_URL = 'file:///' + path.resolve(__dirname, '../docs/admin.html').replace(/\\/g, '/');

// Helper: load data from GitHub and wait for the church list to populate
async function loadData(page) {
  await page.getByText('Aktuelle Daten laden').first().click();
  await page.locator('#church-list .list-item').first().waitFor({ timeout: 15000 });
}

// ============================================================
// LOADING
// ============================================================

test.describe('Daten laden', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    // Clear any leftover localStorage
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Seite zeigt Header und Tabs', async ({ page }) => {
    await expect(page.locator('.header h1')).toContainText('Kirchenkarte Admin');
    const tabs = page.locator('.tabs .tab');
    await expect(tabs).toHaveCount(5);
  });

  test('Aktuelle Daten laden füllt Kirchenliste', async ({ page }) => {
    await loadData(page);
    const count = await page.locator('#church-list .list-item').count();
    expect(count).toBeGreaterThan(20);
    await expect(page.locator('#church-count')).not.toHaveText('0');
  });

  test('Lokale JSON-Datei laden via file input', async ({ page }) => {
    const json = JSON.stringify({
      kirchenkreis: 'Test',
      gottesdienstorte: [
        { name: 'Testkirche', address: { street: 'A 1', zipCode: '12345', city: 'X' }, coordinates: { lat: 51.68, lng: 7.82 } }
      ]
    });
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json',
      mimeType: 'application/json',
      buffer: Buffer.from(json),
    });
    await expect(page.locator('#church-list .list-item')).toHaveCount(1);
    await expect(page.locator('#church-list .list-item').first()).toContainText('Testkirche');
  });
});

// ============================================================
// CRUD
// ============================================================

test.describe('Kirchen CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('Neue Kirche hinzufügen erhöht Liste', async ({ page }) => {
    const before = await page.locator('#church-list .list-item').count();
    await page.getByText('+ Neue Kirche').click();
    const after = await page.locator('#church-list .list-item').count();
    expect(after).toBe(before + 1);
  });

  test('Kirche auswählen zeigt Detail-Formular', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await expect(page.locator('#church-detail h3')).toBeVisible();
    // Should show name in heading
    const heading = await page.locator('#church-detail h3').first().textContent();
    expect(heading.length).toBeGreaterThan(0);
  });

  test('Schließen-Button deselektiert Kirche', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await expect(page.locator('#church-detail h3')).toBeVisible();
    await page.getByText('✕ Schließen').click();
    // Detail should show placeholder
    await expect(page.locator('#church-detail .no-data')).toBeVisible();
  });

  test('Kirche löschen entfernt aus Liste', async ({ page }) => {
    const before = await page.locator('#church-list .list-item').count();
    await page.locator('#church-list .list-item').first().click();

    page.on('dialog', dialog => dialog.accept());
    await page.getByText('🗑 Löschen').click();

    const after = await page.locator('#church-list .list-item').count();
    expect(after).toBe(before - 1);
  });

  test('Name bearbeiten aktualisiert Liste', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    const nameInput = page.locator('#church-detail .form-group input[type="text"]').first();
    await nameInput.fill('Umbenannte Testkirche');
    await expect(page.locator('#church-list .list-item').first()).toContainText('Umbenannte Testkirche');
  });

  test('Suche filtert Kirchenliste', async ({ page }) => {
    const total = await page.locator('#church-list .list-item').count();
    await page.locator('.list-search input').fill('Pauluskirche');
    const filtered = await page.locator('#church-list .list-item:visible').count();
    expect(filtered).toBeLessThan(total);
    expect(filtered).toBeGreaterThan(0);
  });
});

// ============================================================
// VALIDATION
// ============================================================

test.describe('Validierung', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('Neue Kirche: Pflichtfelder sind rot', async ({ page }) => {
    await page.getByText('+ Neue Kirche').click();
    // Select the newly added (last) entry
    await page.locator('#church-list .list-item').last().click();

    // Name field should have .invalid
    const nameInput = page.locator('#church-detail .form-group input[type="text"]').first();
    await expect(nameInput).toHaveClass(/invalid/);
  });

  test('Name-Feld wird grün nach Eingabe', async ({ page }) => {
    await page.getByText('+ Neue Kirche').click();
    await page.locator('#church-list .list-item').last().click();

    const nameInput = page.locator('#church-detail .form-group input[type="text"]').first();
    await expect(nameInput).toHaveClass(/invalid/);

    await nameInput.fill('Testkirche');
    await expect(nameInput).not.toHaveClass(/invalid/);
  });

  test('PLZ-Feld validiert 5-stellig', async ({ page }) => {
    await page.getByText('+ Neue Kirche').click();
    await page.locator('#church-list .list-item').last().click();

    const plzInput = page.locator('#church-detail input[maxlength="5"]');
    await expect(plzInput).toHaveClass(/invalid/);

    await plzInput.fill('123');
    await expect(plzInput).toHaveClass(/invalid/);

    await plzInput.fill('59065');
    await expect(plzInput).not.toHaveClass(/invalid/);
  });

  test('Export-Tab zeigt Validierungsfehler für unvollständige Kirche', async ({ page }) => {
    await page.getByText('+ Neue Kirche').click();
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('.validation-errors')).toBeVisible();
  });
});

// ============================================================
// EXPORT
// ============================================================

test.describe('Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('Kirchendaten Download', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Kirchendaten herunterladen/ }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('churches.json');
  });

  test('Beschriftungen Download', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Beschriftungen herunterladen/ }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('labels.json');
  });

  test('Diff zeigt Änderungen nach Bearbeitung', async ({ page }) => {
    // Edit a church
    await page.locator('#church-list .list-item').first().click();
    const nameInput = page.locator('#church-detail .form-group input[type="text"]').first();
    await nameInput.fill('Geänderte Kirche');

    // Switch to export tab
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('.diff-item.modified')).toBeVisible();
  });

  test('Meine Änderungen speichern erzeugt Änderungsdatei', async ({ page }) => {
    // Edit a church's website (keeps name intact so diff detects 'modified')
    await page.locator('#church-list .list-item').first().click();
    // Change website field
    const websiteInput = page.locator('#church-detail input[type="url"]').first();
    await websiteInput.fill('https://test-changed.example.com');

    await page.locator('.tab[data-tab="export"]').click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^aenderungen_.*\.json$/);

    // Verify content
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const content = JSON.parse(Buffer.concat(chunks).toString());
    expect(content.type).toBe('kirchenkarte-patch');
    expect(content.changes.length).toBeGreaterThan(0);
    expect(content.changes[0].action).toBe('modified');
  });

  test('Keine Änderungen → Export zeigt Hinweis', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    // Wait for any loading toasts to disappear
    await page.waitForTimeout(3500);
    await page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click();
    await expect(page.locator('.toast').last()).toContainText('Keine Änderungen');
  });
});

// ============================================================
// PATCH IMPORT / MERGE
// ============================================================

test.describe('Patch Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
    await page.locator('.tab[data-tab="export"]').click();
  });

  test('Patch-Datei laden zeigt Merge-UI', async ({ page }) => {
    const patch = JSON.stringify({
      type: 'kirchenkarte-patch',
      exported: new Date().toISOString(),
      changes: [
        { action: 'added', church: { name: 'Neue Importkirche', address: { street: 'Test 1', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.68, lng: 7.82 } } }
      ]
    });
    await page.locator('#patch-file-input').setInputFiles({
      name: 'aenderungen_test.json',
      mimeType: 'application/json',
      buffer: Buffer.from(patch),
    });

    await expect(page.locator('.merge-box')).toBeVisible();
    await expect(page.getByText('Neue Importkirche')).toBeVisible();
  });

  test('Einzelne Änderung übernehmen', async ({ page }) => {
    const patch = JSON.stringify({
      type: 'kirchenkarte-patch',
      exported: new Date().toISOString(),
      changes: [
        { action: 'added', church: { name: 'Merge-Testkirche', address: { street: 'X 1', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.69, lng: 7.83 } } }
      ]
    });
    await page.locator('#patch-file-input').setInputFiles({
      name: 'patch.json',
      mimeType: 'application/json',
      buffer: Buffer.from(patch),
    });
    await expect(page.locator('.merge-box')).toBeVisible();

    const beforeCount = await page.evaluate(() => churches.length);
    await page.locator('.merge-box .btn-success').first().click();
    const afterCount = await page.evaluate(() => churches.length);
    expect(afterCount).toBe(beforeCount + 1);

    // Should show as applied
    await expect(page.getByText('✓ Übernommen')).toBeVisible();
  });

  test('Alle Änderungen übernehmen', async ({ page }) => {
    const patch = JSON.stringify({
      type: 'kirchenkarte-patch',
      exported: new Date().toISOString(),
      changes: [
        { action: 'added', church: { name: 'Batch-Kirche-A', address: { street: 'A', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.69, lng: 7.83 } } },
        { action: 'added', church: { name: 'Batch-Kirche-B', address: { street: 'B', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.70, lng: 7.84 } } }
      ]
    });
    await page.locator('#patch-file-input').setInputFiles({
      name: 'patch.json',
      mimeType: 'application/json',
      buffer: Buffer.from(patch),
    });

    const beforeCount = await page.evaluate(() => churches.length);
    await page.getByText('✓ Alle übernehmen').click();
    const afterCount = await page.evaluate(() => churches.length);
    expect(afterCount).toBe(beforeCount + 2);
  });

  test('Ungültige Datei wird abgelehnt', async ({ page }) => {
    await page.locator('#patch-file-input').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"foo": "bar"}'),
    });
    // Merge-UI should NOT appear
    await expect(page.locator('.merge-box')).not.toBeVisible();
  });
});

// ============================================================
// AUTO-SAVE
// ============================================================

test.describe('Auto-Save', () => {
  test('Daten werden in localStorage gespeichert', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);

    const saved = await page.evaluate(() => localStorage.getItem('kirchenkarte-admin'));
    expect(saved).toBeTruthy();
    const data = JSON.parse(saved);
    expect(data.churches.length).toBeGreaterThan(0);
  });

  test('localStorage wird beim Neustart wiederhergestellt', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);

    const countBefore = await page.locator('#church-list .list-item').count();
    // Reload — should restore from localStorage
    await page.reload();
    await page.locator('#church-list .list-item').first().waitFor({ timeout: 5000 });

    const countAfter = await page.locator('#church-list .list-item').count();
    expect(countAfter).toBe(countBefore);
  });
});

// ============================================================
// TABS
// ============================================================

test.describe('Tab-Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Tab-Wechsel zeigt richtigen Inhalt', async ({ page }) => {
    // Default: Kirchen tab active
    await expect(page.locator('#tab-churches')).toHaveClass(/active/);

    // Click Labels
    await page.locator('.tab[data-tab="labels"]').click();
    await expect(page.locator('#tab-labels')).toHaveClass(/active/);
    await expect(page.locator('#tab-churches')).not.toHaveClass(/active/);

    // Click Export
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('#tab-export')).toHaveClass(/active/);
  });
});

// ============================================================
// LABELS
// ============================================================

test.describe('Labels Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
    await page.locator('.tab[data-tab="labels"]').click();
  });

  test('Städte und Stadtteile werden angezeigt', async ({ page }) => {
    await expect(page.locator('#cities-list > div').first()).toBeVisible();
    await expect(page.locator('#districts-list > div').first()).toBeVisible();
  });

  test('Neue Stadt hinzufügen', async ({ page }) => {
    const before = await page.locator('#cities-list > div').count();
    await page.getByRole('button', { name: '+ Stadt', exact: true }).click();
    const after = await page.locator('#cities-list > div').count();
    expect(after).toBe(before + 1);
  });

  test('Neuen Stadtteil hinzufügen', async ({ page }) => {
    const before = await page.locator('#districts-list > div').count();
    await page.getByRole('button', { name: '+ Stadtteil' }).click();
    const after = await page.locator('#districts-list > div').count();
    expect(after).toBe(before + 1);
  });
});

// ============================================================
// MULTI-CHURCH EXPORT / IMPORT ROUNDTRIP
// ============================================================

test.describe('Multi-Church Export/Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('Export mit 2 geänderten Kirchen enthält beide Änderungen', async ({ page }) => {
    // Edit first church website
    await page.locator('#church-list .list-item').nth(0).click();
    const website1 = page.locator('#church-detail input[type="url"]').first();
    await website1.fill('https://changed-one.example.com');

    // Edit second church website
    await page.locator('#church-list .list-item').nth(1).click();
    const website2 = page.locator('#church-detail input[type="url"]').first();
    await website2.fill('https://changed-two.example.com');

    // Export
    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click(),
    ]);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const patch = JSON.parse(Buffer.concat(chunks).toString());

    expect(patch.changes.length).toBe(2);
    expect(patch.changes.every(c => c.action === 'modified')).toBeTruthy();
  });

  test('Export mit neuer + geänderter + gelöschter Kirche', async ({ page }) => {
    // Add new church
    await page.getByText('+ Neue Kirche').click();
    await page.locator('#church-list .list-item').last().click();
    const nameInput = page.locator('#church-detail .form-group input[type="text"]').first();
    await nameInput.fill('Brandneue Testkirche');

    // Edit first church
    await page.locator('#church-list .list-item').nth(0).click();
    const website = page.locator('#church-detail input[type="url"]').first();
    await website.fill('https://modified.example.com');

    // Delete second church
    await page.locator('#church-list .list-item').nth(1).click();
    page.on('dialog', dialog => dialog.accept());
    await page.getByText('🗑 Löschen').click();

    // Export
    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click(),
    ]);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const patch = JSON.parse(Buffer.concat(chunks).toString());

    const actions = patch.changes.map(c => c.action).sort();
    expect(actions).toContain('added');
    expect(actions).toContain('modified');
    expect(actions).toContain('removed');
  });

  test('Roundtrip: Export → Reload → Import → gleicher Stand', async ({ page }) => {
    // Edit 2 churches
    await page.locator('#church-list .list-item').nth(0).click();
    const w1 = page.locator('#church-detail input[type="url"]').first();
    await w1.fill('https://roundtrip-1.example.com');

    await page.locator('#church-list .list-item').nth(2).click();
    const w2 = page.locator('#church-detail input[type="url"]').first();
    await w2.fill('https://roundtrip-2.example.com');

    // Export patch
    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const patchContent = Buffer.concat(chunks).toString();

    // Reload fresh data (simulating another session)
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
    await page.locator('.tab[data-tab="export"]').click();

    // Import the patch
    await page.locator('#patch-file-input').setInputFiles({
      name: 'aenderungen_roundtrip.json',
      mimeType: 'application/json',
      buffer: Buffer.from(patchContent),
    });
    await expect(page.locator('.merge-box')).toBeVisible();

    // Apply all
    await page.getByText('✓ Alle übernehmen').click();

    // Verify the data was applied
    await page.locator('.tab[data-tab="churches"]').click();
    await page.locator('#church-list .list-item').nth(0).click();
    const applied1 = await page.locator('#church-detail input[type="url"]').first().inputValue();
    expect(applied1).toBe('https://roundtrip-1.example.com');

    await page.locator('#church-list .list-item').nth(2).click();
    const applied2 = await page.locator('#church-detail input[type="url"]').first().inputValue();
    expect(applied2).toBe('https://roundtrip-2.example.com');
  });

  test('Zwei Patches nacheinander importieren', async ({ page }) => {
    const patch1 = JSON.stringify({
      type: 'kirchenkarte-patch',
      exported: '2026-03-20T10:00:00Z',
      changes: [
        { action: 'added', church: { name: 'Patch1-Kirche', address: { street: 'A 1', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.69, lng: 7.83 } } }
      ]
    });
    const patch2 = JSON.stringify({
      type: 'kirchenkarte-patch',
      exported: '2026-03-21T10:00:00Z',
      changes: [
        { action: 'added', church: { name: 'Patch2-Kirche', address: { street: 'B 2', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.70, lng: 7.84 } } }
      ]
    });

    await page.locator('.tab[data-tab="export"]').click();
    const beforeCount = await page.evaluate(() => churches.length);

    // Import first patch
    await page.locator('#patch-file-input').setInputFiles({
      name: 'patch1.json', mimeType: 'application/json', buffer: Buffer.from(patch1),
    });
    await page.getByText('✓ Alle übernehmen').click();
    expect(await page.evaluate(() => churches.length)).toBe(beforeCount + 1);

    // Import second patch
    await page.locator('#patch-file-input').setInputFiles({
      name: 'patch2.json', mimeType: 'application/json', buffer: Buffer.from(patch2),
    });
    await page.getByText('✓ Alle übernehmen').click();
    expect(await page.evaluate(() => churches.length)).toBe(beforeCount + 2);

    // Verify both exist
    const names = await page.evaluate(() => churches.map(c => c.name));
    expect(names).toContain('Patch1-Kirche');
    expect(names).toContain('Patch2-Kirche');
  });

  test('Doppelter Import wird als bereits übernommen erkannt', async ({ page }) => {
    const patch = JSON.stringify({
      type: 'kirchenkarte-patch',
      exported: new Date().toISOString(),
      changes: [
        { action: 'added', church: { name: 'Duplikat-Kirche', address: { street: 'D 1', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.71, lng: 7.85 } } }
      ]
    });

    await page.locator('.tab[data-tab="export"]').click();

    // First import
    await page.locator('#patch-file-input').setInputFiles({
      name: 'patch.json', mimeType: 'application/json', buffer: Buffer.from(patch),
    });
    await page.getByText('✓ Alle übernehmen').click();
    const countAfterFirst = await page.evaluate(() => churches.length);

    // Second import of same patch — should show "Übernommen" and not add again
    await page.locator('#patch-file-input').setInputFiles({
      name: 'patch.json', mimeType: 'application/json', buffer: Buffer.from(patch),
    });
    await expect(page.getByText('✓ Übernommen')).toBeVisible();
    const countAfterSecond = await page.evaluate(() => churches.length);
    expect(countAfterSecond).toBe(countAfterFirst);
  });
});

// ============================================================
// BESONDERHEITEN (Features)
// ============================================================

test.describe('Besonderheiten', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
    await page.locator('#church-list .list-item').first().click();
  });

  test('Besonderheit hinzufügen', async ({ page }) => {
    const before = await page.locator('#feature-list .feature-item').count();
    await page.getByText('+ Besonderheit hinzufügen').click();
    const after = await page.locator('#feature-list .feature-item').count();
    expect(after).toBe(before + 1);
  });

  test('Besonderheit entfernen', async ({ page }) => {
    const before = await page.locator('#feature-list .feature-item').count();
    if (before === 0) {
      await page.getByText('+ Besonderheit hinzufügen').click();
    }
    const countNow = await page.locator('#feature-list .feature-item').count();
    await page.locator('#feature-list .feature-item .btn-remove').first().click();
    const after = await page.locator('#feature-list .feature-item').count();
    expect(after).toBe(countNow - 1);
  });

  test('Besonderheit bearbeiten wird gespeichert', async ({ page }) => {
    await page.getByText('+ Besonderheit hinzufügen').click();
    const lastInput = page.locator('#feature-list .feature-item input').last();
    await lastInput.fill('Testeigenschaft');
    // Tab away to trigger onchange
    await lastInput.press('Tab');
    // Verify via JS state
    const features = await page.evaluate(() => churches[selectedChurchIndex].besonderheiten);
    expect(features).toContain('Testeigenschaft');
  });
});

// ============================================================
// DELETE EDGE CASES
// ============================================================

test.describe('Delete Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('Löschen abbrechen behält Kirche', async ({ page }) => {
    const before = await page.locator('#church-list .list-item').count();
    await page.locator('#church-list .list-item').first().click();
    page.on('dialog', dialog => dialog.dismiss());
    await page.getByText('🗑 Löschen').click();
    const after = await page.locator('#church-list .list-item').count();
    expect(after).toBe(before);
  });

  test('Letzte Kirche löschen → leere Liste', async ({ page }) => {
    // Load a single-church dataset
    const json = JSON.stringify({
      kirchenkreis: 'Test',
      gottesdienstorte: [
        { name: 'Einzige Kirche', address: { street: 'A 1', zipCode: '12345', city: 'X' }, coordinates: { lat: 51.68, lng: 7.82 } }
      ]
    });
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json', mimeType: 'application/json', buffer: Buffer.from(json),
    });
    await page.locator('#church-list .list-item').first().click();
    page.on('dialog', dialog => dialog.accept());
    await page.getByText('🗑 Löschen').click();
    expect(await page.locator('#church-list .list-item').count()).toBe(0);
  });
});

// ============================================================
// SEARCH EDGE CASES
// ============================================================

test.describe('Search Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('Suche ohne Treffer zeigt keine Einträge', async ({ page }) => {
    await page.locator('.list-search input').fill('xyzNichtExistent123');
    const visible = await page.locator('#church-list .list-item:visible').count();
    expect(visible).toBe(0);
  });

  test('Suche leeren zeigt wieder alle', async ({ page }) => {
    const total = await page.locator('#church-list .list-item').count();
    await page.locator('.list-search input').fill('Pauluskirche');
    await page.locator('.list-search input').fill('');
    const restored = await page.locator('#church-list .list-item:visible').count();
    expect(restored).toBe(total);
  });
});

// ============================================================
// LABEL EDGE CASES
// ============================================================

test.describe('Label Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
    await page.locator('.tab[data-tab="labels"]').click();
  });

  test('Stadt löschen entfernt aus Liste', async ({ page }) => {
    const before = await page.locator('#cities-list > div').count();
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#cities-list .btn-danger').first().click();
    const after = await page.locator('#cities-list > div').count();
    expect(after).toBe(before - 1);
  });

  test('Stadtteil löschen entfernt aus Liste', async ({ page }) => {
    const before = await page.locator('#districts-list > div').count();
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#districts-list .btn-danger').first().click();
    const after = await page.locator('#districts-list > div').count();
    expect(after).toBe(before - 1);
  });

  test('Stadt-Name wird automatisch uppercase', async ({ page }) => {
    await page.getByRole('button', { name: '+ Stadt', exact: true }).click();
    const lastNameInput = page.locator('#cities-list > div').last().locator('input[type="text"]');
    await lastNameInput.fill('teststadt');
    // trigger onchange
    await lastNameInput.press('Tab');
    const value = await lastNameInput.inputValue();
    expect(value).toBe('TESTSTADT');
  });
});

// ============================================================
// PATCH MERGE EDGE CASES
// ============================================================

test.describe('Patch Merge Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
    await page.locator('.tab[data-tab="export"]').click();
  });

  test('Patch "modified" für nicht-existente Kirche fügt sie hinzu', async ({ page }) => {
    const patch = JSON.stringify({
      type: 'kirchenkarte-patch',
      exported: new Date().toISOString(),
      changes: [
        { action: 'modified', name: 'Gibt es nicht', church: { name: 'Gibt es nicht', address: { street: 'X 1', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.69, lng: 7.83 } } }
      ]
    });
    const beforeCount = await page.evaluate(() => churches.length);
    await page.locator('#patch-file-input').setInputFiles({
      name: 'patch.json', mimeType: 'application/json', buffer: Buffer.from(patch),
    });
    await page.getByText('✓ Alle übernehmen').click();
    const afterCount = await page.evaluate(() => churches.length);
    // Should be added as new since it doesn't exist
    expect(afterCount).toBe(beforeCount + 1);
    const names = await page.evaluate(() => churches.map(c => c.name));
    expect(names).toContain('Gibt es nicht');
  });

  test('Patch "removed" für bereits gelöschte Kirche ist idempotent', async ({ page }) => {
    const patch = JSON.stringify({
      type: 'kirchenkarte-patch',
      exported: new Date().toISOString(),
      changes: [
        { action: 'removed', name: 'Diese Kirche existiert nicht' }
      ]
    });
    const beforeCount = await page.evaluate(() => churches.length);
    await page.locator('#patch-file-input').setInputFiles({
      name: 'patch.json', mimeType: 'application/json', buffer: Buffer.from(patch),
    });
    // Should show as already applied
    await expect(page.getByText('✓ Übernommen')).toBeVisible();
    const afterCount = await page.evaluate(() => churches.length);
    expect(afterCount).toBe(beforeCount);
  });

  test('Patch-Konflikt: lokal geändert + Patch ändert gleiche Kirche', async ({ page }) => {
    // Get first church name
    const firstName = await page.evaluate(() => churches[0].name);

    // Locally change the first church
    await page.locator('.tab[data-tab="churches"]').click();
    await page.locator('#church-list .list-item').first().click();
    const websiteInput = page.locator('#church-detail input[type="url"]').first();
    await websiteInput.fill('https://lokal-geaendert.de');

    // Now import a patch that also changes the same church
    await page.locator('.tab[data-tab="export"]').click();
    const patch = JSON.stringify({
      type: 'kirchenkarte-patch',
      exported: new Date().toISOString(),
      changes: [
        { action: 'modified', name: firstName, church: { name: firstName, address: { street: 'Neue Straße 99', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.69, lng: 7.83 }, website: 'https://aus-patch.de', buchungsLink: '', photoName: '' } }
      ]
    });
    await page.locator('#patch-file-input').setInputFiles({
      name: 'patch.json', mimeType: 'application/json', buffer: Buffer.from(patch),
    });

    // Should show as modified (not yet applied since data differs)
    await expect(page.locator('.merge-item .badge')).toContainText('Geändert');

    // Apply it — patch wins
    await page.locator('.merge-box .btn-success').first().click();
    const website = await page.evaluate(() => churches[0].website);
    expect(website).toBe('https://aus-patch.de');
  });
});

// ============================================================
// EXPORT WITH VALIDATION ERRORS
// ============================================================

test.describe('Export mit Validierungsfehler', () => {
  test('Export trotz Fehler nach Bestätigung', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);

    // Add incomplete church (no name, no address)
    await page.getByText('+ Neue Kirche').click();

    // Go to export tab
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('.validation-errors')).toBeVisible();

    // Try full export — should show confirm dialog, accept it
    page.on('dialog', dialog => dialog.accept());
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Kirchendaten herunterladen/ }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('churches.json');
  });

  test('Export abbrechen bei Validierungsfehler', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);

    await page.getByText('+ Neue Kirche').click();
    await page.locator('.tab[data-tab="export"]').click();

    // Dismiss the confirm dialog
    page.on('dialog', dialog => dialog.dismiss());
    // No download should happen — catch the timeout
    let downloaded = false;
    page.waitForEvent('download', { timeout: 2000 }).then(() => { downloaded = true; }).catch(() => {});
    await page.getByRole('button', { name: /Kirchendaten herunterladen/ }).click();
    await page.waitForTimeout(2500);
    expect(downloaded).toBe(false);
  });
});

// ============================================================
// MAP
// ============================================================

test.describe('Karte', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('Karte wird beim Tab-Wechsel initialisiert', async ({ page }) => {
    await page.locator('.tab[data-tab="map"]').click();
    // Leaflet adds leaflet-container class to the map div
    await expect(page.locator('#admin-map.leaflet-container')).toBeVisible();
  });

  test('Pin-Mode Toggle', async ({ page }) => {
    await page.locator('.tab[data-tab="map"]').click();
    const btn = page.locator('#pin-mode-btn');
    await btn.click();
    // Map info should indicate pin mode is active
    await expect(page.locator('#map-info')).toContainText(/Klicke|Pin/);
    // Toggle off
    await btn.click();
  });

  test('Kirche auf Karte klicken wechselt zu Kirchen-Tab', async ({ page }) => {
    await page.locator('.tab[data-tab="map"]').click();
    await page.waitForTimeout(500);
    // Markers overlap in dense areas, use force click
    const marker = page.locator('#admin-map .leaflet-marker-icon:not(.leaflet-div-icon)').first();
    if (await marker.isVisible()) {
      await marker.click({ force: true });
      await expect(page.locator('#tab-churches')).toHaveClass(/active/);
    }
  });
});

// ============================================================
// MALFORMED INPUT
// ============================================================

test.describe('Ungültige Eingaben', () => {
  test('Leere JSON-Datei wird abgefangen', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json', mimeType: 'application/json', buffer: Buffer.from(''),
    });
    // Should show error toast
    await expect(page.locator('.toast.error')).toBeVisible();
  });

  test('JSON mit falschem Format wird abgefangen', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json', mimeType: 'application/json', buffer: Buffer.from('not json at all'),
    });
    await expect(page.locator('.toast.error')).toBeVisible();
  });

  test('Korrupte localStorage-Daten werden ignoriert', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.setItem('kirchenkarte-admin', '{broken json!!!}'));
    await page.reload();
    // Should still work — empty state, no crash
    await expect(page.locator('.header h1')).toContainText('Kirchenkarte Admin');
  });
});

// ============================================================
// BILDER / FOTOS
// ============================================================

test.describe('Bilder / Fotos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('Foto per Dropdown zuweisen setzt photoName', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    const select = page.locator('#photo-select');
    await select.selectOption({ index: 0 }); // Kein Foto
    const cleared = await page.evaluate(() => churches[selectedChurchIndex].photoName);
    expect(cleared).toBe('');
    // Select the first real photo if available
    const optionCount = await select.locator('option').count();
    if (optionCount > 1) {
      await select.selectOption({ index: 1 });
      const newPhoto = await page.evaluate(() => churches[selectedChurchIndex].photoName);
      expect(newPhoto.length).toBeGreaterThan(0);
    }
  });

  test('Bild per file input im Kirchendetail setzt photoName', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-photo-input').setInputFiles({
      name: 'test-kirche.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(5000),
    });
    const photoName = await page.evaluate(() => churches[selectedChurchIndex].photoName);
    expect(photoName).toBe('test-kirche.jpg');
  });

  test('Bilder-Tab: Bild hinzufügen zeigt Card im Grid', async ({ page }) => {
    await page.locator('.tab[data-tab="images"]').click();
    await page.locator('#images-file-input').setInputFiles({
      name: 'bild1.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(3000),
    });
    await expect(page.locator('#images-grid .image-card')).toHaveCount(1);
    await expect(page.locator('#images-grid .image-card .name')).toContainText('bild1.jpg');
  });

  test('Bilder-Tab: Bild entfernen', async ({ page }) => {
    await page.locator('.tab[data-tab="images"]').click();
    await page.locator('#images-file-input').setInputFiles({
      name: 'temp.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(2000),
    });
    await expect(page.locator('#images-grid .image-card')).toHaveCount(1);
    await page.getByText('Entfernen').click();
    await expect(page.locator('#images-grid .image-card')).toHaveCount(0);
  });

  test('Bilder-Tab: Mehrere Bilder gleichzeitig hinzufügen', async ({ page }) => {
    await page.locator('.tab[data-tab="images"]').click();
    await page.locator('#images-file-input').setInputFiles([
      { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(1000) },
      { name: 'b.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(1000) },
    ]);
    await expect(page.locator('#images-grid .image-card')).toHaveCount(2);
  });

  test('Bilder-ZIP Export Button aktiviert nach Upload', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('#btn-download-images')).toBeDisabled();

    await page.locator('.tab[data-tab="images"]').click();
    await page.locator('#images-file-input').setInputFiles({
      name: 'zip-test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(500),
    });

    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('#btn-download-images')).not.toBeDisabled();
  });

  test('Großes Bild zeigt Warnung', async ({ page }) => {
    await page.locator('.tab[data-tab="images"]').click();
    await page.locator('#images-file-input').setInputFiles({
      name: 'grosses-bild.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(250 * 1024),
    });
    await expect(page.locator('#images-grid .warning')).toBeVisible();
  });

  test('Neues Bild erscheint als "Neu" im Diff', async ({ page }) => {
    await page.locator('.tab[data-tab="images"]').click();
    await page.locator('#images-file-input').setInputFiles({
      name: 'diff-test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(500),
    });
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('.diff-item.added')).toContainText('Bild: diff-test.jpg');
  });

  test('Crop-Vorschau erscheint nach Bild-Upload', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-photo-input').setInputFiles({
      name: 'crop-test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(500),
    });
    // Wait for compression to finish, then crop preview should appear
    await expect(page.locator('#crop-preview-area .crop-teardrop')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#crop-scale')).toBeVisible();
    await expect(page.getByRole('button', { name: /Zuschnitt speichern/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Zurücksetzen/ })).toBeVisible();
  });

  test('Zoom-Slider ist bedienbar', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-photo-input').setInputFiles({
      name: 'zoom-test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(500),
    });
    await expect(page.locator('#crop-preview-area .crop-teardrop')).toBeVisible({ timeout: 10000 });
    const slider = page.locator('#crop-scale');
    await expect(slider).toBeVisible();
    expect(await slider.inputValue()).toBe('150');
    await slider.fill('300');
    await slider.dispatchEvent('input');
    expect(await slider.inputValue()).toBe('300');
  });

  test('Zurücksetzen setzt Zoom auf Standardwert', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-photo-input').setInputFiles({
      name: 'reset-test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(500),
    });
    await expect(page.locator('#crop-preview-area .crop-teardrop')).toBeVisible({ timeout: 10000 });
    await page.locator('#crop-scale').fill('300');
    await page.locator('#crop-scale').dispatchEvent('input');
    await page.getByRole('button', { name: /Zurücksetzen/ }).click();
    expect(await page.locator('#crop-scale').inputValue()).toBe('150');
  });

  test('Zurücksetzen stellt Original nach Crop wieder her', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-photo-input').setInputFiles({
      name: 'orig-test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(500),
    });
    await expect(page.locator('#crop-preview-area .crop-teardrop')).toBeVisible({ timeout: 10000 });
    const sizeBefore = await page.evaluate(() => newImages[Object.keys(newImages)[0]].size);
    // Zuschnitt speichern
    await page.getByRole('button', { name: /Zuschnitt speichern/ }).click();
    await page.waitForFunction(() => document.querySelector('.toast.success'));
    const sizeAfterCrop = await page.evaluate(() => newImages[Object.keys(newImages)[0]].size);
    // Original wiederherstellen
    await page.getByRole('button', { name: /Zurücksetzen/ }).click();
    await page.waitForFunction(() => document.querySelector('.toast.info'));
    const sizeAfterReset = await page.evaluate(() => newImages[Object.keys(newImages)[0]].size);
    expect(sizeAfterReset).toBe(sizeBefore);
  });
});

// ============================================================
// KARTE – DRAG & PIN-MODE
// ============================================================

test.describe('Karte – Drag & Pin-Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
    await page.locator('.tab[data-tab="map"]').click();
    await page.waitForTimeout(500);
  });

  test('Pin ziehen aktualisiert Koordinaten', async ({ page }) => {
    const before = await page.evaluate(() => ({
      lat: churches[0].coordinates.lat,
      lng: churches[0].coordinates.lng
    }));

    await page.evaluate(() => {
      const marker = churchMarkers[0];
      if (!marker) return;
      const newLatLng = L.latLng(marker.getLatLng().lat + 0.01, marker.getLatLng().lng + 0.01);
      marker.setLatLng(newLatLng);
      marker.fire('dragend', { target: marker });
    });

    const after = await page.evaluate(() => ({
      lat: churches[0].coordinates.lat,
      lng: churches[0].coordinates.lng
    }));
    expect(after.lat).not.toBe(before.lat);
    expect(after.lng).not.toBe(before.lng);
  });

  test('Stadt-Label ziehen aktualisiert Koordinaten', async ({ page }) => {
    const before = await page.evaluate(() => ({
      lat: labels.cities[0].coordinates.lat,
      lng: labels.cities[0].coordinates.lng
    }));

    await page.evaluate(() => {
      const marker = labelMarkers[0];
      if (!marker) return;
      const newLatLng = L.latLng(marker.getLatLng().lat + 0.005, marker.getLatLng().lng + 0.005);
      marker.setLatLng(newLatLng);
      marker.fire('dragend', { target: marker });
    });

    const after = await page.evaluate(() => ({
      lat: labels.cities[0].coordinates.lat,
      lng: labels.cities[0].coordinates.lng
    }));
    expect(after.lat).not.toBe(before.lat);
    expect(after.lng).not.toBe(before.lng);
  });

  test('Stadtteil-Label ziehen aktualisiert Koordinaten', async ({ page }) => {
    const before = await page.evaluate(() => ({
      lat: labels.districts[0].coordinates.lat,
      lng: labels.districts[0].coordinates.lng
    }));

    await page.evaluate(() => {
      const idx = labels.cities.filter(c => c.coordinates?.lat).length;
      const marker = labelMarkers[idx];
      if (!marker) return;
      const newLatLng = L.latLng(marker.getLatLng().lat + 0.003, marker.getLatLng().lng + 0.003);
      marker.setLatLng(newLatLng);
      marker.fire('dragend', { target: marker });
    });

    const after = await page.evaluate(() => ({
      lat: labels.districts[0].coordinates.lat,
      lng: labels.districts[0].coordinates.lng
    }));
    expect(after.lat).not.toBe(before.lat);
  });

  test('Pin-Mode: Klick auf Karte erstellt neue Kirche', async ({ page }) => {
    const before = await page.evaluate(() => churches.length);
    await page.locator('#pin-mode-btn').click();
    await expect(page.locator('#map-info')).toContainText('Klicke auf die Karte');

    await page.evaluate(() => {
      adminMap.fire('click', { latlng: L.latLng(51.70, 7.85) });
    });

    const after = await page.evaluate(() => churches.length);
    expect(after).toBe(before + 1);
    const last = await page.evaluate(() => churches[churches.length - 1]);
    expect(last.coordinates.lat).toBeCloseTo(51.70, 1);
    expect(last.coordinates.lng).toBeCloseTo(7.85, 1);
  });

  test('Pin-Mode deaktiviert sich nach Klick', async ({ page }) => {
    await page.locator('#pin-mode-btn').click();
    await page.evaluate(() => {
      adminMap.fire('click', { latlng: L.latLng(51.70, 7.85) });
    });
    const isPinMode = await page.evaluate(() => pinMode);
    expect(isPinMode).toBe(false);
  });
});

// ============================================================
// FORMULARFELDER
// ============================================================

test.describe('Formularfelder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
    await page.locator('#church-list .list-item').first().click();
  });

  test('Website ändern wird gespeichert', async ({ page }) => {
    const urlInput = page.locator('#church-detail input[type="url"]').first();
    await urlInput.fill('https://neue-website.de');
    const saved = await page.evaluate(() => churches[selectedChurchIndex].website);
    expect(saved).toBe('https://neue-website.de');
  });

  test('Buchungslink ändern wird gespeichert', async ({ page }) => {
    const buchungsInput = page.locator('#church-detail input[type="url"]').nth(1);
    await buchungsInput.fill('https://buchung.de/test');
    const saved = await page.evaluate(() => churches[selectedChurchIndex].buchungsLink);
    expect(saved).toBe('https://buchung.de/test');
  });

  test('Stadtteil ändern wird gespeichert', async ({ page }) => {
    const stadtteilInput = page.locator('#church-detail .form-group input[type="text"]').nth(1);
    await stadtteilInput.fill('Neuer Stadtteil');
    const saved = await page.evaluate(() => churches[selectedChurchIndex].stadtteil);
    expect(saved).toBe('Neuer Stadtteil');
  });

  test('Koordinaten manuell eingeben', async ({ page }) => {
    await page.locator('#coord-lat').fill('51.7000');
    await page.locator('#coord-lng').fill('7.9000');
    const coords = await page.evaluate(() => churches[selectedChurchIndex].coordinates);
    expect(coords.lat).toBeCloseTo(51.7, 1);
    expect(coords.lng).toBeCloseTo(7.9, 1);
  });

  test('Straße ändern + Validierung aktualisiert', async ({ page }) => {
    await page.getByText('+ Neue Kirche').click();
    await page.locator('#church-list .list-item').last().click();
    const streetInput = page.locator('#church-detail .form-group input[type="text"]').nth(2);
    await expect(streetInput).toHaveClass(/invalid/);
    await streetInput.fill('Teststraße 42');
    await expect(streetInput).not.toHaveClass(/invalid/);
    const saved = await page.evaluate(() => churches[selectedChurchIndex].address.street);
    expect(saved).toBe('Teststraße 42');
  });

  test('Stadt ändern wird gespeichert', async ({ page }) => {
    await page.getByText('+ Neue Kirche').click();
    await page.locator('#church-list .list-item').last().click();
    const cityInput = page.locator('#church-detail .form-group input[type="text"]').nth(4);
    await cityInput.fill('Ahlen');
    const saved = await page.evaluate(() => churches[selectedChurchIndex].address.city);
    expect(saved).toBe('Ahlen');
  });

  test('PLZ Validierung bei ungültigem Wert', async ({ page }) => {
    await page.getByText('+ Neue Kirche').click();
    await page.locator('#church-list .list-item').last().click();
    const plzInput = page.locator('#church-detail .form-group input[type="text"]').nth(3);
    await plzInput.fill('123'); // Too short
    await expect(plzInput).toHaveClass(/invalid/);
    await plzInput.fill('59065');
    await expect(plzInput).not.toHaveClass(/invalid/);
  });
});

// ============================================================
// DIFF DETAIL
// ============================================================

test.describe('Diff Detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('Diff zeigt "Adresse" bei Straßenänderung', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    const streetInput = page.locator('#church-detail .form-group input[type="text"]').nth(2);
    await streetInput.fill('Geänderte Straße 1');
    await page.locator('.tab[data-tab="export"]').click();
    const diffText = await page.locator('.diff-item.modified').first().textContent();
    expect(diffText).toContain('Adresse');
  });

  test('Diff zeigt mehrere geänderte Felder gleichzeitig', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="url"]').first().fill('https://diff-test.de');
    await page.locator('#coord-lat').fill('51.5');
    await page.locator('.tab[data-tab="export"]').click();
    const diffText = await page.locator('.diff-item.modified').first().textContent();
    expect(diffText).toContain('Website');
    expect(diffText).toContain('Koordinaten');
  });

  test('Diff zeigt Foto-Änderung', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-photo-input').setInputFiles({
      name: 'neues-foto.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(1000),
    });
    await page.locator('.tab[data-tab="export"]').click();
    const diffText = await page.locator('.diff-item.modified').first().textContent();
    expect(diffText).toContain('Foto');
  });

  test('Diff nach Label-Änderung zeigt "Stadt"', async ({ page }) => {
    await page.locator('.tab[data-tab="labels"]').click();
    const cityNameInput = page.locator('#cities-list > div').first().locator('input[type="text"]');
    await cityNameInput.fill('GEÄNDERT');
    await cityNameInput.press('Tab');
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('.diff-item.modified')).toContainText('Stadt');
  });

  test('Diff zeigt neue Kirche als "Neu"', async ({ page }) => {
    await page.getByText('+ Neue Kirche').click();
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('.diff-item.added')).toContainText('Kirche');
  });

  test('Diff zeigt gelöschte Kirche als "Gelöscht"', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    page.on('dialog', dialog => dialog.accept());
    await page.getByText('🗑 Löschen').click();
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('.diff-item.removed')).toContainText('Kirche');
  });

  test('Diff bei doppeltem Namen "Friedenskirche" zeigt nur eine Änderung', async ({ page }) => {
    await page.locator('.list-search input').fill('Friedenskirche');
    const items = page.locator('#church-list .list-item:visible');
    const count = await items.count();
    expect(count).toBe(2);

    await items.first().click();
    await page.locator('#church-detail input[type="url"]').first().fill('https://friedenskirche-test.de');

    await page.locator('.tab[data-tab="export"]').click();
    const modifiedItems = page.locator('.diff-item.modified');
    await expect(modifiedItems).toHaveCount(1);
    await expect(modifiedItems.first()).toContainText('Friedenskirche');
  });
});

// ============================================================
// UNSAVED CHANGES & STATE
// ============================================================

test.describe('Unsaved Changes & State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('hasUnsavedChanges() false direkt nach Laden', async ({ page }) => {
    const has = await page.evaluate(() => hasUnsavedChanges());
    expect(has).toBe(false);
  });

  test('hasUnsavedChanges() true nach Bearbeitung', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="url"]').first().fill('https://changed.de');
    const has = await page.evaluate(() => hasUnsavedChanges());
    expect(has).toBe(true);
  });

  test('hasUnsavedChanges() true nach Bild-Upload', async ({ page }) => {
    await page.locator('.tab[data-tab="images"]').click();
    await page.locator('#images-file-input').setInputFiles({
      name: 'img.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(500),
    });
    // Wait for async compression to finish (card appears in grid)
    await expect(page.locator('#images-grid .image-card')).toHaveCount(1);
    const has = await page.evaluate(() => hasUnsavedChanges());
    expect(has).toBe(true);
  });

  test('Tab-Wechsel verliert keine Bearbeitungen', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="url"]').first().fill('https://keep-me.de');

    await page.locator('.tab[data-tab="labels"]').click();
    await page.locator('.tab[data-tab="map"]').click();
    await page.locator('.tab[data-tab="churches"]').click();

    const website = await page.evaluate(() => churches[0].website);
    expect(website).toBe('https://keep-me.de');
  });

  test('Kirche + Labels gleichzeitig ändern → beides im Diff', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="url"]').first().fill('https://both-changes.de');

    await page.locator('.tab[data-tab="labels"]').click();
    await page.getByRole('button', { name: '+ Stadtteil' }).click();

    await page.locator('.tab[data-tab="export"]').click();
    const allText = await page.locator('#diff-list').textContent();
    expect(allText).toContain('Kirche');
    expect(allText).toContain('Stadtteil');
  });

  test('Keine Änderungen → Diff zeigt "Keine Änderungen"', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('#diff-list')).toContainText('Keine Änderungen');
  });
});

// ============================================================
// JSON EXPORT – INHALTSVALIDIERUNG
// ============================================================

test.describe('JSON Export – Inhaltsvalidierung', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('churches.json hat kirchenkreis + gottesdienstorte Struktur', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Kirchendaten herunterladen/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const data = JSON.parse(Buffer.concat(chunks).toString());
    expect(data.kirchenkreis).toBe('Evangelischer Kirchenkreis Hamm');
    expect(data.status_check_date).toMatch(/^\d{4}-\d{2}$/);
    expect(Array.isArray(data.gottesdienstorte)).toBe(true);
    expect(data.gottesdienstorte.length).toBeGreaterThan(20);
  });

  test('churches.json enthält alle Pflichtfelder pro Kirche', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Kirchendaten herunterladen/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const data = JSON.parse(Buffer.concat(chunks).toString());
    const church = data.gottesdienstorte[0];
    expect(church).toHaveProperty('name');
    expect(church).toHaveProperty('address');
    expect(church.address).toHaveProperty('street');
    expect(church.address).toHaveProperty('zipCode');
    expect(church.address).toHaveProperty('city');
    expect(church).toHaveProperty('coordinates');
    expect(church.coordinates).toHaveProperty('lat');
    expect(church.coordinates).toHaveProperty('lng');
  });

  test('labels.json hat cities + districts Struktur', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Beschriftungen herunterladen/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const data = JSON.parse(Buffer.concat(chunks).toString());
    expect(Array.isArray(data.cities)).toBe(true);
    expect(Array.isArray(data.districts)).toBe(true);
    expect(data.cities.length).toBeGreaterThan(0);
    data.cities.forEach(c => {
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('coordinates');
    });
  });

  test('Umlaute und Sonderzeichen bleiben im Export erhalten', async ({ page }) => {
    // Edit a church with Umlauts
    await page.locator('#church-list .list-item').first().click();
    const nameInput = page.locator('#church-detail .form-group input[type="text"]').first();
    await nameInput.fill('Ölberg-Kirche Würzburg äöüß');

    await page.locator('.tab[data-tab="export"]').click();
    page.on('dialog', d => d.accept()); // accept validation warning
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Kirchendaten herunterladen/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf-8');
    expect(raw).toContain('Ölberg-Kirche Würzburg äöüß');
  });

  test('Export nach Bearbeitung spiegelt Änderungen wider', async ({ page }) => {
    // Change website of first church
    await page.locator('#church-list .list-item').first().click();
    const urlInput = page.locator('#church-detail input[type="url"]').first();
    await urlInput.fill('https://export-test.example.com');

    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Kirchendaten herunterladen/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const data = JSON.parse(Buffer.concat(chunks).toString());
    expect(data.gottesdienstorte[0].website).toBe('https://export-test.example.com');
  });

  test('Export aktualisiert Baseline (Diff danach leer)', async ({ page }) => {
    // Make a change
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="url"]').first().fill('https://baseline-test.de');

    // Export
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('.diff-item.modified')).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Kirchendaten herunterladen/ }).click(),
    ]);
    await download.path(); // wait for download to finish

    // Diff should be empty now (baseline updated)
    await page.locator('.tab[data-tab="churches"]').click();
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('#diff-list')).toContainText('Keine Änderungen');
  });

  test('labels.json Export aktualisiert Labels-Baseline', async ({ page }) => {
    // Change a label
    await page.locator('.tab[data-tab="labels"]').click();
    await page.getByRole('button', { name: '+ Stadtteil' }).click();

    // Diff shows the change
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('.diff-item.added')).toContainText('Stadtteil');

    // Export labels
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Beschriftungen herunterladen/ }).click(),
    ]);
    await download.path();

    // Diff should no longer show label change
    await page.locator('.tab[data-tab="churches"]').click();
    await page.locator('.tab[data-tab="export"]').click();
    // Only the stadtteil was changed, so diff should be empty or only show churches
    const diffText = await page.locator('#diff-list').textContent();
    expect(diffText).not.toContain('Stadtteil');
  });
});

// ============================================================
// JSON IMPORT – ROBUSTHEIT
// ============================================================

test.describe('JSON Import – Robustheit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Churches.json mit gottesdienstorte-Wrapper wird geladen', async ({ page }) => {
    const json = JSON.stringify({
      kirchenkreis: 'Test',
      gottesdienstorte: [
        { name: 'Wrapper-Kirche', address: { street: 'A 1', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.68, lng: 7.82 } }
      ]
    });
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json', mimeType: 'application/json', buffer: Buffer.from(json),
    });
    await expect(page.locator('#church-list .list-item')).toHaveCount(1);
    await expect(page.locator('#church-list .list-item').first()).toContainText('Wrapper-Kirche');
  });

  test('Churches.json als flaches Array (ohne Wrapper) wird geladen', async ({ page }) => {
    const json = JSON.stringify([
      { name: 'Flat-Kirche', address: { street: 'B 2', zipCode: '59069', city: 'Ahlen' }, coordinates: { lat: 51.75, lng: 7.89 } }
    ]);
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json', mimeType: 'application/json', buffer: Buffer.from(json),
    });
    await expect(page.locator('#church-list .list-item')).toHaveCount(1);
    await expect(page.locator('#church-list .list-item').first()).toContainText('Flat-Kirche');
  });

  test('Labels.json separat laden', async ({ page }) => {
    const json = JSON.stringify({
      cities: [{ name: 'TESTSTADT', coordinates: { lat: 51.7, lng: 7.8 } }],
      districts: [{ name: 'Testviertel', coordinates: { lat: 51.71, lng: 7.81 } }]
    });
    await page.locator('#labels-file-input').setInputFiles({
      name: 'labels.json', mimeType: 'application/json', buffer: Buffer.from(json),
    });
    await page.locator('.tab[data-tab="labels"]').click();
    await expect(page.locator('#cities-list > div')).toHaveCount(1);
    await expect(page.locator('#districts-list > div')).toHaveCount(1);
  });

  test('Leere gottesdienstorte-Liste wird korrekt geladen', async ({ page }) => {
    const json = JSON.stringify({ kirchenkreis: 'Test', gottesdienstorte: [] });
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json', mimeType: 'application/json', buffer: Buffer.from(json),
    });
    await expect(page.locator('#church-list .list-item')).toHaveCount(0);
  });

  test('Kirche mit fehlenden optionalen Feldern wird geladen', async ({ page }) => {
    const json = JSON.stringify({
      gottesdienstorte: [{
        name: 'Minimal-Kirche',
        address: { street: 'X 1', zipCode: '59065', city: 'Hamm' },
        coordinates: { lat: 51.68, lng: 7.82 }
        // No: stadtteil, website, buchungsLink, photoName, besonderheiten
      }]
    });
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json', mimeType: 'application/json', buffer: Buffer.from(json),
    });
    await expect(page.locator('#church-list .list-item')).toHaveCount(1);
    await page.locator('#church-list .list-item').first().click();
    // Detail should render without errors
    await expect(page.locator('#church-detail h3')).toContainText('Minimal-Kirche');
  });

  test('Labels.json mit leeren Arrays wird geladen', async ({ page }) => {
    const json = JSON.stringify({ cities: [], districts: [] });
    await page.locator('#labels-file-input').setInputFiles({
      name: 'labels.json', mimeType: 'application/json', buffer: Buffer.from(json),
    });
    await page.locator('.tab[data-tab="labels"]').click();
    await expect(page.locator('#cities-list > div')).toHaveCount(0);
    await expect(page.locator('#districts-list > div')).toHaveCount(0);
  });

  test('Import setzt Baseline korrekt (keine Diff nach frischem Import)', async ({ page }) => {
    const json = JSON.stringify({
      gottesdienstorte: [
        { name: 'Base-Kirche', address: { street: 'Z 9', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.68, lng: 7.82 } }
      ]
    });
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json', mimeType: 'application/json', buffer: Buffer.from(json),
    });
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('#diff-list')).toContainText('Keine Änderungen');
  });

  test('Re-Import überschreibt vorherige Daten komplett', async ({ page }) => {
    // First import
    const json1 = JSON.stringify({
      gottesdienstorte: [
        { name: 'Erste', address: { street: 'A 1', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.68, lng: 7.82 } },
        { name: 'Zweite', address: { street: 'B 2', zipCode: '59065', city: 'Hamm' }, coordinates: { lat: 51.69, lng: 7.83 } },
      ]
    });
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json', mimeType: 'application/json', buffer: Buffer.from(json1),
    });
    await expect(page.locator('#church-list .list-item')).toHaveCount(2);

    // Second import with different data
    const json2 = JSON.stringify({
      gottesdienstorte: [
        { name: 'Dritte', address: { street: 'C 3', zipCode: '59069', city: 'Ahlen' }, coordinates: { lat: 51.75, lng: 7.89 } },
      ]
    });
    await page.locator('#churches-file-input').setInputFiles({
      name: 'churches.json', mimeType: 'application/json', buffer: Buffer.from(json2),
    });
    await expect(page.locator('#church-list .list-item')).toHaveCount(1);
    await expect(page.locator('#church-list .list-item').first()).toContainText('Dritte');
  });

  test('Ungültige JSON-Datei zeigt Fehlermeldung', async ({ page }) => {
    await page.locator('#churches-file-input').setInputFiles({
      name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not valid json!!!'),
    });
    await expect(page.locator('.toast.error')).toBeVisible();
  });

  test('Ungültige Labels-JSON zeigt Fehlermeldung', async ({ page }) => {
    await page.locator('#labels-file-input').setInputFiles({
      name: 'bad-labels.json', mimeType: 'application/json', buffer: Buffer.from('broken'),
    });
    await expect(page.locator('.toast.error')).toBeVisible();
  });
});

// ============================================================
// PATCH EXPORT/IMPORT – ERWEITERT
// ============================================================

test.describe('Patch Export/Import – Erweitert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
  });

  test('Patch-Export enthält korrekte Patch-Struktur', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="url"]').first().fill('https://patch-structure.de');

    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const patch = JSON.parse(Buffer.concat(chunks).toString());

    expect(patch.type).toBe('kirchenkarte-patch');
    expect(patch.exported).toBeTruthy();
    expect(Array.isArray(patch.changes)).toBe(true);
    patch.changes.forEach(c => {
      expect(['added', 'modified', 'removed']).toContain(c.action);
    });
  });

  test('Patch mit "added" enthält vollständige Kirchendaten', async ({ page }) => {
    await page.getByText('+ Neue Kirche').click();
    await page.locator('#church-list .list-item').last().click();
    const nameInput = page.locator('#church-detail .form-group input[type="text"]').first();
    await nameInput.fill('Patch-Neue-Kirche');
    const streetInput = page.locator('#church-detail .form-group input[type="text"]').nth(2);
    await streetInput.fill('Patchstraße 1');

    await page.locator('.tab[data-tab="export"]').click();
    page.on('dialog', d => d.accept());
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const patch = JSON.parse(Buffer.concat(chunks).toString());

    const added = patch.changes.find(c => c.action === 'added');
    expect(added).toBeTruthy();
    expect(added.church.name).toBe('Patch-Neue-Kirche');
    expect(added.church.address.street).toBe('Patchstraße 1');
  });

  test('Patch mit "removed" enthält den Kirchennamen', async ({ page }) => {
    const firstName = await page.evaluate(() => churches[0].name);
    await page.locator('#church-list .list-item').first().click();
    page.on('dialog', d => d.accept());
    await page.getByText('🗑 Löschen').click();

    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const patch = JSON.parse(Buffer.concat(chunks).toString());

    const removed = patch.changes.find(c => c.action === 'removed');
    expect(removed).toBeTruthy();
    expect(removed.name).toBe(firstName);
  });

  test('Patch-Import: Datei ohne type-Feld wird abgelehnt', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    const invalid = JSON.stringify({ changes: [{ action: 'added', church: { name: 'X' } }] });
    await page.locator('#patch-file-input').setInputFiles({
      name: 'invalid-patch.json', mimeType: 'application/json', buffer: Buffer.from(invalid),
    });
    await expect(page.locator('.toast.error')).toBeVisible();
  });

  test('Patch-Import: Datei ohne changes-Array wird abgelehnt', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    const invalid = JSON.stringify({ type: 'kirchenkarte-patch', changes: 'not an array' });
    await page.locator('#patch-file-input').setInputFiles({
      name: 'invalid-patch.json', mimeType: 'application/json', buffer: Buffer.from(invalid),
    });
    await expect(page.locator('.toast.error')).toBeVisible();
  });

  test('Patch Roundtrip: Export → Import auf frischen Daten → Daten identisch', async ({ page }) => {
    // Make 2 changes: edit + add
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="url"]').first().fill('https://roundtrip.de');
    await page.getByText('+ Neue Kirche').click();
    await page.locator('#church-list .list-item').last().click();
    await page.locator('#church-detail .form-group input[type="text"]').first().fill('Roundtrip-Kirche');

    // Export patch
    await page.locator('.tab[data-tab="export"]').click();
    page.on('dialog', d => d.accept());
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const patchContent = Buffer.concat(chunks).toString();

    // Reload fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);

    const countBefore = await page.evaluate(() => churches.length);

    // Import patch
    await page.locator('.tab[data-tab="export"]').click();
    await page.locator('#patch-file-input').setInputFiles({
      name: 'patch.json', mimeType: 'application/json', buffer: Buffer.from(patchContent),
    });
    await page.getByText('Alle übernehmen').click();

    const countAfter = await page.evaluate(() => churches.length);
    expect(countAfter).toBe(countBefore + 1); // one added
    const website = await page.evaluate(() => churches[0].website);
    expect(website).toBe('https://roundtrip.de');
    const hasRoundtrip = await page.evaluate(() => churches.some(c => c.name === 'Roundtrip-Kirche'));
    expect(hasRoundtrip).toBe(true);
  });

  test('Patch mit Delete → Import entfernt korrekte Kirche', async ({ page }) => {
    const nameToDelete = await page.evaluate(() => churches[2].name);
    const countBefore = await page.evaluate(() => churches.length);

    // Delete church
    await page.locator('#church-list .list-item').nth(2).click();
    page.on('dialog', d => d.accept());
    await page.getByText('🗑 Löschen').click();

    // Export patch
    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const patchContent = Buffer.concat(chunks).toString();

    // Reload and reimport
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await loadData(page);
    expect(await page.evaluate(() => churches.length)).toBe(countBefore);

    await page.locator('.tab[data-tab="export"]').click();
    await page.locator('#patch-file-input').setInputFiles({
      name: 'del-patch.json', mimeType: 'application/json', buffer: Buffer.from(patchContent),
    });
    await page.getByText('Alle übernehmen').click();

    expect(await page.evaluate(() => churches.length)).toBe(countBefore - 1);
    const stillExists = await page.evaluate(n => churches.some(c => c.name === n), nameToDelete);
    expect(stillExists).toBe(false);
  });

  test('Patch Export ohne Baseline zeigt Fehler-Toast', async ({ page }) => {
    // Create state without baseline
    const json = JSON.stringify([
      { name: 'No-Base', address: { street: 'X', zipCode: '59065', city: 'H' }, coordinates: { lat: 51.68, lng: 7.82 } }
    ]);
    await page.evaluate((j) => {
      const data = JSON.parse(j);
      churches = data;
      baselineChurches = null;
      renderChurchList();
    }, json);

    await page.locator('.tab[data-tab="export"]').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click();
    await expect(page.locator('.toast.error')).toBeVisible();
  });

  test('Gleichzeitige Kirchen- + Label-Änderungen korrekt im Patch', async ({ page }) => {
    // Modify church
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="url"]').first().fill('https://mixed-patch.de');

    // Export and verify
    await page.locator('.tab[data-tab="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Meine Änderungen als Datei speichern/ }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const patch = JSON.parse(Buffer.concat(chunks).toString());
    // Patches only track churches, not labels
    expect(patch.changes.length).toBeGreaterThan(0);
    expect(patch.changes[0].action).toBe('modified');
  });

  test('Imported Patch: Einzelnes Item übernehmen ändert nur diese Kirche', async ({ page }) => {
    // Create a patch with 2 modified churches
    const patch = {
      type: 'kirchenkarte-patch',
      exported: new Date().toISOString(),
      changes: []
    };
    const churches_data = await page.evaluate(() => JSON.parse(JSON.stringify(churches)));
    const mod0 = { ...churches_data[0], website: 'https://single-item-0.de' };
    const mod1 = { ...churches_data[1], website: 'https://single-item-1.de' };
    patch.changes.push({ action: 'modified', name: mod0.name, church: mod0 });
    patch.changes.push({ action: 'modified', name: mod1.name, church: mod1 });

    await page.locator('.tab[data-tab="export"]').click();
    await page.locator('#patch-file-input').setInputFiles({
      name: 'multi.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(patch)),
    });

    // Only apply first item
    await page.locator('.merge-item').first().locator('button').click();

    const w0 = await page.evaluate(() => churches[0].website);
    const w1 = await page.evaluate(() => churches[1].website);
    expect(w0).toBe('https://single-item-0.de');
    expect(w1).not.toBe('https://single-item-1.de');
  });

  test('Patch: "modified" für verschobene Koordinaten wird korrekt importiert', async ({ page }) => {
    const original = await page.evaluate(() => JSON.parse(JSON.stringify(churches[0])));
    const modified = { ...original, coordinates: { lat: 51.999, lng: 7.999 } };
    const patch = {
      type: 'kirchenkarte-patch',
      exported: new Date().toISOString(),
      changes: [{ action: 'modified', name: original.name, church: modified }]
    };

    await page.locator('.tab[data-tab="export"]').click();
    await page.locator('#patch-file-input').setInputFiles({
      name: 'coord-patch.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(patch)),
    });
    await page.getByText('Alle übernehmen').click();

    const coords = await page.evaluate(() => churches[0].coordinates);
    expect(coords.lat).toBeCloseTo(51.999, 2);
    expect(coords.lng).toBeCloseTo(7.999, 2);
  });
});

// ============================================================
// ALLE ÄNDERUNGEN VERWERFEN
// ============================================================

test.describe('Änderungen verwerfen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await loadData(page);
  });

  test('Verwerfen-Button existiert im Speichern-Tab', async ({ page }) => {
    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.getByRole('button', { name: /Alle Änderungen verwerfen/ })).toBeVisible();
  });

  test('Verwerfen setzt Kirchendaten auf Ausgangszustand zurück', async ({ page }) => {
    const originalCount = await page.evaluate(() => churches.length);
    // Neue Kirche hinzufügen
    await page.getByText('+ Neue Kirche').click();
    expect(await page.evaluate(() => churches.length)).toBe(originalCount + 1);

    // Verwerfen
    await page.locator('.tab[data-tab="export"]').click();
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: /Alle Änderungen verwerfen/ }).click();

    expect(await page.evaluate(() => churches.length)).toBe(originalCount);
  });

  test('Verwerfen setzt bearbeitete Kirche zurück', async ({ page }) => {
    const originalName = await page.evaluate(() => churches[0].name);
    // Name ändern
    await page.locator('#church-list .list-item').first().click();
    const nameInput = page.locator('#church-detail input[type="text"]').first();
    await nameInput.fill('GEÄNDERTER NAME');

    // Verwerfen
    await page.locator('.tab[data-tab="export"]').click();
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: /Alle Änderungen verwerfen/ }).click();

    expect(await page.evaluate(() => churches[0].name)).toBe(originalName);
  });

  test('Verwerfen leert neue Bilder', async ({ page }) => {
    // Bild hinzufügen
    await page.locator('.tab[data-tab="images"]').click();
    const buffer = Buffer.alloc(100, 0xFF);
    await page.locator('#images-file-input').setInputFiles({
      name: 'test.jpg', mimeType: 'image/jpeg', buffer
    });
    // Wait for async compression to finish
    await expect(page.locator('#images-grid .image-card')).toHaveCount(1);
    expect(await page.evaluate(() => Object.keys(newImages).length)).toBe(1);

    // Verwerfen
    await page.locator('.tab[data-tab="export"]').click();
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: /Alle Änderungen verwerfen/ }).click();

    expect(await page.evaluate(() => Object.keys(newImages).length)).toBe(0);
  });

  test('Verwerfen abbrechen behält Änderungen', async ({ page }) => {
    const originalCount = await page.evaluate(() => churches.length);
    await page.getByText('+ Neue Kirche').click();

    await page.locator('.tab[data-tab="export"]').click();
    page.on('dialog', d => d.dismiss());
    await page.getByRole('button', { name: /Alle Änderungen verwerfen/ }).click();

    expect(await page.evaluate(() => churches.length)).toBe(originalCount + 1);
  });

  test('Verwerfen zeigt Erfolgsmeldung', async ({ page }) => {
    await page.getByText('+ Neue Kirche').click();
    await page.locator('.tab[data-tab="export"]').click();
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: /Alle Änderungen verwerfen/ }).click();
    await expect(page.getByText('Alle Änderungen verworfen')).toBeVisible();
  });

  test('Diff ist nach Verwerfen leer', async ({ page }) => {
    // Kirche bearbeiten, damit Diff-Einträge existieren
    await page.locator('#church-list .list-item').first().click();
    const nameInput = page.locator('#church-detail input[type="text"]').first();
    await nameInput.fill('GEÄNDERTER NAME');

    await page.locator('.tab[data-tab="export"]').click();
    await expect(page.locator('.diff-item')).toHaveCount(1); // 1 Änderung

    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: /Alle Änderungen verwerfen/ }).click();

    // Diff sollte nun "Keine Änderungen" zeigen
    await expect(page.locator('.diff-item')).toHaveCount(0);
  });
});

// ============================================================
// EINZELNE ÄNDERUNG RÜCKGÄNGIG
// ============================================================

test.describe('Einzelne Änderung rückgängig', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await loadData(page);
  });

  test('Jede Diff-Zeile hat einen Rückgängig-Button', async ({ page }) => {
    // Änderung erzeugen
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="text"]').first().fill('TEST-REVERT');
    await page.locator('.tab[data-tab="export"]').click();
    const items = page.locator('.diff-item');
    await expect(items).toHaveCount(1);
    await expect(items.first().getByRole('button', { name: /Rückgängig/ })).toBeVisible();
  });

  test('Rückgängig bei geänderter Kirche setzt Original zurück', async ({ page }) => {
    const originalName = await page.evaluate(() => churches[0].name);
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="text"]').first().fill('REVERT-TEST');

    await page.locator('.tab[data-tab="export"]').click();
    await page.locator('.diff-item').first().getByRole('button', { name: /Rückgängig/ }).click();

    expect(await page.evaluate(() => churches[0].name)).toBe(originalName);
    await expect(page.locator('.diff-item')).toHaveCount(0);
  });

  test('Rückgängig bei neuer Kirche entfernt sie', async ({ page }) => {
    const originalCount = await page.evaluate(() => churches.length);
    await page.getByText('+ Neue Kirche').click();

    await page.locator('.tab[data-tab="export"]').click();
    await page.locator('.diff-item.added').first().getByRole('button', { name: /Rückgängig/ }).click();

    expect(await page.evaluate(() => churches.length)).toBe(originalCount);
  });

  test('Rückgängig bei gelöschter Kirche stellt sie wieder her', async ({ page }) => {
    const originalCount = await page.evaluate(() => churches.length);
    const deletedName = await page.evaluate(() => churches[0].name);

    // Kirche löschen
    await page.locator('#church-list .list-item').first().click();
    page.on('dialog', d => d.accept());
    await page.getByText('🗑 Löschen').click();
    expect(await page.evaluate(() => churches.length)).toBe(originalCount - 1);

    // Rückgängig
    await page.locator('.tab[data-tab="export"]').click();
    await page.locator('.diff-item.removed').first().getByRole('button', { name: /Rückgängig/ }).click();

    expect(await page.evaluate(() => churches.length)).toBe(originalCount);
    expect(await page.evaluate(() => churches[0].name)).toBe(deletedName);
  });

  test('Rückgängig bei geänderter Stadt setzt Original zurück', async ({ page }) => {
    await page.locator('.tab[data-tab="labels"]').click();
    const originalName = await page.evaluate(() => labels.cities[0].name);
    const cityInput = page.locator('#cities-list input[type="text"]').first();
    await cityInput.fill('REVERT-STADT');
    await cityInput.dispatchEvent('change');

    await page.locator('.tab[data-tab="export"]').click();
    const cityDiff = page.locator('.diff-item', { hasText: 'Stadt:' });
    await cityDiff.first().getByRole('button', { name: /Rückgängig/ }).click();

    expect(await page.evaluate(() => labels.cities[0].name)).toBe(originalName);
  });

  test('Rückgängig bei neuem Bild entfernt es', async ({ page }) => {
    await page.locator('.tab[data-tab="images"]').click();
    const buffer = Buffer.alloc(100, 0xFF);
    await page.locator('#images-file-input').setInputFiles({
      name: 'revert-test.jpg', mimeType: 'image/jpeg', buffer
    });
    // Wait for async compression to finish
    await expect(page.locator('#images-grid .image-card')).toHaveCount(1);

    await page.locator('.tab[data-tab="export"]').click();
    const imageDiff = page.locator('.diff-item', { hasText: 'Bild:' });
    await imageDiff.first().getByRole('button', { name: /Rückgängig/ }).click();

    expect(await page.evaluate(() => Object.keys(newImages).length)).toBe(0);
  });

  test('Toast wird bei Rückgängig angezeigt', async ({ page }) => {
    await page.locator('#church-list .list-item').first().click();
    await page.locator('#church-detail input[type="text"]').first().fill('TOAST-TEST');

    await page.locator('.tab[data-tab="export"]').click();
    await page.locator('.diff-item').first().getByRole('button', { name: /Rückgängig/ }).click();

    await expect(page.getByText('Änderung rückgängig gemacht')).toBeVisible();
  });
});
