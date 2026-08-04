/* Lead logic: create (public) + list/get/delete (admin only). */
const Lead = require("../models/Lead");
const { ok, fail } = require("../utils/response");
const { forwardLead } = require("../utils/forward");

const WEBSITES = ["website_1", "website_2", "website_3"];

// POST /api/leads  (public — used by all 3 websites)
async function createLead(req, res, next) {
  try {
    const b = req.body || {};

    // --- validation ---
    if (!b.websiteSource) return fail(res, "websiteSource is required", 400);
    if (!WEBSITES.includes(b.websiteSource)) return fail(res, "Invalid websiteSource (use website_1, website_2 or website_3)", 400);
    if (!b.fullName || !String(b.fullName).trim()) return fail(res, "fullName is required", 400);
    if (!b.phone || !String(b.phone).trim()) return fail(res, "phone is required", 400);

    const lead = await Lead.create({
      websiteSource: b.websiteSource,
      fullName: b.fullName,
      phone: b.phone,
      email: b.email,
      age: b.age,
      city: b.city,
      programInterest: b.programInterest,
      message: b.message,
      paymentStatus: b.paymentStatus,   // optional (defaults to "not_required")
      paymentAmount: b.paymentAmount,
      paymentId: b.paymentId,
      formType: b.formType,
    });

    // fire-and-forget: push the new lead to n8n / CRM webhook (if configured)
    forwardLead({ event: "lead_created", lead }).catch(() => {});

    return ok(res, "Lead saved successfully", lead, 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/leads  (admin) — supports ?websiteSource= ?paymentStatus= ?formType=
async function getLeads(req, res, next) {
  try {
    const filter = {};
    // Coerce to String so a crafted query like ?paymentStatus[$ne]=x can't inject a
    // Mongo operator object into the find filter (NoSQL operator injection).
    ["websiteSource", "paymentStatus", "formType"].forEach((k) => {
      if (req.query[k] != null && req.query[k] !== "") filter[k] = String(req.query[k]);
    });
    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    return ok(res, "Leads fetched", { count: leads.length, leads });
  } catch (err) {
    next(err);
  }
}

// GET /api/leads/:id  (admin)
async function getLeadById(req, res, next) {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return fail(res, "Lead not found", 404);
    return ok(res, "Lead fetched", lead);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/leads/:id  (admin)
async function deleteLead(req, res, next) {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return fail(res, "Lead not found", 404);
    return ok(res, "Lead deleted", { id: req.params.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { createLead, getLeads, getLeadById, deleteLead };
