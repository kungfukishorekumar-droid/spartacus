/* Razorpay payments: create an order, then verify the payment signature.
   Standard Razorpay Checkout flow:
     1) frontend calls POST /api/payment/order  -> gets { orderId, keyId, amount }
     2) frontend opens Razorpay Checkout with that order
     3) on success, frontend calls POST /api/payment/verify with the 3 razorpay_* fields
   Keys come from .env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET. */
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Lead = require("../models/Lead");
const { forwardLead } = require("../utils/forward");
const { ok, fail } = require("../utils/response");

function configured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}
function instance() {
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

// POST /api/payment/order   (public)  body: { amount (paise), currency?, leadId?, notes? }
async function createOrder(req, res, next) {
  try {
    if (!configured()) return fail(res, "Razorpay is not configured on the server", 500);
    const { amount, currency = "INR", leadId, notes } = req.body || {};
    if (!amount || Number(amount) <= 0) return fail(res, "amount (in paise, e.g. 50000 = ₹500) is required", 400);

    const order = await instance().orders.create({
      amount: Math.round(Number(amount)),
      currency,
      notes: Object.assign({ leadId: leadId || "" }, notes || {}),
    });

    if (leadId) await Lead.findByIdAndUpdate(leadId, { paymentStatus: "pending", paymentAmount: Math.round(Number(amount)) }).catch(() => {});

    return ok(res, "Order created", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // public key id — safe for the frontend
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payment/verify  (public)  body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, leadId? }
async function verifyPayment(req, res, next) {
  try {
    if (!configured()) return fail(res, "Razorpay is not configured on the server", 500);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, leadId } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return fail(res, "Missing payment verification fields", 400);

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    const valid =
      expected.length === String(razorpay_signature).length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpay_signature)));

    if (!valid) {
      if (leadId) await Lead.findByIdAndUpdate(leadId, { paymentStatus: "failed" }).catch(() => {});
      return fail(res, "Invalid payment signature", 400);
    }

    let lead = null;
    if (leadId) {
      lead = await Lead.findByIdAndUpdate(leadId, { paymentStatus: "paid", paymentId: razorpay_payment_id }, { new: true }).catch(() => null);
      if (lead) forwardLead({ event: "payment_paid", lead }).catch(() => {}); // notify n8n/CRM
    }

    return ok(res, "Payment verified", { verified: true, paymentId: razorpay_payment_id });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, verifyPayment };
