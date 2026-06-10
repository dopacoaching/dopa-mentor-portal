# DOPA Mentor Management Portal

An internal staff management portal for **DOPA Education Private Limited** (DOPA Coaching), a multi-campus NEET coaching institute based in Calicut, Kerala.

Built with **Next.js 14 App Router**, MongoDB Atlas, JWT auth, Redux Toolkit, and real-time SSE notifications.

---

## Features

- **Role-based access**: Admin, Class Teacher, Mentor
- **Daily task checklist** — 9 standard tasks per mentor, deadline indicators, monthly calendar heatmap
- **Class teacher verification** — verify or flag mentor submissions with notes
- **Campus visit scheduling** — schedule → confirm → report → CT review → payment eligibility
- **Doubt Web logging** — per-subject daily tracking with 300-quota bonus system
- **Monthly directives** — admin publishes, mentors see with real-time banner
- **Automated payment calculation** — offline (₹3000 base) and online (₹6000 cap) formulas
- **Real-time SSE notifications** — with auto-reconnect and Redux persistence
- **5 report types** — performance, compliance, payment, visit log, CT reviews
- **Cron jobs** — auto-close tasks at 23:59, consecutive-miss alerts, unverified task reminders

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Redux Toolkit + Redux Persist |
| Database | MongoDB Atlas via Mongoose |
| Auth | JWT in httpOnly cookies |
| Real-time | Server-Sent Events (SSE) |
| Deployment | Vercel |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/dopacoaching/dopa-mentor-portal.git
cd dopa-mentor-portal
npm install
```

### 2. Configure environment

Create `.env.local` with:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/dopa-mentor-portal
JWT_SECRET=<random-64-char-secret>
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_USERNAME=<admin-email>
ADMIN_PASSWORD=<admin-password>
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Seed the admin account

```bash
npm run seed
```

Creates the admin user from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env.local`.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Role Dashboards

| Role | Dashboard URL |
|---|---|
| Admin | `/admin` |
| Class Teacher | `/class-teacher` |
| Mentor | `/mentor` |

---

## Deployment (Vercel)

1. Push to GitHub.
2. Import project at [vercel.com](https://vercel.com).
3. Add environment variables in Vercel project settings:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random 64-char secret |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |

4. Deploy. Route Handlers are deployed as Vercel serverless functions automatically.

> **Cron jobs** (`vercel.json`) require **Vercel Pro**. On the free plan they are disabled — trigger the endpoints manually or via an external scheduler.

---

## Payment Logic

### Offline/Residential Mentors

| Component | Amount | Condition |
|---|---|---|
| Basic Pay | ₹3,000 | Always |
| D-Team Pay | ₹1,500 | At least one verified task log |
| Doubt Web Base | ₹2,000 | ≥ 300 doubts cleared |
| Doubt Web Extra | Variable | Physics/Chemistry: ₹10/doubt; Bio/Math/Gen: ₹5/doubt above 300 |
| Travel Allowance | ₹334–₹1,000 | 1–3+ completed visits |
| Meeting Pay | ₹500 | Meeting attended |

### Online Mentors (₹6,000 cap)

| Component | Amount | Condition |
|---|---|---|
| Basic Pay | ₹1,000 | Always |
| WhatsApp Activities | ₹1,000 | Verified task logs |
| Weekly Quiz | ₹750 | Group/Merged visit documented |
| One-to-One | ₹750 | 1-on-1 visit documented |
| Doubt Web | ₹2,000 | ≥ 300 doubts |
| Meeting Pay | ₹500 | Meeting attended |

### Visit Payment Eligibility

A visit counts for payment only when all three are true:
1. `status === 'completed'`
2. `mentorReportSubmitted === true`
3. `ctReviewSubmitted === true`

---

## Project Structure

```
app/
  (auth)/login/          Login page
  (dashboard)/
    admin/               Admin pages
    class-teacher/       Class Teacher pages
    mentor/              Mentor pages
  api/                   Route Handlers (serverless functions)
components/
  ui/                    shadcn/ui primitives
  layout/                Sidebar, TopBar, NotificationBell
  dashboard/             StatCard
lib/
  mongodb.ts             Mongoose singleton
  auth.ts                JWT helpers
  middleware.ts          RBAC helpers
  sse.ts                 SSE connection manager
  payment-calculator.ts  Pure payment engine
models/                  Mongoose models
store/                   Redux store + slices
types/                   Shared TypeScript types
scripts/seed.ts          Database seeder (reads from .env.local)
vercel.json              Cron job schedules
```
