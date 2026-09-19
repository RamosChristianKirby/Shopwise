// Shared helpers for the launcher scripts (start / dev / seed). No dependencies — plain Node.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SERVER = path.join(ROOT, 'server');
export const CLIENT = path.join(ROOT, 'client');
export const DATA_DIR = path.join(ROOT, '.data');
export const DB_NAME = 'mern_shop';

/* ------------------------------ output ------------------------------ */
const paint = (code) => (s) => (process.stdout.isTTY && !process.env.NO_COLOR ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const color = { dim: paint(2), bold: paint(1), red: paint(31), green: paint(32), yellow: paint(33), cyan: paint(36) };
export const log = (msg = '') => console.log(msg);
export const step = (msg) => console.log(`${color.cyan('>')} ${msg}`);
export const warn = (msg) => console.log(`${color.yellow('!')} ${msg}`);

export function fail(msg) {
  console.error(`\n${color.red('x ' + msg)}\n`);
  process.exit(1);
}

export function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 18) fail(`Node.js 18 or newer is required (you have ${process.versions.node}). Download it from https://nodejs.org`);
}

/* ------------------------------ .env ------------------------------ */
export function readEnvFile(file = path.join(SERVER, '.env')) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/** Creates server/.env on first run and makes sure it has a real JWT secret. */
export function ensureEnv() {
  const envPath = path.join(SERVER, '.env');
  const examplePath = path.join(SERVER, '.env.example');
  const existed = fs.existsSync(envPath);
  const original = existed ? fs.readFileSync(envPath, 'utf8') : fs.readFileSync(examplePath, 'utf8');
  let text = original;

  const secret = crypto.randomBytes(32).toString('hex');
  const placeholder = /^(\s*JWT_SECRET\s*=\s*)change_me\w*\s*$/m;
  if (placeholder.test(text)) text = text.replace(placeholder, `$1${secret}`);
  else if (!/^\s*JWT_SECRET\s*=\s*\S+/m.test(text)) text += `${text.endsWith('\n') ? '' : '\n'}JWT_SECRET=${secret}\n`;

  if (!existed || text !== original) {
    fs.writeFileSync(envPath, text);
    step(existed ? 'Added a secure JWT_SECRET to server/.env' : 'Created server/.env (edit it any time to set your GCash / bank details)');
  }
  return readEnvFile(envPath);
}

/* ------------------------------ install / build ------------------------------ */
const has = (dir, pkg) => fs.existsSync(path.join(dir, 'node_modules', pkg, 'package.json'));

export function ensureInstalled({ server = true } = {}) {
  const groups = [
    [SERVER, 'server', ['express', 'mongoose', 'mongodb-memory-server']],
    [CLIENT, 'client', ['vite', 'react', 'react-router-dom']],
  ].filter(([, name]) => server || name !== 'server');
  for (const [dir, name, pkgs] of groups) {
    if (pkgs.every((p) => has(dir, p))) continue;
    step(`Installing ${name} packages (first run only — this can take a minute)…`);
    // MONGOMS_DISABLE_POSTINSTALL: the built-in MongoDB is only downloaded if it is actually needed
    const r = spawnSync('npm install --no-audit --no-fund', { cwd: dir, stdio: 'inherit', shell: true, env: { ...process.env, MONGOMS_DISABLE_POSTINSTALL: '1' } });
    if (r.status !== 0) fail(`"npm install" failed in the ${name} folder. Check your internet connection and try again.`);
  }
}

function newestMtime(target) {
  if (!fs.existsSync(target)) return 0;
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return stat.mtimeMs;
  return fs.readdirSync(target).reduce((max, f) => Math.max(max, newestMtime(path.join(target, f))), stat.mtimeMs);
}

export function ensureBuilt() {
  const built = path.join(CLIENT, 'dist', 'index.html');
  const sources = ['src', 'public', 'index.html', 'package.json', 'vite.config.js'].map((f) => path.join(CLIENT, f));
  const upToDate = fs.existsSync(built) && fs.statSync(built).mtimeMs >= Math.max(...sources.map(newestMtime));
  if (upToDate) return;
  step('Building the website (only when something changed)…');
  const vite = path.join(CLIENT, 'node_modules', 'vite', 'bin', 'vite.js');
  const r = spawnSync(process.execPath, [vite, 'build', '--logLevel', 'warn'], { cwd: CLIENT, stdio: 'inherit' });
  if (r.status !== 0) fail('The website build failed — see the messages above.');
}

/* ------------------------------ your own API ------------------------------ */
/**
 * If client/public/config.js points API_URL at an API that is NOT the one bundled with this project,
 * returns that address (the launchers then skip the built-in database and server). Otherwise ''.
 */
export function externalApi() {
  let url = '';
  try {
    const text = fs.readFileSync(path.join(CLIENT, 'public', 'config.js'), 'utf8');
    const m = text.match(/^\s*API_URL\s*:\s*(['"`])(.*?)\1/m);
    url = (m ? m[2] : '').trim();
  } catch { /* no config file: use the built-in API */ }
  if (!url || url.startsWith('/')) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = (/^(localhost|127\.|192\.168\.|10\.)/i.test(url) ? 'http://' : 'https://') + url;
  url = url.replace(/\/+$/, '');
  try {
    const u = new URL(url);
    const mine = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) && Number(u.port || (u.protocol === 'https:' ? 443 : 80)) === serverPort();
    return mine ? '' : url;
  } catch {
    return '';
  }
}

/** Quick, non-fatal check that a custom API answers; prints a hint if it doesn't. */
export async function pingApi(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${url}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.status >= 500) warn(`Your API answered with an error (${res.status}) at ${url}/health`);
    else log(`  ${color.green('ok')} your API answers at ${url}`);
  } catch {
    warn(`Could not reach your API at ${url} — the website will show a notice until it is running (and allows this site in its CORS settings).`);
  }
}

