# NOLTC Tennis Registration

Tennis court registration system with three applications:
- **Registration** - User-facing court sign-up
- **Courtboard** - Real-time court status display
- **Admin** - Administrative management panel

## Recent Major Milestones

### Phase 3: Globals & Event Cleanup (Complete)
- Eliminated all `window.__*` globals from registration app (9 globals removed)
- Replaced with React state, props, and explicit dependency injection
- `window.__registrationData`, `__mobileFlow`, `__mobileSuccessHandler` all removed
- Improved testability and eliminated cross-component coupling

### Phase 2.2: Admin BlockManager Decomposition (Complete)
- Decomposed `CompleteBlockManagerEnhanced.jsx` from 1,076 to 832 lines (~23% reduction)
- Extracted: `useWetCourts` hook, `CourtSelectionGrid`, `BlockReasonSelector`, `expandRecurrenceDates` utility
- Improved maintainability for admin block management features

### Phase 2.X: Overtime Eligibility Centralization (Complete)
- Created `src/shared/courts/overtimeEligibility.js` as single source of truth
- Registration and courtboard now use same policy module
- Eliminated duplicate inline filtering logic

### Phase 2.1: Registration App Hooks (Complete)
- Extracted 7 custom hooks from `App.jsx` (~485 lines)
- Includes: `useBoardState`, `useActivityTimeout`, `useSessionTracking`, etc.

### Test Coverage
- 7 Playwright E2E tests covering critical flows
- All phases maintained green tests throughout refactoring

## Repo Boundaries

> **Important:** This repository contains the **frontend only**. The backend (Supabase Edge Functions + database migrations) lives in a separate repository: `noltc-backend/`.
>
> Frontend deployment: GitHub Pages
> Backend deployment: Supabase (Edge Functions + PostgreSQL)

## Prerequisites

- Node.js 18+
- npm 9+
- Access to Supabase project (for full functionality)
- For backend work: Access to `noltc-backend/` repository

## Installation

```bash
git clone <repository-url>
cd NOLTCsignup
npm install
```

## Running Locally

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Opens at http://localhost:5173/src/registration/index.html

## Verification

Run the full verification suite (lint + build + tests):

```bash
npm run verify
```

This command is also run by CI on all pull requests and pushes to main.

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data flow, architectural decisions |
| [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) | Environment configuration, staging setup |
| [docs/GOLDEN_FLOWS.md](./docs/GOLDEN_FLOWS.md) | Critical user flows for regression testing |
| [docs/TESTING.md](./docs/TESTING.md) | Testing strategy and guidelines |
| [docs/verification-checklist.md](./docs/verification-checklist.md) | Pre-deployment verification checklist |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run tests (Playwright in Phase 1) |
| `npm run verify` | Full verification: lint + build + test |

## Deployment

### Automatic (GitHub Actions)

Deployment happens automatically on push to `main` branch via GitHub Actions.

**GitHub Pages Settings Required:**
1. Go to Settings > Pages
2. Set **Source** to **GitHub Actions** (not "Deploy from a branch")
3. The workflow will build and deploy `dist/` automatically

### Manual Verification

To verify the build locally before pushing:

```bash
npm run build
npm run preview
```

Then visit http://localhost:4173/NOLTCsignup/

### Live URL

https://tennis-registration-app.github.io/NOLTCsignup/

| App | Path |
|-----|------|
| Registration | `/NOLTCsignup/src/registration/` |
| Courtboard | `/NOLTCsignup/src/courtboard/` |
| Admin | `/NOLTCsignup/src/admin/` |

## Project Structure

```
src/
├── registration/   # Main registration app
├── courtboard/     # Court display app
├── admin/          # Admin panel
├── lib/            # Shared utilities and API layer
└── test-*/         # Test pages
```

## Tech Stack

- React 18 + Vite
- TailwindCSS
- Supabase (Realtime + Edge Functions)
