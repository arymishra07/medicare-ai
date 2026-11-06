const path = require('path');
const fs = require('fs/promises');
const mongoose = require('mongoose');

let memoryServer = null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startMemoryDatabase() {
  // Imported lazily so production deployments never load the dev-only package.
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const dbPath = path.resolve(__dirname, '..', '.mongo-data');
  await fs.mkdir(dbPath, { recursive: true });

  const start = () =>
    MongoMemoryServer.create({
      instance: {
        dbPath,
        storageEngine: 'wiredTiger',
      },
    });

  try {
    memoryServer = await start();
  } catch (error) {
    console.warn('[db] Could not reopen local dev database, starting fresh:', error.message);
    await fs.rm(dbPath, { recursive: true, force: true }).catch(() => {});
    memoryServer = await start();
  }

  const uri = memoryServer.getUri('medicare_ai');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log(`[db] In-memory MongoDB ready at ${uri}`);
  console.log('[db] Data is stored in backend/.mongo-data and survives restarts.');
  return uri;
}

async function connectDB() {
  const uri = process.env.MONGO_URI?.trim();
  const forceMemory =
    process.env.USE_IN_MEMORY_DB === 'true' || !uri || uri === 'memory';

  if (forceMemory) {
    await startMemoryDatabase();
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`[db] Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    const allowFallback =
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_MEMORY_FALLBACK !== 'false';

    if (!allowFallback) {
      console.error('[db] MongoDB connection failed:', error.message);
      throw error;
    }

    console.warn('[db] MongoDB unreachable. Falling back to the local in-memory database.');
    console.warn('[db] Set MONGO_URI (MongoDB Atlas/local) in backend/.env for production storage.');
    await wait(300);
    await startMemoryDatabase();
  }

  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.connection.close().catch(() => {});
  if (memoryServer) {
    await memoryServer.stop().catch(() => {});
    memoryServer = null;
  }
}

module.exports = { connectDB, disconnectDB };
