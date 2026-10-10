import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screensDir = path.resolve(__dirname, '../../docs/design/screens');

if (!fs.existsSync(screensDir)) {
  fs.mkdirSync(screensDir, { recursive: true });
}

// Start vite preview on port 4173
console.log('Starting vite preview...');
const previewProcess = spawn('npx', ['vite', 'preview', '--port', '4173'], {
  cwd: path.resolve(__dirname, '..'),
  shell: true,
  stdio: 'pipe',
});

// Wait for server to start
await new Promise((resolve) => setTimeout(resolve, 3000));

try {
  const browser = await chromium.launch({ headless: true });

  const routes = [
    { path: '/', name: 'home' },
    { path: '/plans?scenario=delhi-heatwave-2025-06-09', name: 'plans-heatwave' },
    { path: '/board', name: 'board' },
    { path: '/crews', name: 'crews' },
    { path: '/report?city=delhi&job=RIDER', name: 'report' },
    { path: '/analytics', name: 'analytics' },
    { path: '/audit', name: 'audit' },
    { path: '/safety', name: 'safety' },
  ];

  for (const route of routes) {
    // Desktop 1440
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto(`http://localhost:4173/#${route.path}`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);
    await desktopPage.screenshot({
      path: path.join(screensDir, `desktop-1440-${route.name}.png`),
      fullPage: true,
    });
    await desktopContext.close();

    // Mobile 390
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`http://localhost:4173/#${route.path}`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({
      path: path.join(screensDir, `mobile-390-${route.name}.png`),
      fullPage: true,
    });
    await mobileContext.close();

    console.log(`✓ Captured ${route.name}`);
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
} catch (err) {
  console.error('Screenshot capture failed:', err);
} finally {
  previewProcess.kill();
  process.exit(0);
}
