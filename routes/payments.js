const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { getDB } = require("../db");
const { notifyEventRegistration, confirmEventRegistration } = require("../email");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order
router.post("/create-order", async (req, res) => {
  try {
    const { registration_id, amount, description } = req.body;

    if (!registration_id) {
      return res.status(400).json({ error: "registration_id is required" });
    }
    if (!amount || Number(amount) < 1) {
      return res.status(400).json({ error: "Amount must be at least 1 rupee" });
    }

    const db = await getDB();
    const regRes = await db.query("SELECT * FROM event_registrations WHERE id = $1", [registration_id]);
    if (!regRes.rows.length) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `registration_${registration_id}_${Date.now()}`,
      notes: {
        registration_id: String(registration_id),
        description,
      },
    });

    await db.query(
      `UPDATE event_registrations
       SET razorpay_order_id = $1,
           payment_status = 'Pending'
       WHERE id = $2`,
      [order.id, registration_id]
    );

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/verify
router.post("/verify", async (req, res) => {
  try {
    const { registration_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!registration_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment fields" });
    }

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const calculatedSignature = hmac.digest("hex");

    if (calculatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const db = await getDB();
    const regRes = await db.query("SELECT * FROM event_registrations WHERE id = $1", [registration_id]);
    if (!regRes.rows.length) {
      return res.status(404).json({ error: "Registration not found" });
    }

    await db.query(
      `UPDATE event_registrations
       SET payment_status = 'Paid',
           razorpay_order_id = $1,
           razorpay_payment_id = $2
       WHERE id = $3`,
      [razorpay_order_id, razorpay_payment_id, registration_id]
    );

    const reg = regRes.rows[0];
    const eventRes = await db.query("SELECT * FROM events WHERE id = $1", [reg.event_id]);
    const event = eventRes.rows[0] || {};

    res.json({ success: true, message: "Payment verified", registration_id });

    setTimeout(async () => {
      try {
        await Promise.all([
          notifyEventRegistration({
            registration_id: reg.id,
            first_name: reg.first_name,
            last_name: reg.last_name,
            email: reg.email,
            phone: reg.phone,
            dob: reg.dob,
            gender: reg.gender,
            state: reg.state,
            city: reg.city,
            belt_rank: reg.belt_rank,
            category: reg.category,
            club_name: reg.club_name,
            coach_name: reg.coach_name,
            emergency_contact: reg.emergency_contact,
            notes: reg.notes,
            event_title: event.title,
            reg_fee: event.reg_fee,
          }),
          confirmEventRegistration({
            name: `${reg.first_name} ${reg.last_name}`.trim(),
            email: reg.email,
            registration_id: reg.id,
            event_title: event.title,
            event_date: event.date,
            event_venue: `${event.venue}, ${event.city}`,
            reg_fee: event.reg_fee,
            category: reg.category,
            belt_rank: reg.belt_rank,
          }),
        ]);
        console.log(`✅ Confirmation emails sent for registration ${registration_id}`);
      } catch (err) {
        console.error("Email sending error:", err.message);
      }
    }, 100);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/:registration_id
router.get("/:registration_id", async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query(
      `SELECT id, email, payment_status, razorpay_payment_id, razorpay_order_id, created_at
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

// POST /api/payments/webhook
router.post("/webhook", express.json(), async (req, res) => {
  try {
    const event = req.body;
    const signature = req.headers["x-razorpay-signature"];
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(JSON.stringify(event));
    const calculatedSignature = hmac.digest("hex");

    if (calculatedSignature !== signature) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    if (event.event === "payment.authorized") {
      const paymentId = event.payload.payment.entity.id;
      const orderId = event.payload.payment.entity.order_id;

      console.log(`✅ Webhook: Payment authorized - ${paymentId}`);

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
    console.error("Webhook error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;