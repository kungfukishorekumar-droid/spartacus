/* App entry point.
   Loads env -> sets security/CORS -> mounts routes -> connects DB -> starts server. */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// --- security + request logging ---
app.use(helmet());
app.use(morgan("dev"));

// --- CORS: only allow the 3 website origins from .env ---
const ALLOWED = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // allow tools with no Origin header (curl / Postman / server-to-server)
      if (!origin) return cb(null, true);
      if (ALLOWED.length === 0 || ALLOWED.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS: " + origin));
    },
  })
);

// --- body parsing ---
app.use(express.json({ limit: "1mb" }));

// --- routes ---
app.use("/api/health", require("./routes/healthRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/leads", require("./routes/leadRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));

// --- 404 + errors (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB first; only start the server if the DB connects.
function start() {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
      console.log(`   Allowed origins: ${ALLOWED.length ? ALLOWED.join(", ") : "(none set)"}`);
    });
  });
}

// Start only when run directly (node src/server.js). Exported for testing / dev runner.
if (require.main === module) start();
module.exports = app;
module.exports.start = start;
