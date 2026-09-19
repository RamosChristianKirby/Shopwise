import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/mern_shop';

export default async function connectDB(uri = process.env.MONGO_URI || DEFAULT_URI) {
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    const shown = uri.replace(/\/\/[^@/]*@/, '//***@');
    throw new Error(
      `Could not connect to MongoDB (${shown}): ${err.message}\n` +
      '  - Easiest: run "npm start" from the project folder — it starts a built-in MongoDB for you.\n' +
      '  - Or start your own MongoDB, or put an Atlas connection string in server/.env as MONGO_URI.'
    );
  }
}
