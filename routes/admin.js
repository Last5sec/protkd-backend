const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDB } = require("../db");
const { authMiddleware, SECRET } = require("../middleware/auth");

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username and password required" });
  try {
    const db = await getDB();
    const result = await db.query("SELECT * FROM admins WHERE username = $1", [username]);
    const admin = result.rows[0];
    if (!admin || !bcrypt.compareSync(password, admin.password_hash))
      return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: admin.id, username: admin.username }, SECRET, { expiresIn: "12h" });
    res.json({ token, username: admin.username });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const [totalEvents, openEvents, totalRegs, paidRegs, pendingRegs, totalApps, approvedApps, pendingApps, recentRegs, recentApps] = await Promise.all([
      db.query("SELECT COUNT(*) as n FROM events"),
      db.query("SELECT COUNT(*) as n FROM events WHERE status IN ('Registration Open','Open','Applications Open')"),
      db.query("SELECT COUNT(*) as n FROM event_registrations"),
      db.query("SELECT COUNT(*) as n FROM event_registrations WHERE payment_status='Paid'"),
      db.query("SELECT COUNT(*) as n FROM event_registrations WHERE payment_status='Pending'"),
      db.query("SELECT COUNT(*) as n FROM membership_applications"),
      db.query("SELECT COUNT(*) as n FROM membership_applications WHERE status='Approved'"),
      db.query("SELECT COUNT(*) as n FROM membership_applications WHERE status='Under Review'"),
      db.query("SELECT r.id, r.name, r.email, r.registered_at, r.payment_status, e.title as event_title FROM event_registrations r JOIN events e ON r.event_id = e.id ORDER BY r.registered_at DESC LIMIT 5"),
      db.query("SELECT id, name, email, tier, status, applied_at FROM membership_applications ORDER BY applied_at DESC LIMIT 5"),
    ]);
    res.json({
      events:        { total: parseInt(totalEvents.rows[0].n), open: parseInt(openEvents.rows[0].n) },
      registrations: { total: parseInt(totalRegs.rows[0].n), paid: parseInt(paidRegs.rows[0].n), pending: parseInt(pendingRegs.rows[0].n) },
      memberships:   { total: parseInt(totalApps.rows[0].n), approved: parseInt(approvedApps.rows[0].n), pending: parseInt(pendingApps.rows[0].n) },
      recentRegistrations: recentRegs.rows,
      recentMemberships:   recentApps.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/password", authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: "current_password and new_password required" });
  if (new_password.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
  try {
    const db = await getDB();
    const result = await db.query("SELECT * FROM admins WHERE id = $1", [req.admin.id]);
    const admin = result.rows[0];
    if (!bcrypt.compareSync(current_password, admin.password_hash))
      return res.status(401).json({ error: "Current password is incorrect" });
    const newHash = bcrypt.hashSync(new_password, 10);
    await db.query("UPDATE admins SET password_hash=$1 WHERE id=$2", [newHash, req.admin.id]);
    res.json({ message: "Password updated successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
