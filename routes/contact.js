const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { authMiddleware } = require("../middleware/auth");
const { notifyContact, confirmContact } = require("../email");

router.post("/", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ error: "name, email, and message are required" });

  try {
    const db = await getDB();
    await db.query(
      "INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4)",
      [name, email.toLowerCase().trim(), subject || "", message]
    );

    Promise.all([
      notifyContact({ name, email, subject, message }),
      confirmContact({ name, email, subject }),
    ]).catch((err) => console.error("Email error:", err.message));

    res.status(201).json({ message: "Message received! We'll get back to you shortly." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query("SELECT * FROM contact_messages ORDER BY received_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query("DELETE FROM contact_messages WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Message not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;