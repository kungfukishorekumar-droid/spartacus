/* Simple health check — reports whether the DB is connected. */
const mongoose = require("mongoose");

function health(req, res) {
  const connected = mongoose.connection.readyState === 1; // 1 = connected
  res.json({
    success: true,
    message: "Backend is running",
    database: connected ? "connected" : "disconnected",
  });
}

module.exports = { health };
