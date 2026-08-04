const router = require("express").Router();
const requireAdmin = require("../middleware/authMiddleware");
const { createLead, getLeads, getLeadById, deleteLead } = require("../controllers/leadController");

router.post("/", createLead);              // PUBLIC  — websites submit leads
router.get("/", requireAdmin, getLeads);   // ADMIN   — list + filter leads
router.get("/:id", requireAdmin, getLeadById); // ADMIN — one lead
router.delete("/:id", requireAdmin, deleteLead); // ADMIN — delete lead

module.exports = router;
