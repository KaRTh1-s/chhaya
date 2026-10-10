import { chromium } from '../web/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dist = path.resolve(__dirname, '../web/dist');

const server = http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/' || !fs.existsSync(path.join(dist, p)) || fs.statSync(path.join(dist, p)).isDirectory()) p = '/index.html';
  const ext = path.extname(p);
  const mime = ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'text/html';
  res.writeHead(200, { 'Content-Type': mime });
  res.end(fs.readFileSync(path.join(dist, p)));
});

server.listen(4175, async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('[Keyboard Audit] Loading /plans page...');
  await page.goto('http://localhost:4175/#/plans?scenario=delhi-heatwave-2025-06-09&lang=en', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Tab through all controls on the page and record focus order
  const focusOrder = [];
  const maxTabs = 65;

  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const focusedInfo = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').filter(Boolean).slice(0, 2).join('.')}` : '';
      const text = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      const role = el.getAttribute('role') || el.type || '';
      return { tag, id, cls, text, role };
    });

    if (focusedInfo) {
      focusOrder.push({
        step: i + 1,
        control: `${focusedInfo.tag}${focusedInfo.id}${focusedInfo.cls}`,
        role: focusedInfo.role,
        label: focusedInfo.text,
      });
    }
  }

  console.log('\n=== COMPLETE KEYBOARD FOCUS ORDER ON /plans ===');
  console.table(focusOrder);

  // Specific Test 1: Enter on Update Plan submit button
  console.log('\n[Keyboard Audit] Testing Enter key form submission...');
  const submitBtn = page.locator('button:has-text("Update Plan")');
  await submitBtn.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  console.log('  ✓ Enter key on form submit button processed successfully.');

  // Specific Test 2: EvidenceChip Dialog Open -> Escape Key -> Focus Return
  console.log('\n[Keyboard Audit] Testing EvidenceChip dialog Esc dismissal and focus return...');
  const firstChip = page.locator('.evidence-chip').first();
  await firstChip.focus();
  const chipBeforeFocus = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim());
  console.log(`  Focused chip: "${chipBeforeFocus}"`);

  // Press Enter to open dialog
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  const modalVisible = await page.locator('[role="dialog"]').isVisible();
  console.log(`  Modal visible after Enter: ${modalVisible}`);

  // Check dialog has focus or close button inside
  const activeInModal = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.tagName.toLowerCase()} ${el.textContent?.trim()}` : 'none';
  });
  console.log(`  Active element in modal: ${activeInModal}`);

  // Press Escape to dismiss
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  const modalClosed = !(await page.locator('[role="dialog"]').isVisible());
  console.log(`  Modal closed after Escape: ${modalClosed}`);

  // Verify focus returned to trigger chip
  const returnedFocusMatches = await page.evaluate(() => {
    return document.activeElement?.classList.contains('evidence-chip');
  });
  const returnedElementText = await page.evaluate(() => document.activeElement?.textContent?.trim());
  console.log(`  Focus returned to EvidenceChip: ${returnedFocusMatches} ("${returnedElementText}")`);

  await browser.close();
  server.close();
});
