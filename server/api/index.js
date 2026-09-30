// Vercel entry point: runs the Express app as a serverless function.
// Local development still uses src/server.js (npm start / npm run dev).
import connectDB from '../src/config/db.js';
import { createApp } from '../src/app.js';

const app = createApp();
app.set('trust proxy', 1); // Vercel sits behind a proxy; needed for rate limiting and req.ip

// Reuse one MongoDB connection across requests while the function stays warm.
let connecting = null;

export default async function handler(req, res) {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Server is not configured: set MONGO_URI and JWT_SECRET in Vercel → Settings → Environment Variables.' });
  }
  try {
    connecting ??= connectDB(process.env.MONGO_URI);
    await connecting;
  } catch (err) {
    connecting = null; // try again on the next request
    console.error(err.message);
    return res.status(500).json({ message: 'Could not connect to the database' });
  }
  return app(req, res);
}
