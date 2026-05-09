require("dotenv").config();
const { pool } = require("./db");

async function seed() {
  const client = await pool.connect();
  try {
    const events = [
      {
        id: "ptf-india-open-2026",
        title: "PTF India Open International Taekwondo Championships 2026",
        date: "May 29 – June 1, 2026",
        start_date: "2026-05-29",
        time: "8:00 AM onwards",
        venue: "Sher-e-Kashmir Indoor Sports Complex",
        city: "Srinagar, Jammu & Kashmir, India",
        type: "International",
        status: "Registration Open",
        featured: true,
        summary: "The first-ever unified international Taekwondo championship in India.",
        description: "Historic inaugural event uniting every major Taekwondo style under one banner.",
        categories: JSON.stringify(["Kyorugi (Sparring)", "Poomsae (Forms)", "Kombat Fights", "Para-Taekwondo"]),
        prize: "₹25,00,000 total prize pool",
        reg_fee: "₹1,200",
      },
      {
        id: "ptf-india-nationals-2026",
        title: "1st PTF India National Taekwondo Championships",
        date: "May 10 – May 12, 2026",
        start_date: "2026-05-10",
        time: "9:00 AM – 8:00 PM",
        venue: "Indira Gandhi Indoor Stadium",
        city: "New Delhi, India",
        type: "National",
        status: "Registration Open",
        featured: true,
        summary: "Historic 1st National Championships — qualifier for PTF India Open International 2026.",
        description: "The 1st PTF India Nationals will serve as the qualifying event for the international Open in Srinagar.",
        categories: JSON.stringify(["Kyorugi", "Poomsae", "Team Poomsae"]),
        prize: "₹10,00,000 total prize pool",
        reg_fee: "₹800",
      },
      {
        id: "instructor-license-2026",
        title: "PTF India Instructor License & Refresher Course",
        date: "April 18 – April 20, 2026",
        start_date: "2026-04-18",
        time: "10:00 AM – 6:00 PM",
        venue: "PTF India HQ",
        city: "Jammu, J&K, India",
        type: "Seminar",
        status: "Open",
        featured: false,
        summary: "Three-day intensive course for new and existing instructors.",
        description: "A three-day intensive program covering curriculum standards and PTF India licensing exam.",
        categories: JSON.stringify(["Instructor License Level 1", "Level 2 Refresher", "Safety & First Aid"]),
        prize: "PTF India Official Certification",
        reg_fee: "₹2,500",
      },
      {
        id: "world-championships-2026",
        title: "2026 PTF World Championships",
        date: "July 9 – July 11, 2026",
        start_date: "2026-07-09",
        time: "8:00 AM onwards",
        venue: "Gimcheon Indoor Arena",
        city: "Gimcheon, South Korea",
        type: "World",
        status: "India Team Selection",
        featured: true,
        summary: "PTF India sends its national team to the World Championships.",
        description: "Team India's official participation in the 2026 PTF World Championships.",
        categories: JSON.stringify(["Team India Selection", "World Rankings", "Open Categories"]),
        prize: "Global ranking points",
        reg_fee: "₹3,000",
      },
    ];

    for (const e of events) {
      await client.query(`
        INSERT INTO events (id,title,date,start_date,time,venue,city,type,status,featured,summary,description,categories,prize,reg_fee)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (id) DO NOTHING
      `, [e.id, e.title, e.date, e.start_date, e.time, e.venue, e.city, e.type, e.status, e.featured, e.summary, e.description, e.categories, e.prize, e.reg_fee]);
    }

    console.log("✅ Events seeded!");
  } finally {
    client.release();
    process.exit(0);
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
