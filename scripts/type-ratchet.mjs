#!/usr/bin/env node

/**
 * TypeScript Ratchet Script (WP-HR5)
 *
 * Runs tsc --noEmit and compares error count against baseline.
 * Fails if errors exceed baseline counts.
 *
 * Usage:
 *   node scripts/type-ratchet.mjs              # Check against baseline
 *   node scripts/type-ratchet.mjs --update     # Update baseline with current counts
 *   node scripts/type-ratchet.mjs --dry-run    # Show comparison without failing
 *
 * Environment:
 *   TYPESCRIPT_BASELINE_PATH  Override baseline file path (for testing)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const BASELINE_PATH = process.env.TYPESCRIPT_BASELINE_PATH || join(ROOT_DIR, 'typescript-baseline.json');

const args = process.argv.slice(2);
const updateBaseline = args.includes('--update') || args.includes('--update-baseline');
const dryRun = args.includes('--dry-run');

/**
 * Run typecheck via npm script and return the raw output.
 * Uses npm run typecheck to ensure single source of truth for tsc invocation.
 */
function runTypecheck() {
  try {
    const result = execSync('npm run -s typecheck -- --pretty false', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
    return result;
  } catch (error) {
    // tsc exits non-zero if there are errors, but still outputs to stdout
    if (error.stdout != null) {
      return error.stdout;
    }
    console.error('tsc execution failed:', error.message);
    process.exit(1);
  }
}

/**
 * Count errors from tsc output
 * tsc --pretty false format: "file(line,col): error TSxxxx: message"
 */
function countErrors(tscOutput) {
  const lines = tscOutput.split('\n');
  let errors = 0;
  const byCode = {};

  for (const line of lines) {
    const match = line.match(/error (TS\d+):/);
    if (match) {
      errors++;
      const code = match[1];
      byCode[code] = (byCode[code] || 0) + 1;
    }
  }

  return { errors, byCode };
}

/**
 * Load baseline from file
 */
function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(`Baseline file not found: ${BASELINE_PATH}`);
    console.error('Run with --update to create initial baseline.');
    process.exit(1);
  }

  try {
    const content = readFileSync(BASELINE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read baseline: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Save baseline to file
 */
function saveBaseline(counts) {
  const sortedByCode = {};
  for (const key of Object.keys(counts.byCode).sort()) {
    sortedByCode[key] = counts.byCode[key];
  }

  const baseline = {
    errors: counts.errors,
    byCode: sortedByCode,
  };

  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`✅ Baseline updated: ${BASELINE_PATH}`);
  console.log(`   Errors: ${counts.errors}`);
}

/**
 * Compare current counts to baseline
 */
function compareToBaseline(current, baseline) {
  const errorDelta = current.errors - baseline.errors;

  console.log('TypeScript Ratchet Check');
  console.log('=======================');
  console.log('');
  console.log(`Errors: ${current.errors} (baseline: ${baseline.errors}, delta: ${errorDelta >= 0 ? '+' : ''}${errorDelta})`);
  console.log('');

  if (Object.keys(current.byCode).length > 0 || Object.keys(baseline.byCode || {}).length > 0) {
    console.log('By Error Code:');
    const allCodes = new Set([...Object.keys(current.byCode), ...Object.keys(baseline.byCode || {})]);
    for (const code of [...allCodes].sort()) {
      const curr = current.byCode[code] || 0;
      const base = (baseline.byCode || {})[code] || 0;
      const delta = curr - base;
      if (delta !== 0 || curr > 0) {
        const deltaStr = delta === 0 ? '' : ` (${delta >= 0 ? '+' : ''}${delta})`;
        console.log(`  ${code}: ${curr}${deltaStr}`);
      }
    }
    console.log('');
  }

  return { errorDelta };
}

// Main execution
console.log('Running tsc --noEmit...');
const tscOutput = runTypecheck();
const current = countErrors(tscOutput);

if (updateBaseline) {
  saveBaseline(current);
  process.exit(0);
}

const baseline = loadBaseline();
const { errorDelta } = compareToBaseline(current, baseline);

if (dryRun) {
  console.log('(Dry run - not failing on regressions)');
  process.exit(0);
}

if (errorDelta > 0) {
  console.log('❌ FAIL: Type error count increased!');
  console.log(`   Fix ${errorDelta} error(s) or update baseline if intentional.`);
  process.exit(1);
}

if (errorDelta < 0) {
  console.log('✅ PASS: Type error count improved!');
  console.log('   Consider running with --update to capture new baseline.');
} else {
  console.log('✅ PASS: Type error count within baseline.');
}

process.exit(0);
