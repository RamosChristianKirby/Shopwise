// npm run seed   -> load sample data if the database is empty
// npm run reset  -> WIPE everything and reload the sample data
import { checkNode, ensureEnv, ensureInstalled, fail, log, resolveDatabase, runSeed, warn } from './lib.mjs';

const force = process.argv.includes('--force');

checkNode();
ensureInstalled();
ensureEnv();

if (force) warn('This will delete all products, categories and orders in the database (user accounts are kept).');
const db = await resolveDatabase();
const ok = runSeed(db.uri, { force, quiet: false });
await db.stop();
if (!ok) fail('Seeding failed — see the messages above. (If "npm start" is running, stop it first.)');
log('');
process.exit(0);
