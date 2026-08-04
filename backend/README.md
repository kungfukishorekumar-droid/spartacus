# Shared Backend — 3 Websites, One MongoDB (No CRM)

A clean Node.js + Express + MongoDB (Mongoose) backend that receives and stores **leads/forms
from 3 separate websites** into **one** MongoDB Atlas database. Admin read/delete routes are
protected by a bearer token. No CRM.

## Folder structure

```
backend/
  src/
    config/db.js                 # MongoDB (Mongoose) connection
    controllers/
      leadController.js          # create / list / get / delete leads
      healthController.js        # health check
    middleware/
      authMiddleware.js          # admin bearer-token protection
      errorMiddleware.js         # 404 + central error handler
    models/Lead.js               # one shared Lead schema
    routes/
      leadRoutes.js
      healthRoutes.js
    utils/response.js            # ok()/fail() response helpers
    server.js                    # app entry point
  .env.example
  .gitignore
  package.json
  README.md
```

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then edit .env with your real values
npm run dev                 # start with auto-reload (nodemon)
# or: npm start
```

### .env values
- `PORT` — port to run on. `NODE_ENV` — development/production.
- `MONGODB_URI` — your MongoDB Atlas connection string.
- `JWT_SECRET` — secret used to sign admin login tokens. Generate one:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_PASSWORD` — password the admin logs in with.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — payment keys.
- `N8N_WEBHOOK_URL` / `CRM_WEBHOOK_URL` / `CRM_WEBHOOK_TOKEN` — optional lead forwarding.
- `ALLOWED_ORIGINS` — comma-separated list of website URLs allowed to call this API.

The server **connects to MongoDB first and only starts if the DB connects**; if the DB is down it stops with an error.

## Admin auth (login → JWT)
```bash
# 1) log in with ADMIN_PASSWORD to get a token
curl -X POST http://localhost:5001/api/admin/login \
  -H "Content-Type: application/json" -d '{"password":"YOUR_ADMIN_PASSWORD"}'
# -> { "data": { "token": "eyJ..." } }
# 2) send that token on protected routes:
#    Authorization: Bearer <token>
```

## API endpoints

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/health` | public | `{ success, message, database }` |
| POST | `/api/admin/login` | public | `{ password }` → `{ token }` (JWT, 7-day) |
| POST | `/api/leads` | **public** | Websites submit leads |
| GET | `/api/leads` | admin | Filters: `?websiteSource=` `?paymentStatus=` `?formType=` |
| GET | `/api/leads/:id` | admin | Single lead |
| DELETE | `/api/leads/:id` | admin | Delete lead |
| POST | `/api/payment/order` | public | Create a Razorpay order → returns `{ orderId, keyId, amount }` |
| POST | `/api/payment/verify` | public | Verify payment signature; marks the lead `paid` |

Admin routes require header `Authorization: Bearer <token>` — get the token from `POST /api/admin/login`.

## Run locally WITHOUT MongoDB Atlas (quick test)

```bash
npm run dev:local
```
Spins up a throwaway in-memory MongoDB so you can test everything on your machine (data resets each restart).
For real use, put your Atlas string in `.env` (`MONGODB_URI`) and run `npm run dev`.

> **Mac note:** port 5000 is used by AirPlay Receiver. Either turn it off
> (System Settings → General → AirDrop & Handoff → **AirPlay Receiver = Off**), or set `PORT=5001`
> in `.env` **and** update `backendUrl` in the site's `app.js` to match.

## Payments (Razorpay)

Set keys in `.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (Razorpay Dashboard → Settings → API Keys).

Flow (standard Razorpay Checkout):
1. Frontend calls `POST /api/payment/order` with `{ amount, leadId? }` (amount in **paise**, e.g. `50000` = ₹500).
2. Opens Razorpay Checkout with the returned `orderId` + `keyId`.
3. On success, frontend calls `POST /api/payment/verify` with the 3 `razorpay_*` fields (+ `leadId`).
   The server verifies the signature (HMAC-SHA256) and, if valid, sets the lead's `paymentStatus = "paid"`.

The martial-arts site already includes a `spartacusPay({ amount, description, leadId })` helper in `app.js` — wire it to any Pay button.

## Automation: n8n + CRM (no CRM built here)

Set optional webhooks in `.env`:
```env
N8N_WEBHOOK_URL=https://your-n8n/webhook/leads
CRM_WEBHOOK_URL=https://your-crm/webhook   # optional
```
Every **new lead** (and every **successful payment**) is POSTed to these URLs (fire-and-forget).
Point `N8N_WEBHOOK_URL` at an n8n **Webhook** node and build your automation there (route to a CRM,
WhatsApp, Google Sheets, email, etc.). This keeps the backend clean while still "connecting to CRM/n8n."

### POST /api/leads
Required: `websiteSource` (`website_1|website_2|website_3`), `fullName`, `phone`.
Optional: `email, age, city, programInterest, message, paymentStatus, paymentAmount, paymentId, formType`.

Success:
```json
{ "success": true, "message": "Lead saved successfully", "data": { } }
```

## Connect each website (frontend example)

```js
// Website 1
await fetch("http://localhost:5000/api/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    websiteSource: "website_1",   // website_2 / website_3 for the others
    fullName: name,
    phone: phone,
    email: email,
    programInterest: "Athlete Mindset Session",
    formType: "landing_page"
  })
});
```

## Testing

```bash
# health
curl http://localhost:5000/api/health

# create a lead (public)
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"websiteSource":"website_1","fullName":"Test User","phone":"9999999999"}'

# list leads (admin)
curl http://localhost:5000/api/leads \
  -H "Authorization: Bearer TOKEN_FROM_ADMIN_LOGIN"
```

## Deploy notes (Hostinger VPS / any Node host)

1. Copy the `backend/` folder to the server; run `npm install --production`.
2. Create `.env` on the server (never commit it). Set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`, Razorpay keys, and the real `ALLOWED_ORIGINS` (your live website domains, e.g. `https://site1.com,https://site2.com,https://site3.com`).
3. Run with a process manager: `npm i -g pm2 && pm2 start src/server.js --name backend && pm2 save`.
4. Put Nginx in front (reverse proxy to the port) and enable HTTPS (Let's Encrypt).
5. In MongoDB Atlas → Network Access, allow your server's IP.

## Security notes
- `.env` is git-ignored — never push it. Keep `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD` and Razorpay secret server-side only.
- Frontends only ever call the **public** `POST /api/leads`; they never see the DB URI or admin token.
- Helmet is enabled; CORS is restricted to `ALLOWED_ORIGINS`.
- Admin auth uses a **signed JWT** (`jsonwebtoken`): log in with `ADMIN_PASSWORD` → 7-day token signed with `JWT_SECRET`. Rotate `JWT_SECRET` to invalidate all tokens.
- Razorpay signature verification is done server-side (HMAC-SHA256) — the frontend can't fake a paid status.
