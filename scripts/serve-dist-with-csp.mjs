/**
 * Tiny static HTTP server serving web/dist with SPA fallback and exact
 * CloudFront Security Response Headers / Content Security Policy from infra/web-hosting.yaml.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '4173', 10);
const API_ORIGIN = process.env.API_ORIGIN || 'http://localhost:8787';
const DIST_DIR = path.resolve(__dirname, '../web/dist');

// Security headers matching infra/web-hosting.yaml
const CSP_POLICY = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ${API_ORIGIN} https://*.amazonaws.com https://open-meteo.com https://*.open-meteo.com; frame-ancestors 'none';`;

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': CSP_POLICY,
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=(), payment=()',
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

export function createCspServer(distDir = DIST_DIR, apiOrigin = API_ORIGIN) {
  const csp = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ${apiOrigin} https://*.amazonaws.com https://open-meteo.com https://*.open-meteo.com; frame-ancestors 'none';`;

  return http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let reqPath = decodeURIComponent(parsedUrl.pathname);

    let filePath = path.join(distDir, reqPath);

    // If request has no extension or doesn't exist on disk, SPA fallback to index.html
    let isSpaFallback = false;
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
      isSpaFallback = true;
    }

    // Set Security Headers
    Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
      if (header === 'Content-Security-Policy') {
        res.setHeader(header, csp);
      } else {
        res.setHeader(header, value);
      }
    });

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Cache control based on asset type
    if (ext === '.html' || isSpaFallback) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (reqPath.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    fs.createReadStream(filePath).pipe(res);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createCspServer(DIST_DIR, API_ORIGIN);
  server.listen(PORT, () => {
    console.log(`Chhaya CSP Server running at http://localhost:${PORT}`);
    console.log(`Serving: ${DIST_DIR}`);
    console.log(`API Origin: ${API_ORIGIN}`);
    console.log(`CSP: ${CSP_POLICY}`);
  });
}
