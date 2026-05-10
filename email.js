const nodemailer = require("nodemailer");

async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_PASS) {
    console.warn("⚠️  Email not configured — skipping.");
    return;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.EMAIL_PASS,
      },
      body: JSON.stringify({
        sender: { name: "PTF India", email: "harshtushid213@gmail.com" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Brevo API error: ${err}`);
    }

    console.log(`✉️  Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error("Email error:", err.message);
  }
}

// ── Shared styles ─────────────────────────────────────────────
const BASE_STYLE = `
  font-family: Arial, sans-serif;
  background: #0a0a0a;
  max-width: 640px;
  margin: 0 auto;
  padding: 0;
  color: #eee;
`;

function header(title, subtitle) {
  return `
  <div style="background:linear-gradient(135deg,#1a1506,#0d0d0d);border-bottom:2px solid #D4AF37;padding:32px 32px 24px;">
    <div style="display:inline-block;background:#D4AF37;color:#000;font-size:10px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;padding:3px 10px;margin-bottom:14px;">PTF INDIA</div>
    <h1 style="color:#fff;margin:0;font-size:22px;line-height:1.3;">${title}</h1>
    ${subtitle ? `<p style="color:#aaa;margin:8px 0 0;font-size:13px;">${subtitle}</p>` : ""}
  </div>`;
}

function footer() {
  return `
  <div style="background:#0d0d0d;padding:20px 32px;border-top:1px solid #222;text-align:center;">
    <p style="color:#555;font-size:11px;margin:0;">Professional Taekwondo Federation India</p>
    <p style="color:#555;font-size:11px;margin:4px 0 0;">
      <a href="mailto:protkdindia@gmail.com" style="color:#D4AF37;">protkdindia@gmail.com</a> &nbsp;|&nbsp; +91 7006507535
    </p>
  </div>`;
}

function infoRow(label, value) {
  if (!value) return "";
  return `
  <tr>
    <td style="padding:9px 16px;background:#1a1a1a;color:#888;font-size:12px;width:150px;vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:9px 16px;background:#111;color:#ddd;font-size:13px;">${value}</td>
  </tr>`;
}

function tableBlock(rows) {
  return `
  <table style="width:100%;border-collapse:collapse;margin:0;">
    ${rows}
  </table>`;
}

function section(content) {
  return `<div style="padding:24px 32px;">${content}</div>`;
}

// ══════════════════════════════════════════════════════════════
// ADMIN NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

async function notifyContact({ name, email, subject, message }) {
  await sendEmail({
    to: process.env.NOTIFY_EMAIL || process.env.EMAIL_USER,
    subject: `📬 New Contact Message — ${subject || "No Subject"} | PTF India`,
    html: `<div style="${BASE_STYLE}">
      ${header("New Contact Message", `From: ${name} &lt;${email}&gt;`)}
      ${section(tableBlock(
        infoRow("Name", name) +
        infoRow("Email", email) +
        infoRow("Subject", subject || "—") +
        infoRow("Message", message.replace(/\n/g, "<br>"))
      ))}
      ${footer()}
    </div>`,
  });
}

async function notifyEventRegistration(data) {
  const { registration_id, name, email, phone, dob, belt_rank, category, state, academy, emergency_contact, notes, event_title, reg_fee } = data;
  await sendEmail({
    to: process.env.NOTIFY_EMAIL || process.env.EMAIL_USER,
    subject: `🥋 New Event Registration #${registration_id} — ${event_title} | PTF India`,
    html: `<div style="${BASE_STYLE}">
      ${header(`New Registration: ${event_title}`, `Registration ID: #${registration_id}`)}
      ${section(tableBlock(
        infoRow("Registration ID", `#${registration_id}`) +
        infoRow("Event", event_title) +
        infoRow("Fee", reg_fee) +
        infoRow("Name", name) +
        infoRow("Email", email) +
        infoRow("Phone", phone) +
        infoRow("Date of Birth", dob) +
        infoRow("Belt Rank", belt_rank) +
        infoRow("Category", category) +
        infoRow("State / UT", state) +
        infoRow("Academy", academy) +
        infoRow("Emergency Contact", emergency_contact) +
        infoRow("Notes", notes)
      ))}
      ${footer()}
    </div>`,
  });
}

async function notifyMembershipApplication(data) {
  const { application_id, tier, name, email, phone, academy, state, experience, notes, fee } = data;
  await sendEmail({
    to: process.env.NOTIFY_EMAIL || process.env.EMAIL_USER,
    subject: `🏅 New Membership Application #${application_id} — ${tier} | PTF India`,
    html: `<div style="${BASE_STYLE}">
      ${header(`New ${tier} Membership Application`, `Application ID: #${application_id}`)}
      ${section(tableBlock(
        infoRow("Application ID", `#${application_id}`) +
        infoRow("Tier", tier) +
        infoRow("Fee", fee) +
        infoRow("Name", name) +
        infoRow("Email", email) +
        infoRow("Phone", phone) +
        infoRow("Academy", academy) +
        infoRow("State / UT", state) +
        infoRow("Experience", experience) +
        infoRow("Notes", notes)
      ))}
      ${footer()}
    </div>`,
  });
}

// ══════════════════════════════════════════════════════════════
// USER CONFIRMATION EMAILS
// ══════════════════════════════════════════════════════════════

async function confirmContact({ name, email, subject }) {
  await sendEmail({
    to: email,
    subject: `✅ We received your message — PTF India`,
    html: `<div style="${BASE_STYLE}">
      ${header("Message Received!", "Thank you for reaching out to PTF India")}
      ${section(`
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 16px;">
          Hi <strong style="color:#fff;">${name}</strong>,
        </p>
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 16px;">
          Thank you for contacting the <strong style="color:#D4AF37;">Professional Taekwondo Federation India</strong>.
          We have received your message${subject ? ` regarding <em>"${subject}"</em>` : ""} and our team will get back to you within <strong style="color:#fff;">48 hours</strong>.
        </p>
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 24px;">
          If your matter is urgent, you can reach us directly at
          <a href="mailto:protkdindia@gmail.com" style="color:#D4AF37;">protkdindia@gmail.com</a>
          or call <a href="tel:+917006507535" style="color:#D4AF37;">+91 7006507535</a>.
        </p>
        <div style="background:#1a1506;border-left:3px solid #D4AF37;padding:12px 16px;border-radius:2px;">
          <p style="color:#D4AF37;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">PTF India HQ</p>
          <p style="color:#aaa;font-size:12px;margin:0;">Mon – Sat, 10:00 AM – 6:00 PM IST</p>
        </div>
      `)}
      ${footer()}
    </div>`,
  });
}

async function confirmEventRegistration({ name, email, registration_id, event_title, event_date, event_venue, reg_fee, category, belt_rank }) {
  await sendEmail({
    to: email,
    subject: `✅ Registration Confirmed #${registration_id} — ${event_title} | PTF India`,
    html: `<div style="${BASE_STYLE}">
      ${header("Registration Confirmed!", event_title)}
      ${section(`
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 16px;">
          Hi <strong style="color:#fff;">${name}</strong>,
        </p>
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 20px;">
          Your registration for <strong style="color:#D4AF37;">${event_title}</strong> has been received successfully.
          Here are your registration details:
        </p>
      `)}
      ${section(tableBlock(
        infoRow("Registration ID", `<strong style="color:#D4AF37;">#${registration_id}</strong>`) +
        infoRow("Event", event_title) +
        infoRow("Date", event_date) +
        infoRow("Venue", event_venue) +
        infoRow("Category", category) +
        infoRow("Belt Rank", belt_rank) +
        infoRow("Registration Fee", reg_fee)
      ))}
      ${section(`
        <div style="background:#1a1506;border-left:3px solid #D4AF37;padding:14px 16px;border-radius:2px;margin-bottom:16px;">
          <p style="color:#D4AF37;font-size:12px;font-weight:bold;margin:0 0 6px;">⚠️ Next Steps — Payment</p>
          <p style="color:#bbb;font-size:13px;margin:0;line-height:1.6;">
            Our team will send you payment instructions within <strong style="color:#fff;">48 hours</strong>.
            Your spot is reserved once payment is confirmed.
          </p>
        </div>
        <p style="color:#777;font-size:12px;margin:0;">
          Questions? Email us at
          <a href="mailto:protkdindia@gmail.com" style="color:#D4AF37;">protkdindia@gmail.com</a>
        </p>
      `)}
      ${footer()}
    </div>`,
  });
}

async function confirmMembershipApplication({ name, email, application_id, tier, fee }) {
  await sendEmail({
    to: email,
    subject: `✅ Membership Application Received #${application_id} — PTF India`,
    html: `<div style="${BASE_STYLE}">
      ${header("Application Received!", `${tier} Membership — PTF India`)}
      ${section(`
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 16px;">
          Hi <strong style="color:#fff;">${name}</strong>,
        </p>
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 20px;">
          Thank you for applying for a <strong style="color:#D4AF37;">${tier} Membership</strong> with the
          Professional Taekwondo Federation India. Your application has been received and is now under review.
        </p>
      `)}
      ${section(tableBlock(
        infoRow("Application ID", `<strong style="color:#D4AF37;">#${application_id}</strong>`) +
        infoRow("Membership Tier", tier) +
        infoRow("Annual Fee", fee) +
        infoRow("Status", "Under Review")
      ))}
      ${section(`
        <div style="background:#1a1506;border-left:3px solid #D4AF37;padding:14px 16px;border-radius:2px;margin-bottom:16px;">
          <p style="color:#D4AF37;font-size:12px;font-weight:bold;margin:0 0 6px;">What happens next?</p>
          <p style="color:#bbb;font-size:13px;margin:0;line-height:1.7;">
            1. Our membership desk will review your application within <strong style="color:#fff;">48 hours</strong>.<br>
            2. You will receive an approval email with payment instructions.<br>
            3. Once payment is confirmed, your PTF India membership card and certificate will be issued.
          </p>
        </div>
        <p style="color:#777;font-size:12px;margin:0;">
          Questions? Email us at
          <a href="mailto:protkdindia@gmail.com" style="color:#D4AF37;">protkdindia@gmail.com</a>
          or call <a href="tel:+917006507535" style="color:#D4AF37;">+91 7006507535</a>
        </p>
      `)}
      ${footer()}
    </div>`,
  });
}

module.exports = {
  // Admin notifications
  notifyContact,
  notifyEventRegistration,
  notifyMembershipApplication,
  // User confirmations
  confirmContact,
  confirmEventRegistration,
  confirmMembershipApplication,
};
