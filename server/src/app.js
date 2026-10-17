import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import routes, { UPLOAD_DIR } from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { resolveStoreSoft as resolveStore } from './middleware/tenant.js';
import { injectMeta, pageMeta, robotsTxt, sitemapXml } from './utils/seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Websites allowed to call this API from a browser: CLIENT_URL (comma-separated) plus, unless the
// server runs in production with CLIENT_URL set, anything on localhost (handy in development).
function corsOrigin() {
  const allowed = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const allowLocal = !allowed.length || process.env.NODE_ENV !== 'production';
  const isLocal = (o) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(o);
  return (origin, cb) => cb(null, !origin || allowed.includes('*') || allowed.includes(origin) || (allowLocal && isLocal(origin)));
}

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(cors({ origin: corsOrigin(), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.set('trust proxy', 1);
  app.use('/uploads', express.static(UPLOAD_DIR));
  app.use('/api', routes);

  // SEO: per-store sitemap and robots.txt
  app.get('/sitemap.xml', resolveStore, async (req, res, next) => {
    try { res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(await sitemapXml(req)); } catch (e) { next(e); }
  });
  app.get('/robots.txt', resolveStore, (req, res) => res.type('text/plain').send(robotsTxt(req)));

  // In production, serve the built React app from the same server.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    const indexFile = path.join(clientDist, 'index.html');
    let template = null;
    const readTemplate = () => {
      if (!template || process.env.NODE_ENV !== 'production') template = fs.readFileSync(indexFile, 'utf8');
      return template;
    };
    // Every page gets index.html with its own title, description, Open Graph tags and JSON-LD,
    // so product and category pages are fully crawlable and share nicely.
    const sendPage = async (req, res, next) => {
      try {
        const meta = await pageMeta(req).catch(() => null);
        res.set('Cache-Control', 'no-cache').type('html').send(injectMeta(readTemplate(), meta));
      } catch (e) {
        next(e);
      }
    };
    app.get(['/', '/index.html'], resolveStore, sendPage);
    // config.js (API address) must never be cached, so edits show up on the next refresh
    app.use(express.static(clientDist, {
      index: false,
      setHeaders: (res, file) => { if (/(^|[\\/])config\.js$/.test(file)) res.setHeader('Cache-Control', 'no-cache'); },
    }));
    app.get(/^\/(?!api|uploads).*/, resolveStore, sendPage);
  }

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
