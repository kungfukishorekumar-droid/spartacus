/* Tiny helpers so every response has the same shape. */
function ok(res, message, data = {}, status = 200) {
  return res.status(status).json({ success: true, message, data });
}
function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}
module.exports = { ok, fail };