/* ------------------------------ MongoDB ------------------------------ */
function portOpen(port, host = '127.0.0.1', timeout = 900) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/**
 * Decides which MongoDB to use and returns { uri, mode, autoSeed, stop }.
 *   1. MONGO_URI set (env or server/.env)  -> use it as-is (Atlas, your own server…)
 *   2. a MongoDB already running locally   -> use it
 *   3. otherwise                           -> start a built-in MongoDB, data kept in ./.data/mongodb
 */
export async function resolveDatabase() {
  const fromEnv = (process.env.MONGO_URI || readEnvFile().MONGO_URI || '').trim();
  const forceSeed = (process.env.AUTO_SEED || readEnvFile().AUTO_SEED) === 'true';

  if (fromEnv) {
    step(`Using MongoDB from MONGO_URI ${color.dim('(' + fromEnv.replace(/\/\/[^@/]*@/, '//***@').slice(0, 60) + ')')}`);
    return { uri: fromEnv, mode: 'configured', autoSeed: forceSeed, stop: async () => {} };
  }

  const localUri = `mongodb://127.0.0.1:27017/${DB_NAME}`;
  if (await portOpen(27017)) {
    step('Found MongoDB running on this computer — using it');
    return { uri: localUri, mode: 'local', autoSeed: true, stop: async () => {} };
  }

  // Built-in MongoDB (mongodb-memory-server, but with a persistent data folder)
  let MongoMemoryServer;
  try {
    const entry = createRequire(path.join(SERVER, 'package.json')).resolve('mongodb-memory-server');
    const mod = await import(pathToFileURL(entry).href);
    MongoMemoryServer = mod.MongoMemoryServer || mod.default?.MongoMemoryServer;
    if (!MongoMemoryServer) throw new Error('MongoMemoryServer export not found');
  } catch (e) {
    fail(`Could not load the built-in database (${e.message}). Run "npm run install:all", or install MongoDB from https://www.mongodb.com/try/download/community`);
  }

  const dbPath = path.join(DATA_DIR, 'mongodb');
  fs.mkdirSync(dbPath, { recursive: true });
  const firstRun = !fs.existsSync(path.join(dbPath, 'WiredTiger'));
  step(
    firstRun
      ? 'No MongoDB found — starting a built-in one. First run downloads it (~1–3 minutes, one time only)'
      : 'No MongoDB found — starting the built-in one'
  );

  const heartbeat = firstRun ? setInterval(() => process.stdout.write('.'), 4000) : null;
  let mongod;
  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: 'wiredTiger' },
      binary: { version: process.env.MONGOMS_VERSION || '7.0.14' },
    });
  } catch (e) {
    if (heartbeat) clearInterval(heartbeat);
    fail(
      `The built-in MongoDB could not start:\n  ${String(e.message).split('\n')[0]}\n\n` +
      '  Fix options:\n' +
      '   - Check your internet connection (the first run downloads MongoDB), or\n' +
      '   - Install MongoDB Community Server and start it: https://www.mongodb.com/try/download/community, or\n' +
      '   - Use a free MongoDB Atlas database: put its connection string in server/.env as MONGO_URI=...'
    );
  }
  if (heartbeat) { clearInterval(heartbeat); process.stdout.write('\n'); }

  return {
    uri: mongod.getUri(DB_NAME),
    mode: 'embedded',
    autoSeed: true,
    stop: async () => { try { await mongod.stop({ doCleanup: false }); } catch { /* already stopped */ } },
  };
}

/** Loads the sample data (only when the database is empty, unless force is true). */
export function runSeed(uri, { force = false, quiet = true } = {}) {
  const args = ['src/seed.js', ...(force ? ['--force'] : quiet ? ['--if-empty'] : [])];
  const r = spawnSync(process.execPath, args, { cwd: SERVER, stdio: 'inherit', env: { ...process.env, MONGO_URI: uri } });
  return r.status === 0;
}

/* ------------------------------ processes ------------------------------ */
export function serverPort() {
  return Number(process.env.PORT || readEnvFile().PORT || 5000);
}

export async function waitForHealth(port, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

export function openBrowser(url) {
  try {
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    spawn(cmd, { shell: true, stdio: 'ignore', detached: true }).unref();
  } catch { /* opening the browser is a nicety, never fatal */ }
}

/** Runs a child process and prefixes each output line, e.g. "[api] …". */
export function spawnPrefixed(tag, command, args, options) {
  const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
  const forward = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      lines.forEach((l) => l.trim() && out.write(`${color.dim(tag)} ${l}\n`));
    });
    stream.on('end', () => buf.trim() && out.write(`${color.dim(tag)} ${buf}\n`));
  };
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);
  return child;
}

export function ready(lines) {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const bar = '-'.repeat(width);
  log(`\n${color.green(bar)}`);
  lines.forEach((l) => log(`${color.green('|')} ${l.padEnd(width - 3)}`));
  log(`${color.green(bar)}\n`);
}
