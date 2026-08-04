/* MongoDB connection (Mongoose).
   Reads the connection string from process.env.MONGODB_URI.
   Stops the server if the database cannot connect. */
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set. Add it to your .env file.");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1); // stop the server if DB is down
  }
}

module.exports = connectDB;
