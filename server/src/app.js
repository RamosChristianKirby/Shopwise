import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import routes, { UPLOAD_DIR } from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

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

  app.use('/uploads', express.static(UPLOAD_DIR));
  app.use('/api', routes);

  // In production, serve the built React app from the same server.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    // config.js (API address) and index.html must never be cached, so edits show up on the next refresh
    app.use(express.static(clientDist, {
      setHeaders: (res, file) => { if (/(^|[\\/])(config\.js|index\.html)$/.test(file)) res.setHeader('Cache-Control', 'no-cache'); },
    }));
    app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
