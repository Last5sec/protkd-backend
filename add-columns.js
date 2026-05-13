require("dotenv").config();
const { pool } = require("./db");

async function addColumns() {
  const client = await pool.connect();
  try {
    // Add new columns to event_registrations
    await client.query(`
      ALTER TABLE event_registrations
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT,
      ADD COLUMN IF NOT EXISTS father_name TEXT,
      ADD COLUMN IF NOT EXISTS gender TEXT,
      ADD COLUMN IF NOT EXISTS address_line1 TEXT,
      ADD COLUMN IF NOT EXISTS address_line2 TEXT,
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS zip_code TEXT,
      ADD COLUMN IF NOT EXISTS country TEXT,
      ADD COLUMN IF NOT EXISTS club_name TEXT,
      ADD COLUMN IF NOT EXISTS coach_name TEXT,
      ADD COLUMN IF NOT EXISTS coach_phone TEXT,
      ADD COLUMN IF NOT EXISTS taekwondo_style TEXT,
      ADD COLUMN IF NOT EXISTS registration_cost INTEGER,
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);
    console.log("✅ Columns added!");
  } finally {
    client.release();
    process.exit(0);
  }
}

addColumns().catch(err => { console.error(err); process.exit(1); });
