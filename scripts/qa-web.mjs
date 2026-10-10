import { chromium } from '../web/node_modules/playwright/index.mjs';
import { AxeBuilder } from '../web/node_modules/@axe-core/playwright/dist/index.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(REPO_ROOT, 'web', 'dist');

// Simple static HTTP server serving dist
function startServer(port = 4173) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    let filePath = path.join(DIST_DIR, reqPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    } catch (err) {
      res.writeHead(500);
      res.end('Server error: ' + err.message);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve(server);
    });
  });
}

async function runQA() {
  console.log('--- Starting Web Accessibility & Mobile QA ---');
  const server = await startServer(4173);
  const baseUrl = 'http://localhost:4173';

  const browser = await chromium.launch({ headless: true });

  const routes = [
    { name: 'Home', path: '#/' },
    { name: 'Risk Board', path: '#/board' },
    { name: 'Analytics', path: '#/analytics' },
    { name: 'Plans (Delhi Replay)', path: '#/plans?scenario=delhi-heatwave-2025-06-09' },
    { name: 'Crews', path: '#/crews' },
    { name: 'Audit', path: '#/audit' },
    { name: 'Report', path: '#/report?city=delhi&job=construction' },
    { name: 'Safety', path: '#/safety' },
  ];

  const viewports = [
    { name: 'Mobile (390x844)', width: 390, height: 844 },
    { name: 'Desktop (1440x900)', width: 1440, height: 900 },
  ];

  const results = [];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    for (const route of routes) {
      const targetUrl = `${baseUrl}/${route.path}`;
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // (a) Axe accessibility scan
      let axeViolations = { minor: 0, moderate: 0, serious: 0, critical: 0, details: [] };
      try {
        const axeResults = await new AxeBuilder({ page })
          .disableRules(['color-contrast']) // contrast checked separately / standard themes
          .analyze();
        for (const v of axeResults.violations) {
          const impact = v.impact || 'minor';
          if (axeViolations[impact] !== undefined) {
            axeViolations[impact]++;
          }
          axeViolations.details.push(`${v.id} (${v.impact}): ${v.help}`);
        }
      } catch (err) {
        console.error(`Axe scan failed for ${route.name}:`, err.message);
      }

      // (b) Horizontal overflow check
      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });

      // (c) Tap target size check for interactive elements
      const tapTargetIssues = await page.evaluate(() => {
        const interactive = Array.from(document.querySelectorAll('button, a, input, select'));
        let smallCount = 0;
        const smallElements = [];
        for (const el of interactive) {
          if (el.tagName === 'A' && el.closest('p, .text-link, footer .footer-bottom')) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 44 || rect.height < 44) {
              smallCount++;
              smallElements.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 15)}" (${Math.round(rect.width)}x${Math.round(rect.height)}px)`);
            }
          }
        }
        return { smallCount, smallElements: smallElements.slice(0, 3) };
      });

      results.push({
        route: route.name,
        viewport: vp.name,
        overflow: overflow.hasOverflow ? `FAIL (${overflow.scrollWidth}px > ${overflow.innerWidth}px)` : 'PASS (no scroll)',
        axeSeriousCritical: axeViolations.serious + axeViolations.critical,
        axeTotal: axeViolations.minor + axeViolations.moderate + axeViolations.serious + axeViolations.critical,
        tapTargetsSmall: tapTargetIssues.smallCount,
        details: axeViolations.details.slice(0, 2).join('; '),
      });
    }
    await context.close();
  }

  // Also check 360px viewport overflow specifically
  const c360 = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const p360 = await c360.newPage();
  const overflow360Results = [];
  for (const route of routes) {
    await p360.goto(`${baseUrl}/${route.path}`, { waitUntil: 'networkidle' });
    const overflowInfo = await p360.evaluate(() => {
      const docW = window.innerWidth;
      const scrollW = document.documentElement.scrollWidth;
      const culprits = [];
      if (scrollW > docW) {
        for (const el of document.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.right > docW + 1 || r.width > docW + 1) {
            culprits.push(`${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ').join('.') : ''} (${Math.round(r.width)}px, right:${Math.round(r.right)}px)`);
          }
        }
      }
      return {
        hasOverflow: scrollW > docW,
        scrollW,
        docW,
        culprits: culprits.slice(0, 3).join('; '),
      };
    });
    overflow360Results.push({
      route: route.name,
      overflow360: overflowInfo.hasOverflow ? `OVERFLOW (${overflowInfo.scrollW}px > ${overflowInfo.docW}px)` : 'OK',
      culprits: overflowInfo.culprits || 'None',
    });
  }
  await c360.close();

  // (d) Plans keyboard-only flow check
  const kContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const kPage = await kContext.newPage();
  await kPage.goto(`${baseUrl}/#/plans`, { waitUntil: 'networkidle' });
  await kPage.waitForTimeout(500);

  // Tab through controls
  let tabCount = 0;
  let focusedTags = [];
  for (let i = 0; i < 20; i++) {
    await kPage.keyboard.press('Tab');
    tabCount++;
    const focused = await kPage.evaluate(() => {
      const el = document.activeElement;
      return el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}` : null;
    });
    if (focused && !focusedTags.includes(focused)) {
      focusedTags.push(focused);
    }
  }
  await kContext.close();

  // (e) Capture screenshots into docs/design/screens/
  const screensDir = path.resolve(REPO_ROOT, 'docs', 'design', 'screens');
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true });
  }

  console.log('\n--- Capturing Screenshots ---');
  // Desktop Screenshots
  const dContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dPage = await dContext.newPage();

  const captureList = [
    { name: 'home-desktop.png', path: '#/' },
    { name: 'board-desktop.png', path: '#/board' },
    { name: 'plans-en-desktop.png', path: '#/plans?scenario=delhi-heatwave-2025-06-09&lang=en' },
    { name: 'plans-ta-desktop.png', path: '#/plans?scenario=delhi-heatwave-2025-06-09&lang=ta' },
    { name: 'crews-desktop.png', path: '#/crews' },
    { name: 'safety-desktop.png', path: '#/safety' },
    { name: 'analytics-desktop.png', path: '#/analytics' },
    { name: 'audit-desktop.png', path: '#/audit' },
    { name: 'report-print-preview.png', path: '#/report?city=delhi&job=construction' },
  ];

  for (const item of captureList) {
    await dPage.goto(`${baseUrl}/${item.path}`, { waitUntil: 'networkidle' });
    await dPage.waitForTimeout(600);
    const dest = path.join(screensDir, item.name);
    await dPage.screenshot({ path: dest, fullPage: true });
    console.log(`Saved: ${item.name}`);
  }
  await dContext.close();

  // Mobile Screenshots
  const mContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await mContext.newPage();

  const mobileCaptureList = [
    { name: 'home-mobile.png', path: '#/' },
    { name: 'board-mobile.png', path: '#/board' },
    { name: 'plans-en-mobile.png', path: '#/plans?scenario=delhi-heatwave-2025-06-09&lang=en' },
    { name: 'plans-ta-mobile.png', path: '#/plans?scenario=delhi-heatwave-2025-06-09&lang=ta' },
    { name: 'crews-mobile.png', path: '#/crews' },
    { name: 'safety-mobile.png', path: '#/safety' },
    { name: 'analytics-mobile.png', path: '#/analytics' },
    { name: 'audit-mobile.png', path: '#/audit' },
    { name: 'report-mobile.png', path: '#/report?city=delhi&job=construction' },
  ];

  for (const item of mobileCaptureList) {
    await mPage.goto(`${baseUrl}/${item.path}`, { waitUntil: 'networkidle' });
    await mPage.waitForTimeout(600);
    const dest = path.join(screensDir, item.name);
    await mPage.screenshot({ path: dest, fullPage: true });
    console.log(`Saved: ${item.name}`);
  }
  await mContext.close();

  console.log('\n=================== QA SUMMARY TABLE ===================');
  console.table(results);

  console.log('\n=== 360px VIEWPORT OVERFLOW CHECK ===');
  console.table(overflow360Results);

  console.log('\n=== KEYBOARD ACCESSIBILITY AUDIT ===');
  console.log(`Tab interactions: ${tabCount} tabs, unique active elements reached: ${focusedTags.length}`);
  console.log('Focused elements:', focusedTags.slice(0, 8).join(' -> '));

  await browser.close();
  server.close();
}

runQA().catch((err) => {
  console.error('QA script error:', err);
  process.exit(1);
});
