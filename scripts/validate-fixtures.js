/**
 * Validate all board fixtures against normalize layer + Zod schemas
 *
 * Usage: node scripts/validate-fixtures.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We need to use dynamic import for ES modules
async function main() {
  const fixturesDir = path.join(__dirname, '..', 'fixtures', 'board');

  if (!fs.existsSync(fixturesDir)) {
    console.log('No fixtures directory found. Run capture-board-fixture.js first.');
    process.exit(0);
  }

  const files = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('No fixture files found. Run capture-board-fixture.js first.');
    process.exit(0);
  }

  console.log(`\nValidating ${files.length} fixture(s)...\n`);

  // Dynamic import ES modules
  const { normalizeBoard } = await import('../src/lib/normalize/index.js');
  const { validateBoardResponse } = await import('../src/lib/schemas/apiEnvelope.js');
  const { validateBoard } = await import('../src/lib/schemas/domain.js');

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(fixturesDir, file);
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Remove metadata before validation
    const { _meta, ...apiResponse } = raw;

    console.log(`📄 ${file}`);
    if (_meta) {
      console.log(`   Captured: ${_meta.capturedAt}`);
    }

    // Step 1: Validate API envelope
    const envelopeResult = validateBoardResponse(apiResponse);
    if (!envelopeResult.success) {
      console.log(`   ❌ API envelope validation failed:`);
      console.log(
        `      ${JSON.stringify(envelopeResult.error.format(), null, 2).slice(0, 200)}`
      );
      failed++;
      continue;
    }
    console.log(`   ✅ API envelope valid`);

    // Step 2: Normalize
    let board;
    try {
      board = normalizeBoard(apiResponse);
      console.log(`   ✅ Normalization succeeded`);
      console.log(`      Courts: ${board.courts.length}, Waitlist: ${board.waitlist.length}`);
    } catch (error) {
      console.log(`   ❌ Normalization failed: ${error.message}`);
      failed++;
      continue;
    }

    // Step 3: Validate Domain
    const domainResult = validateBoard(board);
    if (!domainResult.success) {
      console.log(`   ❌ Domain validation failed:`);
      const errors = domainResult.error.format();
      console.log(`      ${JSON.stringify(errors, null, 2).slice(0, 500)}`);
      failed++;
      continue;
    }
    console.log(`   ✅ Domain validation passed`);

    // Show summary
    const occupiedCourts = board.courts.filter((c) => c.isOccupied).length;
    const blockedCourts = board.courts.filter((c) => c.isBlocked).length;
    console.log(
      `   Summary: ${occupiedCourts} occupied, ${blockedCourts} blocked, ${board.waitlist.length} waiting`
    );

    passed++;
    console.log('');
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
