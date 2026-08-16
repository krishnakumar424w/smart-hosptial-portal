import mongoose from 'mongoose';

const connectDB = async () => {
  mongoose.set('bufferCommands', false);
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-hospital';
  
  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    global.isMongoConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    global.isMongoConnected = false;
    console.warn(`MongoDB not available (${error.message}). Using in-memory fallback data store.`);
  }
};

export default connectDB;
