const router = require("express").Router();
const { createOrder, verifyPayment } = require("../controllers/paymentController");

router.post("/order", createOrder);   // create a Razorpay order (public)
router.post("/verify", verifyPayment); // verify payment signature (public)

module.exports = router;
