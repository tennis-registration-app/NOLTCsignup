# NOLTC Tennis Registration

Tennis court registration system with three applications:
- **Registration** - User-facing court sign-up
- **Courtboard** - Real-time court status display
- **Admin** - Administrative management panel

## Development

```bash
npm install
npm run dev
```

Opens at http://localhost:5173/src/registration/index.html

## Build

```bash
npm run build
npm run preview  # Preview production build locally
```

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
