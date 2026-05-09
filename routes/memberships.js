const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.get("/fees", async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query("SELECT * FROM membership_fees");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/fees/:tier", authMiddleware, async (req, res) => {
  const { price, period } = req.body;
  try {
    const db = await getDB();
    await db.query("UPDATE membership_fees SET price=$1, period=$2, updated_at=NOW() WHERE tier=$3", [price, period, req.params.tier]);
    res.json({ message: "Fee updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  const { tier, name, email, phone, academy, state, experience, notes } = req.body;
  if (!tier || !name || !email || !phone)
    return res.status(400).json({ error: "tier, name, email, and phone are required" });
  try {
    const db = await getDB();
    const result = await db.query(
      "INSERT INTO membership_applications (tier,name,email,phone,academy,state,experience,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
      [tier, name, email.toLowerCase().trim(), phone, academy||null, state||null, experience||null, notes||null]
    );
    res.status(201).json({ message: "Application submitted!", application_id: result.rows[0].id });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

router.get("/", authMiddleware, async (req, res) => {
  const { status, payment_status } = req.query;
  const conditions = [], params = [];
  if (status)         { conditions.push(`status = $${params.length+1}`);         params.push(status); }
  if (payment_status) { conditions.push(`payment_status = $${params.length+1}`); params.push(payment_status); }
  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
  try {
    const db = await getDB();
    const result = await db.query(`SELECT * FROM membership_applications${where} ORDER BY applied_at DESC`, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;
  const valid = ["Under Review","Approved","Rejected","On Hold"];
  if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of: ${valid.join(", ")}` });
  try {
    const db = await getDB();
    const result = await db.query("UPDATE membership_applications SET status=$1 WHERE id=$2", [status, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Application not found" });
    res.json({ message: "Status updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id/payment", authMiddleware, async (req, res) => {
  const { payment_status } = req.body;
  const valid = ["Pending","Paid","Refunded","Waived"];
  if (!valid.includes(payment_status)) return res.status(400).json({ error: `payment_status must be one of: ${valid.join(", ")}` });
  try {
    const db = await getDB();
    const result = await db.query("UPDATE membership_applications SET payment_status=$1 WHERE id=$2", [payment_status, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Application not found" });
    res.json({ message: "Payment status updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;