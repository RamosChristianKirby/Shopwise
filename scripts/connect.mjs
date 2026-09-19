// npm run connect  -> connects the shop to your MongoDB Atlas (or any MongoDB) database.
//
//   npm run connect                          looks for atlas-credentials.env (project folder or Downloads),
//                                            otherwise asks you to paste the connection string
//   npm run connect -- "C:\path\to\atlas-credentials.env"
//   npm run connect -- "mongodb+srv://user:password@cluster0.xxxx.mongodb.net"
//
// It saves MONGO_URI in server/.env, tests the connection from this computer, and offers to load sample data.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { DB_NAME, ROOT, SERVER, checkNode, color, ensureEnv, ensureInstalled, fail, log, readEnvFile, runSeed, step, warn } from './lib.mjs';

checkNode();
log(color.bold('\nShopwise — connect your database\n'));

const mask = (uri) => uri.replace(/\/\/[^@/]*@/, '//***:***@');

/* ---------- 1. find the connection string ---------- */
function uriFromFile(file) {
  const env = readEnvFile(file);
  return env.MONGODB_URI || env.MONGO_URI || env.DATABASE_URL || '';
}

async function getUri() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (arg && /^mongodb(\+srv)?:\/\//i.test(arg)) return arg;
  const candidates = [
    arg,
    path.join(ROOT, 'atlas-credentials.env'),
    path.join(os.homedir(), 'Downloads', 'atlas-credentials.env'),
  ].filter(Boolean);
  for (const f of candidates) {
    if (fs.existsSync(f)) {
      const u = uriFromFile(f);
      if (u) { step(`Read the connection string from ${f}`); return u; }
      warn(`${f} has no MONGODB_URI line — skipping it.`);
    } else if (f === arg) {
      fail(`File not found: ${f}`);
    }
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  log('Paste your connection string (it starts with mongodb+srv:// or mongodb://).');
  log(color.dim('In Atlas: Database -> Connect -> Drivers, or the MONGODB_URI line of the file Atlas gave you.\n'));
  const answer = (await rl.question('Connection string: ')).trim().replace(/^["']|["']$/g, '');
  rl.close();
  return answer;
}

/** Adds the database name and sensible options if the string doesn't have them. */
function normalise(input) {
  const m = input.trim().match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)(\/[^?]*)?(\?.*)?$/i);
  if (!m) fail('That does not look like a MongoDB connection string. It should start with mongodb+srv:// or mongodb://');
  const dbPath = m[2] && m[2] !== '/' ? m[2] : `/${DB_NAME}`;
  const query = m[3] || (m[1].toLowerCase().startsWith('mongodb+srv') ? '?retryWrites=true&w=majority' : '');
  return `${m[1]}${dbPath}${query}`;
}

const uri = normalise(await getUri());
const placeholder = uri.match(/<[a-z_ ]+>/i);
if (placeholder) fail(`The connection string still contains ${placeholder[0]}. Replace it with the real value (Atlas: Database Access shows your user; use the password you set) and try again.`);

/* ---------- 2. save it in server/.env ---------- */
ensureEnv();
const envPath = path.join(SERVER, '.env');
let text = fs.readFileSync(envPath, 'utf8');
const line = `MONGO_URI=${uri}`;
if (/^\s*MONGO_URI\s*=/m.test(text)) text = text.replace(/^\s*MONGO_URI\s*=.*$/m, () => line);
else if (/^\s*#\s*MONGO_URI\s*=.*$/m.test(text)) text = text.replace(/^\s*#\s*MONGO_URI\s*=.*$/m, () => line);
else text = `${text.replace(/\s*$/, '')}\n\n${line}\n`;
fs.writeFileSync(envPath, text);
step(`Saved MONGO_URI in server/.env  ${color.dim('(' + mask(uri) + ')')}`);

/* ---------- 3. test the connection from this computer ---------- */
ensureInstalled();
const req = createRequire(path.join(SERVER, 'package.json'));
const mongoose = (await import(pathToFileURL(req.resolve('mongoose')).href)).default;
step('Testing the connection (up to 15 seconds)…');
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: Number(process.env.CONNECT_TIMEOUT_MS) || 15000 });
} catch (e) {
  const msg = String(e.message || e);
  log('');
  console.error(color.red('x Could not connect: ') + msg.split('\n')[0]);
  log('');
  if (/auth|credentials|bad auth/i.test(msg)) {
    log('  The username or password was rejected. In Atlas: Database Access -> your user -> Edit Password,');
    log('  then run  npm run connect  again with the new password.');
  } else if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
    log('  The address could not be found. Check the cluster address, and your internet connection.');
    log('  (Some networks block the mongodb+srv:// lookup — try another network or Atlas’s "standard connection string".)');
  } else if (!/mongodb\.net|\+srv/i.test(uri)) {
    log('  Nothing is answering at that address. Is MongoDB running, and are the host and port right?');
  } else {
    log('  Most likely Atlas is blocking this computer. In Atlas: Security -> Network Access -> Add IP Address');
    log('  -> "Add Current IP Address" -> Confirm, wait a minute, then run  npm run connect  again.');
  }
  log(color.dim('\n  The connection string is already saved in server/.env, so no need to paste it again — just retry.'));
  process.exit(1);
}
const users = await mongoose.connection.db.collection('users').estimatedDocumentCount();
const products = await mongoose.connection.db.collection('products').estimatedDocumentCount();
step(`${color.green('Connected!')} Database "${mongoose.connection.name}" — ${users} users, ${products} products.`);

/* ---------- 4. sample data ---------- */
if (products === 0) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const yes = !/^n/i.test((await rl.question('\nThere are no products yet. Load the sample categories and products? (no accounts are created) (Y/n) ')).trim());
  rl.close();
  await mongoose.disconnect();
  if (yes) {
    if (!runSeed(uri, { quiet: false })) fail('Loading the sample data failed — see above.');
  } else {
    log('\nOK. Run  npm run seed  later if you change your mind.');
  }
} else {
  await mongoose.disconnect();
}

log(`\n${color.green('All set.')} Start the shop with  ${color.bold('npm start')}  (or  npm run dev ).`);
log(color.dim('Create your account on the website (Register). To make it an admin, set role to "admin" on that user in Atlas -> Browse Collections -> users.\n'));
process.exit(0);
