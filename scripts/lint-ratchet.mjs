#!/usr/bin/env node

/**
 * ESLint Ratchet Script (WP-HR7)
 *
 * Runs ESLint with JSON output and compares against baseline.
 * Fails if warnings or errors exceed baseline counts.
 *
 * Usage:
 *   node scripts/lint-ratchet.mjs              # Check against baseline
 *   node scripts/lint-ratchet.mjs --update     # Update baseline with current counts
 *   node scripts/lint-ratchet.mjs --dry-run    # Show comparison without failing
 *
 * Environment:
 *   ESLINT_BASELINE_PATH  Override baseline file path (for testing)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Allow baseline path override via env var (useful for proof tests)
const BASELINE_PATH = process.env.ESLINT_BASELINE_PATH || join(ROOT_DIR, 'eslint-baseline.json');

// Parse CLI args
const args = process.argv.slice(2);
const updateBaseline = args.includes('--update') || args.includes('--update-baseline');
const dryRun = args.includes('--dry-run');

/**
 * Run ESLint and return parsed JSON results
 */
function runEslint() {
  try {
    // Run ESLint with JSON format
    // Note: ESLint exits non-zero if there are errors, so we handle that
    const result = execSync(
      'npx eslint src/ --ext .js,.jsx --format json',
      {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      }
    );
    return JSON.parse(result);
  } catch (error) {
    // ESLint exits with code 1 if there are warnings/errors, but still outputs JSON
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (parseError) {
        console.error('Failed to parse ESLint output:', parseError.message);
        process.exit(1);
      }
    }
    console.error('ESLint execution failed:', error.message);
    process.exit(1);
  }
}

/**
 * Count errors and warnings from ESLint JSON output
 */
function countIssues(eslintResults) {
  let errors = 0;
  let warnings = 0;
  const byRule = {};

  for (const file of eslintResults) {
    for (const message of file.messages) {
      if (message.severity === 2) {
        errors++;
      } else if (message.severity === 1) {
        warnings++;
      }

      // Track by rule
      const ruleId = message.ruleId || 'unknown';
      byRule[ruleId] = (byRule[ruleId] || 0) + 1;
    }
  }

  return { errors, warnings, byRule };
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
  // Sort byRule for stable output
  const sortedByRule = {};
  for (const key of Object.keys(counts.byRule).sort()) {
    sortedByRule[key] = counts.byRule[key];
  }

  const baseline = {
    errors: counts.errors,
    warnings: counts.warnings,
    byRule: sortedByRule,
  };

  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`✅ Baseline updated: ${BASELINE_PATH}`);
  console.log(`   Errors: ${counts.errors}`);
  console.log(`   Warnings: ${counts.warnings}`);
}

/**
 * Compare current counts to baseline
 */
function compareToBaseline(current, baseline) {
  const errorDelta = current.errors - baseline.errors;
  const warningDelta = current.warnings - baseline.warnings;

  console.log('ESLint Ratchet Check');
  console.log('====================');
  console.log('');
  console.log(`Errors:   ${current.errors} (baseline: ${baseline.errors}, delta: ${errorDelta >= 0 ? '+' : ''}${errorDelta})`);
  console.log(`Warnings: ${current.warnings} (baseline: ${baseline.warnings}, delta: ${warningDelta >= 0 ? '+' : ''}${warningDelta})`);
  console.log('');

  // Show rule breakdown if there are changes
  if (Object.keys(current.byRule).length > 0) {
    console.log('By Rule:');
    const allRules = new Set([...Object.keys(current.byRule), ...Object.keys(baseline.byRule || {})]);
    for (const rule of [...allRules].sort()) {
      const curr = current.byRule[rule] || 0;
      const base = (baseline.byRule || {})[rule] || 0;
      const delta = curr - base;
      if (delta !== 0 || curr > 0) {
        const deltaStr = delta === 0 ? '' : ` (${delta >= 0 ? '+' : ''}${delta})`;
        console.log(`  ${rule}: ${curr}${deltaStr}`);
      }
    }
    console.log('');
  }

  return { errorDelta, warningDelta };
}

// Main execution
console.log('Running ESLint...');
const eslintResults = runEslint();
const current = countIssues(eslintResults);

if (updateBaseline) {
  saveBaseline(current);
  process.exit(0);
}

const baseline = loadBaseline();
const { errorDelta, warningDelta } = compareToBaseline(current, baseline);

if (dryRun) {
  console.log('(Dry run - not failing on regressions)');
  process.exit(0);
}

// Check for regressions
if (errorDelta > 0) {
  console.log('❌ FAIL: Error count increased!');
  console.log(`   Fix ${errorDelta} error(s) or update baseline if intentional.`);
  process.exit(1);
}

if (warningDelta > 0) {
  console.log('❌ FAIL: Warning count increased!');
  console.log(`   Fix ${warningDelta} warning(s) or update baseline if intentional.`);
  process.exit(1);
}

if (errorDelta < 0 || warningDelta < 0) {
  console.log('✅ PASS: Lint counts improved!');
  console.log('   Consider running with --update to capture new baseline.');
} else {
  console.log('✅ PASS: Lint counts within baseline.');
}

process.exit(0);
