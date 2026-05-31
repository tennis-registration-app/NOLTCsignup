#!/usr/bin/env node

/**
 * Docs Ratchet Script
 *
 * Keeps the volatile, countable figures in ARCHITECTURE.md honest by
 * regenerating them from the filesystem instead of trusting hand edits.
 *
 * Two marked regions are owned by this script:
 *   - docs:files-over-500  — table of source files exceeding the 500-line limit
 *   - docs:test-inventory   — unit/e2e test *file* counts
 *
 * Default run verifies the doc matches the filesystem and exits 1 on
 * divergence (used by `npm run verify`). Pass --write to regenerate.
 *
 * Only cheaply-computable figures live here. Test *case* counts are
 * deliberately omitted: verifying them requires running the full suite,
 * so they are not claimed in the doc.
 *
 * Usage:
 *   node scripts/docs-ratchet.mjs            # Check doc matches filesystem
 *   node scripts/docs-ratchet.mjs --write    # Regenerate marked regions
 *   node scripts/docs-ratchet.mjs --dry-run  # Show diff without failing
 *
 * Environment:
 *   DOCS_ARCHITECTURE_PATH  Override ARCHITECTURE.md path (for testing)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const DOC_PATH = process.env.DOCS_ARCHITECTURE_PATH || join(ROOT_DIR, 'ARCHITECTURE.md');

const LINE_LIMIT = 500;
const SOURCE_ROOTS = ['src', 'public/domain'];
const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

// Curated notes for known large files. Files absent from this map render
// with an empty Notes cell — a prompt to either add context or extract.
const FILE_NOTES = {
  'src/types/appTypes.ts': 'Type definitions only — acceptable exception (no logic)',
  'src/admin/types/domainObjects.ts': 'Type definitions only — acceptable exception (no logic)',
  'src/lib/backend/TennisCommands.ts': 'Command methods',
  'src/tennis/domain/availability.ts': 'Court availability logic',
  'src/lib/ApiAdapter.ts': 'API client',
  'src/tennis/domain/waitlist.ts': 'Waitlist domain logic',
  'src/lib/backend/admin/AdminCommands.ts': 'Admin command methods',
  'src/registration/appHandlers/handlers/courtHandlers.ts': 'Court action handlers',
  'src/courtboard/bootstrap/courtboard-bootstrap.js': 'Legacy courtboard bootstrap (ADR-006 containment)',
  'src/admin/ai/AIAssistantAdmin.tsx': 'Admin AI assistant UI',
  'src/admin/calendar/EventCalendarEnhanced.tsx': 'Admin calendar UI',
};

// Parse CLI args
const args = process.argv.slice(2);
const write = args.includes('--write') || args.includes('--update');
const dryRun = args.includes('--dry-run');

/** Recursively collect files under a directory matching the source extensions. */
function walkSourceFiles(dir, acc) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walkSourceFiles(full, acc);
    } else if (SOURCE_EXTS.some((ext) => entry.name.endsWith(ext))) {
      acc.push(full);
    }
  }
  return acc;
}

/** Recursively collect files under a directory matching a suffix predicate. */
function walkMatching(dir, matches, acc) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walkMatching(full, matches, acc);
    } else if (matches(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

// Count newline characters, matching `wc -l` semantics so the figures
// agree with what `wc -l` and most editors report.
function countLines(file) {
  const text = readFileSync(file, 'utf-8');
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}

/** Compute the files-over-limit list, sorted by line count descending. */
function computeFilesOverLimit() {
  const files = [];
  for (const root of SOURCE_ROOTS) {
    walkSourceFiles(join(ROOT_DIR, root), files);
  }
  return files
    .map((f) => ({ path: relative(ROOT_DIR, f).split('\\').join('/'), lines: countLines(f) }))
    .filter((f) => f.lines > LINE_LIMIT)
    .sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path));
}

function countTestFiles() {
  const unit = walkMatching(
    join(ROOT_DIR, 'tests', 'unit'),
    (name) => /\.test\.(js|jsx|ts|tsx)$/.test(name),
    []
  );
  const e2e = walkMatching(join(ROOT_DIR, 'e2e'), (name) => /\.spec\.(js|jsx|ts|tsx)$/.test(name), []);
  return { unitFiles: unit.length, e2eFiles: e2e.length };
}

/** Render the files-over-500 table body (the marked region content). */
function renderFilesTable(filesOverLimit) {
  const header = '| File | Lines | Notes |\n|------|-------|-------|';
  const rows = filesOverLimit.map((f) => {
    const note = FILE_NOTES[f.path] || '';
    return `| \`${f.path}\` | ${f.lines.toLocaleString('en-US')} | ${note} |`;
  });
  return [header, ...rows].join('\n');
}

/** Render the test inventory block (the marked region content). */
function renderTestInventory({ unitFiles, e2eFiles }) {
  return [
    `- Unit tests (Vitest): **${unitFiles} test files** under \`tests/unit/\``,
    `- E2E tests (Playwright): **${e2eFiles} spec files** under \`e2e/\``,
  ].join('\n');
}

/**
 * Replace the content between a region's start/end markers.
 * Returns the new doc text, or throws if markers are missing.
 */
function replaceRegion(doc, region, body) {
  const start = `<!-- docs:${region}:start -->`;
  const end = `<!-- docs:${region}:end -->`;
  const startIdx = doc.indexOf(start);
  const endIdx = doc.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Missing or malformed markers for region "${region}" in ${DOC_PATH}`);
  }
  const before = doc.slice(0, startIdx + start.length);
  const after = doc.slice(endIdx);
  return `${before}\n${body}\n${after}`;
}

// Main execution
if (!existsSync(DOC_PATH)) {
  console.error(`ARCHITECTURE.md not found: ${DOC_PATH}`);
  process.exit(1);
}

const original = readFileSync(DOC_PATH, 'utf-8');
const filesOverLimit = computeFilesOverLimit();
const testCounts = countTestFiles();

let updated = original;
updated = replaceRegion(updated, 'files-over-500', renderFilesTable(filesOverLimit));
updated = replaceRegion(updated, 'test-inventory', renderTestInventory(testCounts));

console.log('Docs Ratchet Check');
console.log('==================');
console.log('');
console.log(`Files over ${LINE_LIMIT} lines: ${filesOverLimit.length}`);
console.log(`Unit test files: ${testCounts.unitFiles}`);
console.log(`E2E spec files: ${testCounts.e2eFiles}`);
console.log('');

if (write) {
  if (updated === original) {
    console.log('✅ ARCHITECTURE.md already up to date.');
    process.exit(0);
  }
  writeFileSync(DOC_PATH, updated);
  console.log('✅ ARCHITECTURE.md regenerated from filesystem.');
  process.exit(0);
}

if (updated === original) {
  console.log('✅ PASS: ARCHITECTURE.md figures match the filesystem.');
  process.exit(0);
}

console.log('❌ FAIL: ARCHITECTURE.md figures are stale.');
console.log('   The files-over-500 table or test-file counts diverge from disk.');
console.log('   Run `npm run docs:update` to regenerate, then commit.');

if (dryRun) {
  console.log('');
  console.log('(Dry run — not failing.)');
  process.exit(0);
}

process.exit(1);
