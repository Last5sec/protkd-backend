const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { authMiddleware } = require("../middleware/auth");
const { notifyEventRegistration, confirmEventRegistration } = require("../email");

router.post("/", async (req, res) => {
  const { event_id, name, email, phone, dob, belt_rank, category, state, academy, emergency_contact, notes } = req.body;
  if (!event_id || !name || !email || !phone)
    return res.status(400).json({ error: "event_id, name, email, and phone are required" });
  try {
    const db = await getDB();
    const eventRes = await db.query("SELECT * FROM events WHERE id = $1", [event_id]);
    if (!eventRes.rows.length) return res.status(404).json({ error: "Event not found" });
    const event = eventRes.rows[0];
    const dupRes = await db.query("SELECT id FROM event_registrations WHERE event_id = $1 AND email = $2", [event_id, email.toLowerCase().trim()]);
    if (dupRes.rows.length) return res.status(409).json({ error: "This email is already registered for this event" });
    const result = await db.query(
      "INSERT INTO event_registrations (event_id,name,email,phone,dob,belt_rank,category,state,academy,emergency_contact,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id",
      [event_id, name, email.toLowerCase().trim(), phone, dob||null, belt_rank||null, category||null, state||null, academy||null, emergency_contact||null, notes||null]
    );
    const registration_id = result.rows[0].id;
    Promise.all([
      notifyEventRegistration({ registration_id, name, email, phone, dob, belt_rank, category, state, academy, emergency_contact, notes, event_title: event.title, reg_fee: event.reg_fee }),
      confirmEventRegistration({ name, email, registration_id, event_title: event.title, event_date: event.date, event_venue: `${event.venue}, ${event.city}`, reg_fee: event.reg_fee, category, belt_rank }),
    ]).catch(err => console.error("Email error:", err.message));
    res.status(201).json({ message: "Registration successful!", registration_id, event_title: event.title });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

router.get("/", authMiddleware, async (req, res) => {
  const { event_id, payment_status } = req.query;
  const conditions = [], params = [];
  if (event_id)       { conditions.push(`r.event_id = $${params.length+1}`);       params.push(event_id); }
  if (payment_status) { conditions.push(`r.payment_status = $${params.length+1}`); params.push(payment_status); }
  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
  try {
    const db = await getDB();
    const result = await db.query(`SELECT r.*, e.title as event_title, e.date as event_date, e.reg_fee FROM event_registrations r JOIN events e ON r.event_id = e.id${where} ORDER BY r.registered_at DESC`, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query("SELECT r.*, e.title as event_title, e.date as event_date, e.reg_fee FROM event_registrations r JOIN events e ON r.event_id = e.id WHERE r.id = $1", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Registration not found" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id/payment", authMiddleware, async (req, res) => {
  const { payment_status } = req.body;
  const valid = ["Pending","Paid","Refunded","Waived"];
  if (!valid.includes(payment_status)) return res.status(400).json({ error: `payment_status must be one of: ${valid.join(", ")}` });
  try {
    const db = await getDB();
    const result = await db.query("UPDATE event_registrations SET payment_status = $1 WHERE id = $2", [payment_status, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Registration not found" });
    res.json({ message: "Payment status updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query("DELETE FROM event_registrations WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Registration not found" });
    res.json({ message: "Registration removed" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/stats/summary", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const byEvent = await db.query("SELECT e.id, e.title, COUNT(r.id) as total, SUM(CASE WHEN r.payment_status='Paid' THEN 1 ELSE 0 END) as paid FROM events e LEFT JOIN event_registrations r ON e.id = r.event_id GROUP BY e.id ORDER BY total DESC");
    const overall = await db.query("SELECT COUNT(*) as total, SUM(CASE WHEN payment_status='Paid' THEN 1 ELSE 0 END) as paid, SUM(CASE WHEN payment_status='Pending' THEN 1 ELSE 0 END) as pending FROM event_registrations");
    res.json({ overall: overall.rows[0], byEvent: byEvent.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;