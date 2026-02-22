#!/usr/bin/env node
/**
 * Build-time environment contract validation.
 * Runs before vite build in Vercel to catch missing env vars early.
 * Never logs values — only presence/absence.
 *
 * This is the enforced build contract. Keep consistent with
 * .env.example and docs/DEPLOYMENT.md.
 *
 * NOTE: runtimeConfig.js has a dead-code production check (DEV_DEFAULTS
 * mask missing vars via || fallback). This script is the real gate
 * preventing dev credentials from reaching production.
 */

const REQUIRED = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const OPTIONAL = [
  'VITE_BASE_URL',
];

// Only enforce in Vercel builds. Skip everywhere else.
const isVercelBuild = process.env.VERCEL === '1';

if (!isVercelBuild) {
  console.log('[env-check] Skipping — not a Vercel build');
  process.exit(0);
}

let missing = [];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    missing.push(key);
    console.error(`[env-check] ❌ MISSING: ${key}`);
  } else {
    console.log(`[env-check] ✅ ${key} is set`);
  }
}

for (const key of OPTIONAL) {
  if (!process.env[key]) {
    console.log(`[env-check] ⚠️  OPTIONAL not set: ${key}`);
  } else {
    console.log(`[env-check] ✅ ${key} is set`);
  }
}

if (missing.length > 0) {
  console.error(`\n[env-check] ❌ BUILD BLOCKED: ${missing.length} required variable(s) missing.`);
  console.error('[env-check] Set them in Vercel dashboard → Project Settings → Environment Variables.');
  process.exit(1);
}

console.log('[env-check] ✅ All required environment variables present.');
