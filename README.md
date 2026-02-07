# NOLTC Tennis Registration System

A web-based court registration system for the New Orleans Lawn Tennis Club, managing 12 courts for approximately 2,500 members. The system provides kiosk-based check-in, real-time court status display, waitlist management, and administrative controls.

## Applications

| App | Purpose | Primary Use |
|-----|---------|-------------|
| **Registration** | Member check-in and court assignment | iPad kiosk at club entrance |
| **Courtboard** | Real-time court status display | Wall-mounted display in clubhouse |
| **Admin** | Settings, blocks, analytics, calendar | Staff management interface |
| **Mobile** | Location-verified registration | Member smartphones (QR-based) |

## Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Testing:** Vitest (683 unit tests), Playwright (15 E2E tests)
- **Deployment:** Vercel (frontend), Supabase (backend)

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
git clone <repository-url>
cd NOLTCsignup
npm install
```

### Environment Variables

Copy the example file and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

See [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) for detailed configuration.

### Development

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
```

### Verification

```bash
npm run verify       # Full gate: lint + typecheck + unit + build + e2e
```

This is the same command run by CI on all pull requests.

## Project Structure

```
src/
├── registration/       # Registration kiosk app
│   ├── screens/        # Route components
│   ├── backend/        # API layer (TennisBackend façade)
│   ├── services/       # Service modules
│   └── hooks/          # React hooks
├── courtboard/         # Court display app
├── admin/              # Admin panel
├── lib/                # Shared utilities (API, errors, logging)
├── shared/             # Shared React components
└── config/             # Runtime configuration
shared/                 # Cross-app utilities (legacy)
domain/                 # Domain logic modules
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Testing

```bash
npm run test:unit       # Unit tests (Vitest)
npm run test:unit:watch # Unit tests in watch mode
npm run test:e2e        # E2E tests (Playwright)
npm run lint            # ESLint
npm run typecheck       # TypeScript checking
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run verify` | Full verification gate |
| `npm run test:unit` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Format with Prettier |

## Repository Boundaries

This repository contains the **frontend only**. The backend (Supabase Edge Functions and database migrations) is in a separate repository: `noltc-backend/`.

| Component | Repository | Deployment |
|-----------|------------|------------|
| Frontend apps | `NOLTCsignup/` (this repo) | Vercel |
| Edge Functions | `noltc-backend/` | Supabase |
| Database | `noltc-backend/` | Supabase |

## Demo Mode

The system is currently configured for demo/development use:

- Sample data is available in the Supabase instance
- No user authentication is enforced
- Admin access is URL-based (no password)

See [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) for security considerations.

## Live URLs

**Production:** https://courtboard-noltc.vercel.app

| Application | URL |
|-------------|-----|
| Registration | [/src/registration/index.html](https://courtboard-noltc.vercel.app/src/registration/index.html) |
| Courtboard | [/src/courtboard/index.html](https://courtboard-noltc.vercel.app/src/courtboard/index.html) |
| Admin | [/src/admin/index.html](https://courtboard-noltc.vercel.app/src/admin/index.html) |
| Mobile | [/Mobile.html](https://courtboard-noltc.vercel.app/Mobile.html) |

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design and architectural decisions |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Development workflow and conventions |
| [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) | Environment configuration |
| [docs/TESTING.md](./docs/TESTING.md) | Testing strategy and guidelines |
| [docs/RUNBOOK.md](./docs/RUNBOOK.md) | Operations and troubleshooting |
| [docs/GOLDEN_FLOWS.md](./docs/GOLDEN_FLOWS.md) | Critical user flows |

## License

Copyright (c) 2024-2025 Claude Williams. All rights reserved.
