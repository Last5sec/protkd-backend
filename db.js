const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway")
    ? { rejectUnauthorized: false }
    : false,
});

async function getDB() {
  return pool;
}

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id           TEXT PRIMARY KEY,
        title        TEXT NOT NULL,
        date         TEXT NOT NULL,
        start_date   TEXT NOT NULL,
        time         TEXT NOT NULL,
        venue        TEXT NOT NULL,
        city         TEXT NOT NULL,
        type         TEXT NOT NULL,
        status       TEXT NOT NULL DEFAULT 'Registration Open',
        image        TEXT,
        featured     BOOLEAN DEFAULT FALSE,
        summary      TEXT,
        description  TEXT,
        categories   TEXT,
        prize        TEXT,
        reg_fee      TEXT DEFAULT '₹500',
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id                SERIAL PRIMARY KEY,
        event_id          TEXT NOT NULL REFERENCES events(id),
        name              TEXT NOT NULL,
        email             TEXT NOT NULL,
        phone             TEXT NOT NULL,
        dob               TEXT,
        belt_rank         TEXT,
        category          TEXT,
        state             TEXT,
        academy           TEXT,
        emergency_contact TEXT,
        notes             TEXT,
        payment_status    TEXT DEFAULT 'Pending',
        registered_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS membership_applications (
        id             SERIAL PRIMARY KEY,
        tier           TEXT NOT NULL,
        name           TEXT NOT NULL,
        email          TEXT NOT NULL,
        phone          TEXT NOT NULL,
        academy        TEXT,
        state          TEXT,
        experience     TEXT,
        notes          TEXT,
        payment_status TEXT DEFAULT 'Pending',
        status         TEXT DEFAULT 'Under Review',
        applied_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS membership_fees (
        tier       TEXT PRIMARY KEY,
        price      TEXT NOT NULL,
        period     TEXT NOT NULL DEFAULT '/ year',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL,
        subject     TEXT,
        message     TEXT NOT NULL,
        received_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id            SERIAL PRIMARY KEY,
        username      TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed membership fees
    const feeCount = await client.query("SELECT COUNT(*) as n FROM membership_fees");
    if (parseInt(feeCount.rows[0].n) === 0) {
      await client.query(`
        INSERT INTO membership_fees (tier, price, period) VALUES
        ('Athlete',    '₹1,500',  '/ year'),
        ('Instructor', '₹5,000',  '/ year'),
        ('Academy',    '₹15,000', '/ year')
      `);
    }

    // Seed admin
    const adminCount = await client.query("SELECT COUNT(*) as n FROM admins");
    if (parseInt(adminCount.rows[0].n) === 0) {
      const bcrypt = require("bcryptjs");
      const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10);
      await client.query(
        "INSERT INTO admins (username, password_hash) VALUES ($1, $2)",
        ["admin", hash]
      );
      console.log("✅ Default admin created — username: admin, password: admin123");
    }

    console.log("✅ Database initialized (PostgreSQL)");
  } finally {
    client.release();
  }
}

module.exports = { getDB, initDB, pool };