#!/usr/bin/env node

/**
 * Max-Lines Ratchet Script
 *
 * Enforces the "source files under 500 lines" standard as a one-way ratchet.
 * The baseline records each currently-over-limit file's line count as a
 * ceiling. The check fails if:
 *   - a file NOT in the baseline crosses the limit (new violation), or
 *   - a baselined file grows beyond its recorded ceiling.
 *
 * Line counts may only shrink. When a file drops under the limit or shrinks,
 * run --update to lower its ceiling (or drop it from the baseline).
 *
 * Counting matches `wc -l` semantics and the same source roots as
 * scripts/docs-ratchet.mjs, so the gated set equals the documented
 * "Files Over 500 Lines" table.
 *
 * Usage:
 *   node scripts/max-lines-ratchet.mjs            # Check against baseline
 *   node scripts/max-lines-ratchet.mjs --update   # Update baseline to current
 *   node scripts/max-lines-ratchet.mjs --dry-run  # Show comparison without failing
 *
 * Environment:
 *   MAX_LINES_BASELINE_PATH  Override baseline file path (for testing)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const BASELINE_PATH =
  process.env.MAX_LINES_BASELINE_PATH ||
  join(ROOT_DIR, 'config', 'ratchets', 'max-lines-baseline.json');

const LINE_LIMIT = 500;
const SOURCE_ROOTS = ['src', 'public/domain'];
const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

const args = process.argv.slice(2);
const updateBaseline = args.includes('--update') || args.includes('--update-baseline');
const dryRun = args.includes('--dry-run');

/** Recursively collect source files under a directory. */
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

// Count newline characters, matching `wc -l` semantics.
function countLines(file) {
  const text = readFileSync(file, 'utf-8');
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}

/** Map of over-limit files to their line counts, sorted by count desc. */
function computeOverLimit() {
  const files = [];
  for (const root of SOURCE_ROOTS) {
    walkSourceFiles(join(ROOT_DIR, root), files);
  }
  const result = {};
  for (const f of files) {
    const lines = countLines(f);
    if (lines > LINE_LIMIT) {
      result[relative(ROOT_DIR, f).split('\\').join('/')] = lines;
    }
  }
  return result;
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(`Baseline file not found: ${BASELINE_PATH}`);
    console.error('Run with --update to create initial baseline.');
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'));
  } catch (error) {
    console.error(`Failed to read baseline: ${error.message}`);
    process.exit(1);
  }
}

function saveBaseline(current) {
  const sorted = {};
  for (const path of Object.keys(current).sort((a, b) => current[b] - current[a] || a.localeCompare(b))) {
    sorted[path] = current[path];
  }
  const baseline = { limit: LINE_LIMIT, files: sorted };
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`✅ Baseline updated: ${BASELINE_PATH}`);
  console.log(`   Files over ${LINE_LIMIT} lines: ${Object.keys(current).length}`);
}

// Main execution
console.log('Scanning source files...');
const current = computeOverLimit();

if (updateBaseline) {
  saveBaseline(current);
  process.exit(0);
}

const baseline = loadBaseline();
const baselineFiles = baseline.files || {};

console.log('Max-Lines Ratchet Check');
console.log('=======================');
console.log('');
console.log(`Limit: ${LINE_LIMIT} lines`);
console.log(`Files over limit: ${Object.keys(current).length} (baseline: ${Object.keys(baselineFiles).length})`);
console.log('');

const newViolations = []; // file crossed limit and is not baselined
const grown = []; // baselined file exceeded its ceiling
const improved = []; // baselined file shrank or dropped under limit

for (const [path, lines] of Object.entries(current)) {
  if (!(path in baselineFiles)) {
    newViolations.push({ path, lines });
  } else if (lines > baselineFiles[path]) {
    grown.push({ path, lines, ceiling: baselineFiles[path] });
  } else if (lines < baselineFiles[path]) {
    improved.push({ path, lines, ceiling: baselineFiles[path] });
  }
}
for (const path of Object.keys(baselineFiles)) {
  if (!(path in current)) {
    improved.push({ path, lines: 0, ceiling: baselineFiles[path], cleared: true });
  }
}

if (newViolations.length > 0) {
  console.log('New files over the limit:');
  for (const { path, lines } of newViolations) {
    console.log(`  ${path}: ${lines} (> ${LINE_LIMIT})`);
  }
  console.log('');
}
if (grown.length > 0) {
  console.log('Files that grew past their ceiling:');
  for (const { path, lines, ceiling } of grown) {
    console.log(`  ${path}: ${lines} (ceiling: ${ceiling}, +${lines - ceiling})`);
  }
  console.log('');
}
if (improved.length > 0) {
  console.log('Improved (run --update to lock in):');
  for (const item of improved) {
    if (item.cleared) {
      console.log(`  ${item.path}: now under ${LINE_LIMIT} (ceiling: ${item.ceiling})`);
    } else {
      console.log(`  ${item.path}: ${item.lines} (ceiling: ${item.ceiling}, ${item.lines - item.ceiling})`);
    }
  }
  console.log('');
}

if (dryRun) {
  console.log('(Dry run - not failing on regressions)');
  process.exit(0);
}

if (newViolations.length > 0 || grown.length > 0) {
  console.log('❌ FAIL: Source file length regressed.');
  if (newViolations.length > 0) {
    console.log(`   ${newViolations.length} new file(s) crossed ${LINE_LIMIT} lines — extract before merging.`);
  }
  if (grown.length > 0) {
    console.log(`   ${grown.length} file(s) grew past their ceiling — shrink or update baseline if intentional.`);
  }
  process.exit(1);
}

if (improved.length > 0) {
  console.log('✅ PASS: File lengths improved!');
  console.log('   Consider running with --update to lower the ceilings.');
} else {
  console.log('✅ PASS: File lengths within baseline.');
}

process.exit(0);
