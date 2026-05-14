const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const { initDB } = require("./db");
const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ── Init database ─────────────────────────────────────────────
initDB().catch(err => console.error("DB init error:", err.message));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/events",        require("./routes/events"));
app.use("/api/registrations", require("./routes/registrations"));
app.use("/api/memberships",   require("./routes/memberships"));
app.use("/api/admin",         require("./routes/admin"));
app.use("/api/contact",       require("./routes/contact"));
app.use("/api/upload",        require("./routes/upload"));
app.use("/api/payments",      require("./routes/payments"));
// ── Health check ──────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`✅ PTF India backend running on http://localhost:${PORT}`);
});