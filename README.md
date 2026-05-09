# PTF India — Backend

Express.js + SQLite backend for the PTF India website.  
Handles event registrations, membership applications, admin auth, and fee management.

---

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env and change JWT_SECRET and ADMIN_PASSWORD
```

### 3. Start the server

```bash
npm run dev     # development (auto-restarts on file changes)
npm start       # production
```

The server starts on **http://localhost:4000**.

### 4. Set up the frontend

In the root of your project (next to `src/`):

```bash
cp .env.example .env
# .env already contains: VITE_API_URL=http://localhost:4000
```

Then update `src/pages/Events.jsx` and `src/pages/Membership.jsx` to use the API  
(see Step 2 and Step 3 of the integration guide below).

---

## Database

SQLite database is auto-created at `backend/ptfindia.db` on first run.  
Tables created automatically:

| Table                      | Description                                  |
|----------------------------|----------------------------------------------|
| `events`                   | Event listings (seeded from mock data)       |
| `event_registrations`      | Student/athlete registrations for events     |
| `membership_applications`  | Membership applications (Athlete/Instructor/Academy) |
| `membership_fees`          | Editable fee table (seeded with mock values) |
| `admins`                   | Admin users (default: admin / admin123)      |

---

## Admin Login

Default credentials (change immediately!):
- **Username:** `admin`
- **Password:** `admin123`

Login via `POST /api/admin/login` to get a JWT token.

---

## API Reference

All admin routes require `Authorization: Bearer <token>` header.

### Public Routes

| Method | Path                        | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | `/api/events`               | List all events (filter: `type`, `status`) |
| GET    | `/api/events/:id`           | Get single event                   |
| GET    | `/api/memberships/fees`     | Get current membership fees        |
| POST   | `/api/registrations`        | Register for an event              |
| POST   | `/api/memberships`          | Submit membership application      |

### Admin Routes

| Method | Path                                  | Description                        |
|--------|---------------------------------------|------------------------------------|
| POST   | `/api/admin/login`                    | Login → JWT token                  |
| GET    | `/api/admin/dashboard`                | Dashboard stats                    |
| GET    | `/api/registrations`                  | All event registrations            |
| PATCH  | `/api/registrations/:id/payment`      | Update payment status              |
| DELETE | `/api/registrations/:id`              | Delete a registration              |
| GET    | `/api/memberships`                    | All membership applications        |
| PATCH  | `/api/memberships/:id/status`         | Approve / Reject application       |
| PATCH  | `/api/memberships/:id/payment`        | Update payment status              |
| PUT    | `/api/memberships/fees/:tier`         | Change membership fee              |
| POST   | `/api/events`                         | Create new event                   |
| PUT    | `/api/events/:id`                     | Edit an event                      |
| DELETE | `/api/events/:id`                     | Delete an event                    |

---

## Example: Register for an event

```bash
curl -X POST http://localhost:4000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "ptf-india-open-2026",
    "name": "Rahul Sharma",
    "email": "rahul@example.com",
    "phone": "+91 9876543210",
    "belt_rank": "Black Belt 1st Dan",
    "category": "Kyorugi (Sparring)",
    "state": "Delhi",
    "academy": "Delhi Taekwondo Academy"
  }'
```

## Example: Update membership fee (admin)

```bash
curl -X PUT http://localhost:4000/api/memberships/fees/Athlete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{ "price": "₹2,000", "period": "/ year" }'
```

---

## What comes next

- **Step 2:** Update `Events.jsx` to fetch events from API + connect registration form
- **Step 3:** Update `Membership.jsx` to fetch live fees + connect application form  
- **Step 4:** Build the Admin Dashboard page (view registrations, edit events, change fees)
