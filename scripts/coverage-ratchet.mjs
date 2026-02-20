#!/usr/bin/env node

/**
 * Coverage Ratchet Script
 *
 * Runs vitest with coverage and compares against baseline.
 * Fails if any coverage metric drops below baseline.
 *
 * Usage:
 *   node scripts/coverage-ratchet.mjs              # Check against baseline
 *   node scripts/coverage-ratchet.mjs --update     # Update baseline with current counts
 *   node scripts/coverage-ratchet.mjs --dry-run    # Show comparison without failing
 *
 * Environment:
 *   COVERAGE_BASELINE_PATH  Override baseline file path (for testing)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const BASELINE_PATH =
  process.env.COVERAGE_BASELINE_PATH || join(ROOT_DIR, 'coverage-baseline.json');
const SUMMARY_PATH = join(ROOT_DIR, 'coverage', 'coverage-summary.json');

const METRICS = ['statements', 'branches', 'functions', 'lines'];

const args = process.argv.slice(2);
const updateBaseline = args.includes('--update') || args.includes('--update-baseline');
const dryRun = args.includes('--dry-run');

/**
 * Run vitest with coverage. The json-summary reporter writes
 * coverage/coverage-summary.json which we read afterward.
 */
function runCoverage() {
  try {
    execSync('npx vitest run --coverage', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'inherit',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    // vitest exits non-zero if tests fail
    console.error('vitest run --coverage failed (tests may have failed).');
    process.exit(1);
  }
}

/**
 * Read coverage-summary.json and extract the total percentages.
 */
function readCoverageSummary() {
  if (!existsSync(SUMMARY_PATH)) {
    console.error(`Coverage summary not found: ${SUMMARY_PATH}`);
    console.error('Ensure vitest ran with --coverage and json-summary reporter.');
    process.exit(1);
  }

  try {
    const content = readFileSync(SUMMARY_PATH, 'utf-8');
    const summary = JSON.parse(content);
    const total = summary.total;

    const result = {};
    for (const metric of METRICS) {
      result[metric] = total[metric].pct;
    }
    return result;
  } catch (error) {
    console.error(`Failed to read coverage summary: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Load baseline from file.
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
 * Save baseline to file. Floors to 2 decimal places so minor
 * fluctuations from unrelated changes don't cause failures.
 */
function saveBaseline(current) {
  const baseline = {};
  for (const metric of METRICS) {
    baseline[metric] = Math.floor(current[metric] * 100) / 100;
  }

  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`\n✅ Baseline updated: ${BASELINE_PATH}`);
  for (const metric of METRICS) {
    console.log(`   ${metric}: ${baseline[metric]}%`);
  }
}

/**
 * Compare current coverage to baseline. Returns array of regressions.
 */
function compareToBaseline(current, baseline) {
  console.log('\nCoverage Ratchet Check');
  console.log('=====================');
  console.log('');

  const regressions = [];

  for (const metric of METRICS) {
    const curr = current[metric];
    const base = baseline[metric];
    const delta = curr - base;
    const deltaStr = `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;
    const label = metric.padEnd(12);
    console.log(`${label} ${curr.toFixed(2)}% (baseline: ${base}%, delta: ${deltaStr})`);

    if (curr < base) {
      regressions.push({ metric, current: curr, baseline: base, delta });
    }
  }

  console.log('');
  return regressions;
}

// Main execution
console.log('Running vitest with coverage...\n');
runCoverage();
const current = readCoverageSummary();

if (updateBaseline) {
  saveBaseline(current);
  process.exit(0);
}

const baseline = loadBaseline();
const regressions = compareToBaseline(current, baseline);

if (dryRun) {
  console.log('(Dry run - not failing on regressions)');
  process.exit(0);
}

if (regressions.length > 0) {
  console.log('❌ FAIL: Coverage regressed!');
  for (const r of regressions) {
    console.log(`   ${r.metric}: ${r.current.toFixed(2)}% < baseline ${r.baseline}%`);
  }
  process.exit(1);
}

const improved = METRICS.some((m) => current[m] > baseline[m]);
if (improved) {
  console.log('✅ PASS: Coverage improved!');
  console.log('   Consider running with --update to capture new baseline.');
} else {
  console.log('✅ PASS: Coverage within baseline.');
}

process.exit(0);
