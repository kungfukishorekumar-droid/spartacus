/* Admin protection via signed JWT.
   Admin logs in at POST /api/admin/login (password) -> receives a JWT.
   That JWT is sent as:  Authorization: Bearer <token>
   and verified here against process.env.JWT_SECRET. */
const jwt = require("jsonwebtoken");
const { fail } = require("../utils/response");

module.exports = function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const parts = header.split(" ");
  const token = parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : null;

  if (!token) return fail(res, "Missing admin token", 401);
  if (!process.env.JWT_SECRET) return fail(res, "Server JWT is not configured", 500);

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return fail(res, "Invalid or expired admin token", 403);
  }
};
