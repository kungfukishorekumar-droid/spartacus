const router = require("express").Router();
const { health } = require("../controllers/healthController");

router.get("/", health); // GET /api/health

module.exports = router;
