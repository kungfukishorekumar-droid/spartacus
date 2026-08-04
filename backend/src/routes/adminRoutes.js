const router = require("express").Router();
const { login } = require("../controllers/adminController");

router.post("/login", login); // POST /api/admin/login -> { token }

module.exports = router;
