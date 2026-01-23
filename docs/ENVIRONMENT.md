# Environment Configuration

## Current State

> **Important:** The frontend currently contains production Supabase URL and anon key directly in source code (`src/lib/apiConfig.js`). This is known technical debt scheduled for Phase 4.

### Credential Location

```
src/lib/apiConfig.js
```

This file contains:
- `SUPABASE_URL` — Production Supabase project URL
- `BASE_URL` — Edge Functions base URL
- `ANON_KEY` — Supabase anonymous/public key

### Local Development

For local development against **production backend**:
1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`

No additional configuration required — credentials are in source.

### Do Not Commit Credential Changes

If you modify `apiConfig.js` for local testing (e.g., pointing to staging):

```bash
# Before committing, verify you haven't staged credential changes:
git diff src/lib/apiConfig.js

# If you see changes, unstage:
git checkout src/lib/apiConfig.js
```

**Rule:** Never commit modified credentials to the repository.

---

## Staging Environment Setup

### Track A: Dashboard-Only (Recommended)

For developers who need to test against a staging backend:

#### Step 1: Create Staging Project

1. Go to [dashboard.supabase.com](https://dashboard.supabase.com)
2. Create new project (e.g., "noltc-staging")
3. Wait for project provisioning

#### Step 2: Get Staging Credentials

1. In Supabase dashboard: **Project Settings → API**
2. Copy:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/public key

#### Step 3: Configure Frontend Locally

Edit `src/lib/apiConfig.js` **locally only** (do not commit):

```javascript
export const API_CONFIG = {
  SUPABASE_URL: 'https://YOUR-STAGING-PROJECT.supabase.co',
  BASE_URL: 'https://YOUR-STAGING-PROJECT.supabase.co/functions/v1',
  ANON_KEY: 'your-staging-anon-key',
  // ... rest unchanged
};
```

#### Step 4: Run Locally

```bash
npm run dev
```

#### Limitations of Track A

- Backend Edge Functions must be deployed separately to staging
- Database schema must be migrated separately
- Only useful for frontend-only testing

---

### Track B: Supabase CLI (Optional)

**Prerequisites:**
- Access to `noltc-backend/` repository
- Supabase CLI installed (`npm install -g supabase`)
- Team currently uses CLI for deployments

#### Step 1: Create Staging Project

Same as Track A, Step 1.

#### Step 2: Deploy Backend to Staging

In the `noltc-backend/` directory:

```bash
# Link to staging project (one-time)
supabase link --project-ref <staging-project-ref>

# Apply database migrations
supabase db push

# Deploy all Edge Functions
supabase functions deploy
```

#### Step 3: Configure Frontend

Same as Track A, Steps 2-4.

#### Verification Checklist

Before using Track B, confirm:
- [ ] `noltc-backend/` is accessible
- [ ] `supabase/migrations/` contains current schema
- [ ] Team uses Supabase CLI for production deploys

---

## Environment Variables (Future — Phase 4)

Phase 4 will introduce proper environment variable handling:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

Until then, credentials remain in `apiConfig.js`.

---

## Backend Repository

Backend environment configuration lives in `noltc-backend/`:

- `supabase/config.toml` — Supabase project configuration
- Edge Function secrets managed via Supabase dashboard or CLI

See backend repository documentation for Edge Function environment setup.
