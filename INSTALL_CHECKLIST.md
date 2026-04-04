# NOLTC Install Checklist

Step-by-step verification sequence for a contractor setting up the system from scratch.
For architecture, design decisions, and operating rules, see [docs/START_HERE.md](docs/START_HERE.md) and [docs/HANDOFF.md](docs/HANDOFF.md).

---

## Prerequisites

- [ ] **Node.js 18+** installed → **Pass:** `node -v` prints `v18.x` or higher
- [ ] **npm 9+** installed → **Pass:** `npm -v` prints `9.x` or higher
- [ ] **Supabase credentials** in hand: project URL, anon key, and service role key (service role key is for seeding only — get it from the Supabase dashboard → Project Settings → API)
- [ ] **Vercel account** with access to the `courtboard-noltc` project (for deployment steps)

---

## Section 1 — Local Setup

- [ ] **Clone the repo**
  ```bash
  git clone <repository-url>
  cd NOLTCsignup
  ```
  **Pass:** directory exists, `git status` is clean

- [ ] **Install dependencies**
  ```bash
  npm install
  ```
  **Pass:** `node_modules/` populated, no `npm ERR!` lines

- [ ] **Create `.env.local`** — copy the example and fill in credentials:
  ```bash
  cp .env.example .env.local
  # Edit .env.local: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
  ```
  **Pass:** `.env.local` contains non-empty values for both variables; see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for all options

- [ ] **Run the full verification gate**
  ```bash
  npm run verify
  ```
  **Pass:** output ends with `22 passed` (E2E) and no `FAIL` lines; all ratchets show `delta: +0`

- [ ] **Start the dev server**
  ```bash
  npm run dev
  ```
  **Pass:** terminal prints `http://localhost:5173`; opening that URL shows the registration kiosk with no console errors

---

## Section 2 — Seed Demo Data

Requires the `noltc-backend` repo migrations `_001` (courts, devices, settings) and `_002` (accounts, members) to have already run against the Supabase project.

- [ ] **Run the seed script**
  ```bash
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> npm run seed
  ```
  **Pass:** output ends with `✅ Seeded: 10 sessions, 1 waitlist entry, 2 blocks`

- [ ] **Verify demo state in the running app** — open `http://localhost:5173/src/courtboard/index.html`
  **Pass:** courtboard shows 10 courts occupied (mix of active and overtime), 1 court with an active lesson block, 1 court available, and 1 waitlist entry with 2 members

---

## Section 3 — Core Flows (Manual)

Run these against the local dev server. All mutations go through the live Supabase backend.

- [ ] **Registration:** scan or type a member number on the kiosk, select an available court, confirm
  **Pass:** court changes to occupied with the member's name shown on the courtboard

- [ ] **End session:** from the admin panel (`http://localhost:5173/src/admin/index.html`), clear an active session
  **Pass:** court returns to available on the courtboard within one polling cycle (~5 seconds)

- [ ] **Waitlist:** with all courts occupied, complete the registration flow past court selection
  **Pass:** waitlist entry appears with correct group type and position

- [ ] **Block:** in the admin panel, create a maintenance block on an available court
  **Pass:** court shows as blocked on the courtboard; block appears in the admin block list

- [ ] **Admin panel loads:** navigate to `http://localhost:5173/src/admin/index.html`
  **Pass:** admin interface renders with current board state; no blank screen or JS errors

---

## Section 4 — Vercel Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full Vercel configuration details.

- [ ] **Connect repo to Vercel** — import `NOLTCsignup` repository in the Vercel dashboard; set framework preset to **Vite**
  **Pass:** Vercel detects `vercel.json` build command automatically

- [ ] **Set environment variables** in Vercel dashboard → Project Settings → Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

  **Pass:** both variables appear in the dashboard with non-empty values

- [ ] **Trigger a deploy** (push to `main` or manually from dashboard)
  **Pass:** Vercel build log shows all ratchets passing, then `Build Completed`; no red steps

- [ ] **Visit the deployed URL**
  **Pass:** `https://courtboard-noltc.vercel.app/src/courtboard/index.html` loads with live court data from Supabase

---

## Section 5 — Post-Deploy Validation

- [ ] **Real-time updates:** start or end a session via the kiosk or admin panel; watch the courtboard
  **Pass:** courtboard updates within ~5 seconds without a manual page refresh

- [ ] **Admin panel on production:** open `https://courtboard-noltc.vercel.app/src/admin/index.html`
  **Pass:** admin interface loads and reflects current live state

- [ ] **Kiosk / fullscreen mode:** open the registration URL in a fullscreen browser window (F11 or kiosk mode)
  **Pass:** layout fills the screen correctly with no browser chrome interfering with touch targets

---

## Cleanup

- [ ] **Reset demo state** — re-run the seed script at any time to wipe and recreate the demo state:
  ```bash
  SUPABASE_SERVICE_ROLE_KEY=<key> npm run seed
  ```
  **Pass:** output ends with `✅ Seeded: 10 sessions, 1 waitlist entry, 2 blocks`

- [ ] **Confirm verify still passes** after any local changes:
  ```bash
  npm run verify
  ```
  **Pass:** all 22 E2E tests pass, all ratchets at `delta: +0`

---

## Troubleshooting Quick Reference

| Symptom | Fix |
|---|---|
| `npm install` fails | Check Node version (`node -v` must be 18+); try `npm ci` for a clean install |
| `npm run verify` E2E step fails | Run `npx playwright install` to install browser binaries, then retry |
| Seed fails: `Court X not found` | Backend `_001` migration has not run; run it from `noltc-backend/` |
| Seed fails: `Member "X" not found` | Backend `_002` migration has not run; run it from `noltc-backend/` |
| App loads but courts show no data | Check `.env.local` values; confirm the Supabase project is active |
| Vercel build fails at env check | `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` not set in Vercel dashboard |
| Ratchet delta is positive | New lint warnings or type errors were introduced; fix before merging |

For deeper investigation: [docs/RUNBOOK.md](docs/RUNBOOK.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).
