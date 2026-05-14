const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { authMiddleware } = require("../middleware/auth");
const { notifyEventRegistration, confirmEventRegistration } = require("../email");

router.post("/", async (req, res) => {
  const {
    event_id,
    // Personal Info
    first_name,
    last_name,
    father_name,
    email,
    phone,
    dob,
    gender,
    // Address
    address_line1,
    address_line2,
    city,
    zip_code,
    state,
    country,
    // Taekwondo
    belt_rank,
    taekwondo_style,
    category,
    // Club & Coach
    club_name,
    coach_name,
    coach_phone,
    // Emergency & Notes
    emergency_contact,
    notes,
    // Photo
    photo_url,
  } = req.body;

  // Validate required fields
  if (!event_id || !first_name || !last_name || !email || !phone || !state) {
    return res.status(400).json({
      error: "Required fields: event_id, first_name, last_name, email, phone, state",
    });
  }

  try {
    const db = await getDB();

    // Check if event exists
    const eventRes = await db.query("SELECT * FROM events WHERE id = $1", [event_id]);
    if (!eventRes.rows.length) {
      return res.status(404).json({ error: "Event not found" });
    }
    const event = eventRes.rows[0];

    // Check for duplicate registration by email for this event
    const dupRes = await db.query(
      "SELECT id FROM event_registrations WHERE event_id = $1 AND email = $2",
      [event_id, email.toLowerCase().trim()]
    );
    if (dupRes.rows.length) {
      return res.status(409).json({
        error: "This email is already registered for this event",
      });
    }

    // Construct full name for backwards compatibility
    const full_name = `${first_name} ${last_name}`.trim();

    // Insert the registration with all fields
    const result = await db.query(
      `INSERT INTO event_registrations (
        event_id,
        name,
        first_name,
        last_name,
        father_name,
        email,
        phone,
        dob,
        gender,
        address_line1,
        address_line2,
        city,
        zip_code,
        state,
        country,
        belt_rank,
        taekwondo_style,
        category,
        club_name,
        coach_name,
        coach_phone,
        emergency_contact,
        notes,
        photo_url
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING id`,
      [
        event_id,
        full_name,
        first_name,
        last_name,
        father_name || null,
        email.toLowerCase().trim(),
        phone,
        dob || null,
        gender || null,
        address_line1 || null,
        address_line2 || null,
        city || null,
        zip_code || null,
        state,
        country || "India",
        belt_rank || null,
        taekwondo_style || null,
        category || null,
        club_name || null,
        coach_name || null,
        coach_phone || null,
        emergency_contact || null,
        notes || null,
        photo_url || null,
      ]
    );

    const registration_id = result.rows[0].id;

    // Send emails (async - don't block response)
    Promise.all([
      notifyEventRegistration({
        registration_id,
        first_name,
        last_name,
        email,
        phone,
        dob,
        gender,
        state,
        city,
        belt_rank,
        category,
        club_name,
        coach_name,
        emergency_contact,
        notes,
        event_title: event.title,
        reg_fee: event.reg_fee,
      }),
      confirmEventRegistration({
        first_name,
        last_name,
        email,
        registration_id,
        event_title: event.title,
        event_date: event.date,
        event_venue: `${event.venue}, ${event.city}`,
        reg_fee: event.reg_fee,
        category,
        belt_rank,
      }),
    ]).catch((err) => console.error("Email notification error:", err.message));

    res.status(201).json({
      message: "Registration successful!",
      registration_id,
      event_title: event.title,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// GET all registrations (admin)
router.get("/", authMiddleware, async (req, res) => {
  const { event_id, payment_status } = req.query;
  const conditions = [];
  const params = [];

  if (event_id) {
    conditions.push(`r.event_id = $${params.length + 1}`);
    params.push(event_id);
  }
  if (payment_status) {
    conditions.push(`r.payment_status = $${params.length + 1}`);
    params.push(payment_status);
  }

  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";

  try {
    const db = await getDB();
    const result = await db.query(
      `SELECT 
        r.*,
        e.title as event_title,
        e.date as event_date,
        e.reg_fee
      FROM event_registrations r
      JOIN events e ON r.event_id = e.id
      ${where}
      ORDER BY r.registered_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single registration (admin)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query(
      `SELECT
        r.*,
        e.title as event_title,
        e.date as event_date,
        e.reg_fee
      FROM event_registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE payment status (admin)
router.patch("/:id/payment", authMiddleware, async (req, res) => {
  const { payment_status } = req.body;
  const valid = ["Pending", "Paid", "Refunded", "Waived"];

  if (!valid.includes(payment_status)) {
    return res.status(400).json({
      error: `payment_status must be one of: ${valid.join(", ")}`,
    });
  }

  try {
    const db = await getDB();
    const result = await db.query(
      "UPDATE event_registrations SET payment_status = $1 WHERE id = $2",
      [payment_status, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json({ message: "Payment status updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE registration (admin)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query("DELETE FROM event_registrations WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json({ message: "Registration removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET registration stats (admin)
router.get("/stats/summary", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();

    const byEvent = await db.query(
      `SELECT
        e.id,
        e.title,
        COUNT(r.id) as total,
        SUM(CASE WHEN r.payment_status='Paid' THEN 1 ELSE 0 END) as paid
      FROM events e
      LEFT JOIN event_registrations r ON e.id = r.event_id
      GROUP BY e.id, e.title
      ORDER BY total DESC`
    );

    const overall = await db.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN payment_status='Paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN payment_status='Pending' THEN 1 ELSE 0 END) as pending
      FROM event_registrations`
    );

    res.json({
      overall: overall.rows[0],
      byEvent: byEvent.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;