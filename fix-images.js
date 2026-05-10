require("dotenv").config();
const { pool } = require("./db");

async function fixImages() {
  const client = await pool.connect();
  try {
    await client.query(`UPDATE events SET image='https://images.unsplash.com/photo-1555597408-26bc8e548a46?w=800' WHERE id='ptf-india-nationals-2026'`);
    await client.query(`UPDATE events SET image='https://images.unsplash.com/photo-1562771242-a02d9090c90c?w=800' WHERE id='world-championships-2026'`);
    await client.query(`UPDATE events SET image='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800' WHERE id='ptf-india-open-2026'`);
    await client.query(`UPDATE events SET image='https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800' WHERE id='instructor-license-2026'`);
    console.log("✅ Images fixed!");
  } finally {
    client.release();
    process.exit(0);
  }
}

fixImages().catch(err => { console.error(err); process.exit(1); });
