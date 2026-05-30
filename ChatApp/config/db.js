/**
 * config/db.js
 * Connects to MongoDB using the MONGODB_URI environment variable.
 * Exits the process if the connection fails on startup.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1); // stop the app if DB can't connect
  }
};

module.exports = connectDB;