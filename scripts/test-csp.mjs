import { chromium } from '../web/node_modules/playwright/index.mjs';
import { createCspServer } from './serve-dist-with-csp.mjs';

const PORT = 4173;
const API_ORIGIN = 'http://localhost:8787';
const BASE_URL = `http://localhost:${PORT}`;

const ROUTES = [
  '/',
  '/risk-board',
  '/analytics',
  '/plans',
  '/crews',
  '/audit',
  '/report',
  '/safety',
];

async function main() {
  const server = createCspServer();
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[CSP Test] Server listening at ${BASE_URL} (API Origin: ${API_ORIGIN})`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  const cspViolations = [];
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Check for CSP violation indicators
      if (text.toLowerCase().includes('violates') || text.toLowerCase().includes('content security policy') || text.toLowerCase().includes('csp')) {
        cspViolations.push(text);
      }
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  console.log('[CSP Test] Testing routes against CSP policy...');
  const results = [];

  for (const route of ROUTES) {
    const routeUrl = `${BASE_URL}${route}`;
    const initialConsoleCount = consoleErrors.length;
    const initialCspCount = cspViolations.length;
    const initialErrorCount = errors.length;

    const response = await page.goto(routeUrl, { waitUntil: 'networkidle', timeout: 10000 });
    const status = response.status();
    const cspHeader = response.headers()['content-security-policy'];
    const hstsHeader = response.headers()['strict-transport-security'];
    const frameOptions = response.headers()['x-frame-options'];

    // Wait 500ms for any async render/network requests
    await page.waitForTimeout(500);

    const routeCspViolations = cspViolations.slice(initialCspCount);
    const routeConsoleErrors = consoleErrors.slice(initialConsoleCount);
    const routeErrors = errors.slice(initialErrorCount);

    const passed = (status === 200) && (routeCspViolations.length === 0) && (routeConsoleErrors.length === 0) && (routeErrors.length === 0);

    results.push({
      route,
      status,
      hasCsp: !!cspHeader,
      hasHsts: !!hstsHeader,
      hasFrameOptions: !!frameOptions,
      cspViolations: routeCspViolations.length,
      consoleErrors: routeConsoleErrors.length,
      pageErrors: routeErrors.length,
      passed,
    });

    console.log(`  Route: ${route.padEnd(14)} Status: ${status} | CSP: ${routeCspViolations.length} violations | Console: ${routeConsoleErrors.length} errors | Result: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) {
      if (routeCspViolations.length > 0) console.error(`    CSP Violations:`, routeCspViolations);
      if (routeConsoleErrors.length > 0) console.error(`    Console Errors:`, routeConsoleErrors);
      if (routeErrors.length > 0) console.error(`    Page Errors:`, routeErrors);
    }
  }

  await browser.close();
  await new Promise((resolve) => server.close(resolve));

  const totalCsp = cspViolations.length;
  const totalConsole = consoleErrors.length;
  const totalErrors = errors.length;
  const allPassed = results.every(r => r.passed);

  console.log('\n================== CSP TEST SUMMARY ==================');
  console.log(`Routes Tested:       ${ROUTES.length}`);
  console.log(`All Passed:          ${allPassed ? 'YES' : 'NO'}`);
  console.log(`Total CSP Errors:    ${totalCsp}`);
  console.log(`Total Console Errors:${totalConsole}`);
  console.log(`Total Page Errors:   ${totalErrors}`);
  console.log('======================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal CSP test error:', err);
  process.exit(1);
});
