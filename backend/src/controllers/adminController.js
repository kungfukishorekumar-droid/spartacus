/* Admin login: password -> signed JWT (used for the protected lead routes). */
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { ok, fail } = require("../utils/response");

// Constant-time compare that doesn't leak length (hash both to a fixed 32 bytes first).
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// POST /api/admin/login   body: { password }
function login(req, res) {
  const { password } = req.body || {};
  if (typeof password !== "string" || !password) return fail(res, "password is required", 400);
  if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    return fail(res, "Admin login is not configured on the server", 500);
  }
  if (!safeEqual(password, process.env.ADMIN_PASSWORD)) return fail(res, "Wrong password", 401);

  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return ok(res, "Login successful", { token, tokenType: "Bearer", expiresIn: "7d" });
}

module.exports = { login };
