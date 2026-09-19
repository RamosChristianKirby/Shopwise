import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { createApp } from './app.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Run "npm start" from the project folder (it creates server/.env for you), or copy server/.env.example to server/.env and edit it.');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 5000;

try {
  await connectDB();
} catch (err) {
  console.error(`\n${err.message}\n`);
  process.exit(1);
}

const server = createApp().listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Close the other program (or an old copy of this app), or set a different PORT in server/.env.\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

async function shutdown() {
  server.close();
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
