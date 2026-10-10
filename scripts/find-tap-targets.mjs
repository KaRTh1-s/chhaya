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

server.listen(4174, async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

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

  for (const route of routes) {
    await page.goto(`http://localhost:4174/${route.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const offenders = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, select, input, [role="button"]'));
      return els.filter(el => {
        // exempt inline text links inside paragraphs/footer text
        if (el.tagName === 'A' && el.closest('p, .text-link, footer .footer-bottom')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
      }).map(el => {
        const r = el.getBoundingClientRect();
        const selector = el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ').join('.')}` : el.tagName.toLowerCase();
        return {
          tag: el.tagName.toLowerCase(),
          selector,
          text: (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 24),
          width: Math.round(r.width),
          height: Math.round(r.height)
        };
      });
    });

    console.log(`\n=== ${route.name} (${offenders.length} items < 44px) ===`);
    for (const o of offenders.slice(0, 8)) {
      console.log(`  - [${o.tag}] ${o.selector} "${o.text}" (${o.width}x${o.height}px)`);
    }
  }

  await browser.close();
  server.close();
});
