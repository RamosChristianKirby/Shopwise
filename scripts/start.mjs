// npm start — one command: install, configure, build, start MongoDB + the server, open the browser.
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  CLIENT, SERVER, checkNode, color, ensureBuilt, ensureEnv, ensureInstalled, externalApi, fail, log,
  openBrowser, pingApi, ready, resolveDatabase, runSeed, serverPort, spawnPrefixed, step, waitForHealth,
} from './lib.mjs';

const noOpen = process.argv.includes('--no-open') || !!process.env.NO_OPEN;

checkNode();
log(color.bold('\nShopwise — starting up\n'));

/* ---- Website only: client/public/config.js points at your own API, so no database or server is needed ---- */
const external = externalApi();
if (external) {
  step(`API_URL in client/public/config.js points at ${color.bold(external)}`);
  step('Starting the website only (no built-in database or server).');
  ensureInstalled({ server: false });
  ensureBuilt();
  await pingApi(external);
  const webPort = serverPort();
  const vite = path.join(CLIENT, 'node_modules', 'vite', 'bin', 'vite.js');
  const web = spawnPrefixed('[web]', process.execPath, [vite, 'preview', '--host', '--port', String(webPort), '--strictPort', ...(noOpen ? [] : ['--open'])], { cwd: CLIENT, env: process.env });
  const stop = () => { web.kill(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  web.on('exit', (code) => { if (code) console.error(color.red(`\nThe website stopped (exit code ${code}). Is port ${webPort} already in use?`)); process.exit(code || 0); });
  setTimeout(() => ready([`Website:   http://localhost:${webPort}`, `Your API:  ${external}`, '', 'To change the API address, edit client/public/config.js and run npm start again.', 'Press Ctrl+C to stop.']), 1500);
  await new Promise(() => {}); // keep running until Ctrl+C
}

ensureInstalled();
ensureEnv();

const db = await resolveDatabase();
if (db.autoSeed) runSeed(db.uri); // only loads sample data when the database is empty
ensureBuilt();

const port = serverPort();
step(`Starting the server on port ${port}…`);
const server = spawn(process.execPath, [path.join('src', 'server.js')], {
  cwd: SERVER,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production', MONGO_URI: db.uri, PORT: String(port) },
});

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  server.kill();
  await db.stop();
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
server.on('exit', (code) => {
  if (!stopping) {
    console.error(color.red(`\nThe server stopped (exit code ${code}). See the messages above.`));
    shutdown(code || 1);
  }
});

if (!(await waitForHealth(port))) fail(`The server did not start on port ${port}. Is something else using that port? Set PORT in server/.env to change it.`);

const url = `http://localhost:${port}`;
ready([`Shopwise is running:  ${url}`, `Admin panel:          ${url}/admin  (needs an account with role "admin" — see README)`, '', 'Press Ctrl+C to stop.']);
if (!noOpen) openBrowser(url);
