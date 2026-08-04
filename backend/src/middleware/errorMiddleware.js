/* Central 404 + error handling so responses stay consistent. */
function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Bad Mongo ObjectId (e.g. GET /api/leads/xyz) -> 400 instead of 500
  if (err && err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }
  // Mongoose validation error -> 400
  if (err && err.name === "ValidationError") {
    return res.status(400).json({ success: false, message: err.message });
  }
  console.error("Error:", err.message);
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || "Server error" });
}

module.exports = { notFound, errorHandler };
