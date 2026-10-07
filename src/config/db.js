const mongoose = require('mongoose');

let mongoMemoryServerInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      console.log(`Connecting to MongoDB at configured URI...`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.warn(`Failed to connect to configured MongoDB (${err.message}).`);
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
      console.log(`Falling back to MongoDB in-memory server for development...`);
    }
  }

  // In-memory MongoDB fallback for local development
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServerInstance = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServerInstance.getUri();
    console.log(`MongoDB Memory Server started at ${memoryUri}`);
    const conn = await mongoose.connect(memoryUri);
    console.log(`MongoDB Memory Server connected successfully.`);
    return conn;
  } catch (error) {
    console.error('Fatal error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryServerInstance) {
    await mongoMemoryServerInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
