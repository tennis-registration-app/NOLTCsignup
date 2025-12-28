/**
 * Capture a live /get-board response and save as fixture
 *
 * Usage: node scripts/capture-board-fixture.js [fixture-name]
 * Example: node scripts/capture-board-fixture.js busy-state
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://dncjloqewjubodkoruou.supabase.co';
const DEVICE_ID = 'a0000000-0000-0000-0000-000000000001'; // Kiosk

async function captureFixture(name) {
  const fixtureName =
    name || `capture-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;

  console.log(`Capturing /get-board response as "${fixtureName}"...`);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-board`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': DEVICE_ID,
        'x-device-type': 'kiosk',
      },
    });

    const data = await response.json();

    // Add metadata
    const fixture = {
      _meta: {
        capturedAt: new Date().toISOString(),
        httpStatus: response.status,
        description: fixtureName,
      },
      ...data,
    };

    const filePath = path.join(__dirname, '..', 'fixtures', 'board', `${fixtureName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2));

    console.log(`✅ Saved to ${filePath}`);
    console.log(`   Courts: ${data.courts?.length || 0}`);
    console.log(`   Waitlist: ${data.waitlist?.length || 0}`);
    console.log(`   Server time: ${data.serverNow}`);

    // Show court states
    if (data.courts) {
      const occupied = data.courts.filter((c) => c.status === 'occupied' || c.session_id).length;
      const blocked = data.courts.filter((c) => c.status === 'blocked' || c.block_id).length;
      console.log(
        `   Occupied: ${occupied}, Blocked: ${blocked}, Available: ${data.courts.length - occupied - blocked}`
      );
    }
  } catch (error) {
    console.error('❌ Failed to capture:', error.message);
    process.exit(1);
  }
}

const fixtureName = process.argv[2];
captureFixture(fixtureName);
