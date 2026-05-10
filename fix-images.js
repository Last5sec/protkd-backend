require("dotenv").config();
const { pool } = require("./db");

async function fixImages() {
  const client = await pool.connect();
  try {
    await client.query(`UPDATE events SET image='https://images.unsplash.com/photo-1514050566906-8d077bae7046?w=800' WHERE id='ptf-india-open-2026'`);
    await client.query(`UPDATE events SET image='https://images.unsplash.com/photo-1598300606161-e27cc6ffd4e6?w=800' WHERE id='ptf-india-nationals-2026'`);
    await client.query(`UPDATE events SET image='https://images.unsplash.com/photo-1555597408-26bc8e548a46?w=800' WHERE id='instructor-license-2026'`);
    await client.query(`UPDATE events SET image='https://images.unsplash.com/photo-1611077479643-5b8aeacd8c13?w=800' WHERE id='world-championships-2026'`);
    console.log("✅ Images updated!");
  } finally {
    client.release();
    process.exit(0);
  }
}

fixImages().catch(err => { console.error(err); process.exit(1); });
