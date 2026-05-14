const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { getDB } = require("../db");

// Initialize Razorpay with your API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────────
// POST /api/payments/create-order
// Create a Razorpay order for event registration
// Body: { registration_id, amount, description }
// ─────────────────────────────────────────────────────────────
router.post("/create-order", async (req, res) => {
  try {
    const { amount, description } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
      notes: { description },
    });

    res.json({ orderId: order.id });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payments/verify
// Verify Razorpay payment signature and update registration
// Body: {
//   registration_id,
//   razorpay_order_id,
//   razorpay_payment_id,
//   razorpay_signature
// }
// ─────────────────────────────────────────────────────────────
router.post("/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment fields" });
    }

    // Verify signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const calculatedSignature = hmac.digest("hex");

    if (calculatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    res.json({ success: true, message: "Payment verified" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/payments/:registration_id
// Get payment status for a registration
// ─────────────────────────────────────────────────────────────
router.get("/:registration_id", async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query(
      `SELECT 
        id, 
        email,
        payment_status, 
        razorpay_payment_id, 
        razorpay_order_id,
        created_at
       FROM event_registrations
       WHERE id = $1`,
      [req.params.registration_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// Razorpay webhook for handling payment events
// (Optional: Set up in Razorpay dashboard)
// ─────────────────────────────────────────────────────────────
router.post("/webhook", express.json(), async (req, res) => {
  try {
    const event = req.body;

    // Verify webhook signature
    const signature = req.headers["x-razorpay-signature"];
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(JSON.stringify(event));
    const calculatedSignature = hmac.digest("hex");

    if (calculatedSignature !== signature) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    // Handle payment events
    if (event.event === "payment.authorized") {
      const paymentId = event.payload.payment.entity.id;
      const orderId = event.payload.payment.entity.order_id;

      console.log(`✅ Webhook: Payment authorized - ${paymentId}`);

      // Update database if needed
      const db = await getDB();
      await db.query(
        `UPDATE event_registrations 
         SET payment_status = 'Paid', razorpay_payment_id = $1
         WHERE razorpay_order_id = $2`,
        [paymentId, orderId]
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;