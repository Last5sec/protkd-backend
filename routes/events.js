const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.get("/", async (req, res) => {
  const { type, status } = req.query;
  const conditions = [], params = [];
  if (type)   { conditions.push(`type = $${params.length + 1}`);   params.push(type); }
  if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
  try {
    const db = await getDB();
    const result = await db.query("SELECT * FROM events" + where + " ORDER BY start_date ASC", params);
    const parsed = result.rows.map((e) => ({
      ...e,
      categories: JSON.parse(e.categories || "[]"),
      featured: !!e.featured,
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query("SELECT * FROM events WHERE id = $1", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Event not found" });
    const e = result.rows[0];
    res.json({ ...e, categories: JSON.parse(e.categories || "[]"), featured: !!e.featured });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  const { id, title, date, start_date, time, venue, city, type, status, image, featured, summary, description, categories, prize, reg_fee } = req.body;
  if (!id || !title || !date || !start_date || !venue || !city || !type)
    return res.status(400).json({ error: "Missing required fields" });
  try {
    const db = await getDB();
    await db.query(
      `INSERT INTO events (id,title,date,start_date,time,venue,city,type,status,image,featured,summary,description,categories,prize,reg_fee)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [id, title, date, start_date, time||"", venue, city, type,
       status||"Registration Open", image||"", !!featured,
       summary||"", description||"", JSON.stringify(categories||[]), prize||"", reg_fee||"₹500"]
    );
    res.status(201).json({ message: "Event created", id });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Event ID already exists" });
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const existing = await db.query("SELECT * FROM events WHERE id = $1", [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Event not found" });
    const e = existing.rows[0];
    const { title, date, start_date, time, venue, city, type, status, image, featured, summary, description, categories, prize, reg_fee } = req.body;
    await db.query(
      `UPDATE events SET
        title=$1, date=$2, start_date=$3, time=$4, venue=$5, city=$6, type=$7,
        status=$8, image=$9, featured=$10, summary=$11, description=$12,
        categories=$13, prize=$14, reg_fee=$15, updated_at=NOW()
       WHERE id=$16`,
      [
        title??e.title, date??e.date, start_date??e.start_date, time??e.time,
        venue??e.venue, city??e.city, type??e.type, status??e.status,
        image??e.image, featured!==undefined ? !!featured : e.featured,
        summary??e.summary, description??e.description,
        categories ? JSON.stringify(categories) : e.categories,
        prize??e.prize, reg_fee??e.reg_fee, req.params.id
      ]
    );
    res.json({ message: "Event updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const result = await db.query("DELETE FROM events WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;