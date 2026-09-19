// npm run dev — same as start, but with live reload: Vite dev server (React) + auto-restarting API.
import fs from 'node:fs';
import path from 'node:path';
import {
  CLIENT, SERVER, checkNode, color, ensureEnv, ensureInstalled, externalApi, log, pingApi, ready,
  resolveDatabase, runSeed, serverPort, spawnPrefixed, step,
} from './lib.mjs';

const noOpen = process.argv.includes('--no-open') || !!process.env.NO_OPEN;

checkNode();
log(color.bold('\nShopwise — development mode\n'));

/* ---- Website only: client/public/config.js points at your own API ---- */
const external = externalApi();
if (external) {
  step(`API_URL in client/public/config.js points at ${color.bold(external)}`);
  step('Starting the website only (no built-in database or server).');
  ensureInstalled({ server: false });
  await pingApi(external);
  const viteBin = path.join(CLIENT, 'node_modules', 'vite', 'bin', 'vite.js');
  const site = spawnPrefixed('[web]', process.execPath, [viteBin, ...(noOpen ? [] : ['--open'])], { cwd: CLIENT, env: process.env });
  const stopSite = () => { site.kill(); process.exit(0); };
  process.on('SIGINT', stopSite);
  process.on('SIGTERM', stopSite);
  site.on('exit', (code) => process.exit(code || 0));
  setTimeout(() => ready(['Website (live reload):  http://localhost:5173', `Your API:              ${external}`, '', 'Edit client/public/config.js and refresh the page to change the API address.', 'Press Ctrl+C to stop.']), 2000);
  await new Promise(() => {}); // keep running until Ctrl+C
}

ensureInstalled();
ensureEnv();

const db = await resolveDatabase();
if (db.autoSeed) runSeed(db.uri);

const port = serverPort();
const baseEnv = { ...process.env, MONGO_URI: db.uri, PORT: String(port), NODE_ENV: 'development' };
let stopping = false;

/* API — restarted by us when a file in server/src changes (we own the process, so no orphans) */
let api;
let restarting = false;
function startApi() {
  api = spawnPrefixed('[api]', process.execPath, [path.join('src', 'server.js')], { cwd: SERVER, env: baseEnv });
  api.on('exit', (code) => {
    if (stopping) return;
    if (restarting) { restarting = false; startApi(); return; }
    console.log(`${color.dim('[api]')} ${color.yellow(`stopped (exit ${code}) — save a file in server/src to restart`)}`);
  });
}
startApi();

let timer;
fs.watch(path.join(SERVER, 'src'), { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`${color.dim('[api]')} ${color.yellow('change detected — restarting…')}`);
    if (api.exitCode === null) { restarting = true; api.kill(); } else startApi();
  }, 300);
});

/* React dev server */
const vite = path.join(CLIENT, 'node_modules', 'vite', 'bin', 'vite.js');
const web = spawnPrefixed('[web]', process.execPath, [vite, ...(noOpen ? [] : ['--open'])], {
  cwd: CLIENT,
  env: { ...process.env, API_PORT: String(port) },
});
web.on('exit', (code) => { if (!stopping) { console.error(color.red(`\nThe website dev server stopped (exit ${code}).`)); shutdown(code || 1); } });

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  web.kill();
  await db.stop();
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

step('Waiting for the servers…');
setTimeout(() => {
  ready(['Website (live reload):  http://localhost:5173', `API:                   http://localhost:${port}`, '', 'Edit files and the page updates. Press Ctrl+C to stop.']);
}, 2500);
