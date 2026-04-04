#!/usr/bin/env tsx
/**
 * scripts/seed.ts
 *
 * Creates a realistic demo state for NOLTC contractor onboarding.
 * Assumes the backend _001 migration (courts, devices, settings, operating_hours)
 * and _002 migration (22 accounts, 40 members) have already run.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npm run seed
 *
 * Demo state:
 *   - 10 courts with sessions (7 active, 2 overtime, 1 recent)
 *   - 2 blocks (court 11: active lesson, court 12: upcoming maintenance)
 *   - 1 waitlist entry (doubles group, 2 members)
 *
 * Idempotent: deletes all d0000000-prefixed records first.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ============================================================================
// CONFIG
// ============================================================================

function loadEnvLocal(): Record<string, string> {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf-8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

const envLocal = loadEnvLocal();
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? envLocal['VITE_SUPABASE_URL'];
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌  VITE_SUPABASE_URL not found. Set it in .env.local or as an env var.');
  process.exit(1);
}
if (!serviceRoleKey) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY is required. Pass it as an env var:');
  console.error('    SUPABASE_SERVICE_ROLE_KEY=<key> npm run seed');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// ============================================================================
// CONSTANTS
// ============================================================================

const KIOSK_DEVICE_ID = 'a0000000-0000-0000-0000-000000000001';

/** Build a deterministic seed UUID from a numeric suffix. All seed IDs begin with d0000000-. */
function seedId(suffix: number): string {
  return `d0000000-0000-0000-0000-${String(suffix).padStart(12, '0')}`;
}

const ID = {
  // Sessions: courts 1–10 → suffixes 1–10
  session: (courtN: number) => seedId(courtN),
  // Blocks: court 11 → suffix 101, court 12 → suffix 102
  block: (n: number) => seedId(100 + n),
  // Waitlist: suffix 201
  waitlist: (n: number) => seedId(200 + n),
  // session_participants: suffixes 1001+
  sp: (n: number) => seedId(1000 + n),
  // waitlist_members: suffixes 2001+
  wm: (n: number) => seedId(2000 + n),
};

// ============================================================================
// TIME HELPERS
// ============================================================================

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

function minutesFromNow(n: number): string {
  return new Date(Date.now() + n * 60_000).toISOString();
}

function addMinutes(isoTs: string, n: number): string {
  return new Date(new Date(isoTs).getTime() + n * 60_000).toISOString();
}

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

type MemberRow = { id: string; account_id: string; display_name: string };
type CourtRow  = { id: string; court_number: number };

async function fetchCourts(): Promise<Map<number, string>> {
  const { data, error } = await supabase
    .from('courts')
    .select('id, court_number');
  if (error) throw new Error(`Failed to fetch courts: ${error.message}`);
  const map = new Map<number, string>();
  for (const c of (data as CourtRow[])) map.set(c.court_number, c.id);
  return map;
}

async function fetchMembers(): Promise<Map<string, MemberRow>> {
  const { data, error } = await supabase
    .from('members')
    .select('id, account_id, display_name');
  if (error) throw new Error(`Failed to fetch members: ${error.message}`);
  const map = new Map<string, MemberRow>();
  for (const m of (data as MemberRow[])) map.set(m.display_name, m);
  return map;
}

function court(courts: Map<number, string>, n: number): string {
  const id = courts.get(n);
  if (!id) throw new Error(`Court ${n} not found — has the _001 seed run?`);
  return id;
}

function member(members: Map<string, MemberRow>, name: string): MemberRow {
  const m = members.get(name);
  if (!m) throw new Error(`Member "${name}" not found — has the _002 seed run?`);
  return m;
}

// ============================================================================
// DELETE (children first, reverse FK dependency order)
// ============================================================================

async function deleteSeededData(): Promise<void> {
  console.log('🗑️  Deleting existing seed data...');

  const steps: Array<{ table: string; column: string }> = [
    { table: 'session_participants', column: 'session_id' },
    { table: 'session_events',       column: 'session_id' },
    { table: 'waitlist_members',     column: 'waitlist_id' },
    { table: 'sessions',             column: 'id' },
    { table: 'waitlist',             column: 'id' },
    { table: 'blocks',               column: 'id' },
  ];

  for (const { table, column } of steps) {
    const { error } = await supabase
      .from(table)
      .delete()
      .like(column, 'd0000000-%');
    if (error) throw new Error(`Delete from ${table} failed: ${error.message}`);
    process.stdout.write(`   ✓ ${table}\n`);
  }
}

// ============================================================================
// INSERT: SESSIONS + SESSION_PARTICIPANTS
// ============================================================================

type SessionDef = {
  courtN:         number;
  type:           'singles' | 'doubles';
  startedMinsAgo: number;
  durationMins:   number;
  players:        string[];
};

// 7 active (end in future), 2 overtime (end in past), 1 recent start
const SESSION_DEFS: SessionDef[] = [
  { courtN:  1, type: 'singles', startedMinsAgo: 20,  durationMins:  60, players: ['Jannik Sinner', 'Anna Sinner'] },
  { courtN:  2, type: 'doubles', startedMinsAgo: 30,  durationMins:  90, players: ['Carlos Alcaraz', 'Maria Alcaraz', 'Andrey Rublev', 'Anastasia Rubleva'] },
  { courtN:  3, type: 'singles', startedMinsAgo: 15,  durationMins:  60, players: ['Novak Djokovic', 'Jelena Djokovic'] },
  { courtN:  4, type: 'doubles', startedMinsAgo: 45,  durationMins:  90, players: ['Rafael Nadal', 'Mery Nadal', 'Roger Federer', 'Mirka Federer'] },
  { courtN:  5, type: 'singles', startedMinsAgo: 10,  durationMins:  60, players: ['Serena Williams', 'Venus Williams'] },
  { courtN:  6, type: 'singles', startedMinsAgo: 50,  durationMins:  60, players: ['Taylor Fritz', 'Morgan Fritz'] },
  { courtN:  7, type: 'doubles', startedMinsAgo: 60,  durationMins:  90, players: ['Daniil Medvedev', 'Daria Medvedeva', 'Alexander Zverev', 'Sophia Zverev'] },
  // overtime (scheduled_end_at in the past)
  { courtN:  8, type: 'singles', startedMinsAgo: 120, durationMins:  60, players: ['Frances Tiafoe', 'Casper Ruud'] },
  { courtN:  9, type: 'doubles', startedMinsAgo: 150, durationMins:  90, players: ['Boris Becker', 'Lilly Becker', 'Bjorn Borg', 'Patricia Borg'] },
  // recently started
  { courtN: 10, type: 'singles', startedMinsAgo:  3,  durationMins:  60, players: ['Naomi Osaka', 'Andre Agassi'] },
];

async function seedSessions(
  courts:  Map<number, string>,
  members: Map<string, MemberRow>,
): Promise<void> {
  console.log('\n🎾 Inserting sessions...');

  const sessionRows = SESSION_DEFS.map(def => {
    const startedAt = minutesAgo(def.startedMinsAgo);
    return {
      id:                      ID.session(def.courtN),
      court_id:                court(courts, def.courtN),
      session_type:            def.type,
      duration_minutes:        def.durationMins,
      started_at:              startedAt,
      scheduled_end_at:        addMinutes(startedAt, def.durationMins),
      actual_end_at:           null,
      end_reason:              null,
      created_by_device_id:    KIOSK_DEVICE_ID,
      ended_by_device_id:      null,
      participant_key:         `seed-court-${def.courtN}`,
      is_tournament:           false,
      registered_by_member_id: member(members, def.players[0]).id,
    };
  });

  const { error: sessErr } = await supabase.from('sessions').insert(sessionRows);
  if (sessErr) throw new Error(`Insert sessions failed: ${sessErr.message}`);
  console.log(`   ✓ ${sessionRows.length} sessions`);

  let spIdx = 1;
  const spRows = SESSION_DEFS.flatMap(def =>
    def.players.map(name => {
      const m = member(members, name);
      return {
        id:               ID.sp(spIdx++),
        session_id:       ID.session(def.courtN),
        member_id:        m.id,
        guest_name:       null,
        participant_type: 'member' as const,
        account_id:       m.account_id,
      };
    }),
  );

  const { error: spErr } = await supabase.from('session_participants').insert(spRows);
  if (spErr) throw new Error(`Insert session_participants failed: ${spErr.message}`);
  console.log(`   ✓ ${spRows.length} session_participants`);
}

// ============================================================================
// INSERT: WAITLIST + WAITLIST_MEMBERS
// ============================================================================

async function seedWaitlist(members: Map<string, MemberRow>): Promise<void> {
  console.log('\n⏳ Inserting waitlist...');

  const { error: wErr } = await supabase.from('waitlist').insert([{
    id:                   ID.waitlist(1),
    group_type:           'doubles',
    position:             1,
    status:               'waiting',
    joined_at:            minutesAgo(12),
    assigned_at:          null,
    assigned_session_id:  null,
    created_by_device_id: KIOSK_DEVICE_ID,
    deferred:             false,
  }]);
  if (wErr) throw new Error(`Insert waitlist failed: ${wErr.message}`);
  console.log('   ✓ 1 waitlist entry');

  const tsitsipas = member(members, 'Stefanos Tsitsipas');
  const evert     = member(members, 'Chris Evert');

  const { error: wmErr } = await supabase.from('waitlist_members').insert([
    {
      id:               ID.wm(1),
      waitlist_id:      ID.waitlist(1),
      member_id:        tsitsipas.id,
      guest_name:       null,
      participant_type: 'member' as const,
      account_id:       tsitsipas.account_id,
    },
    {
      id:               ID.wm(2),
      waitlist_id:      ID.waitlist(1),
      member_id:        evert.id,
      guest_name:       null,
      participant_type: 'member' as const,
      account_id:       evert.account_id,
    },
  ]);
  if (wmErr) throw new Error(`Insert waitlist_members failed: ${wmErr.message}`);
  console.log('   ✓ 2 waitlist_members');
}

// ============================================================================
// INSERT: BLOCKS
// ============================================================================

async function seedBlocks(courts: Map<number, string>): Promise<void> {
  console.log('\n🚧 Inserting blocks...');

  const { error } = await supabase.from('blocks').insert([
    {
      // Court 11: active lesson block (started 30 min ago, ends in 60 min)
      id:                   ID.block(1),
      court_id:             court(courts, 11),
      block_type:           'lesson',
      title:                'Private Lesson',
      starts_at:            minutesAgo(30),
      ends_at:              minutesFromNow(60),
      is_recurring:         false,
      recurrence_rule:      null,
      created_by_device_id: KIOSK_DEVICE_ID,
      cancelled_at:         null,
      recurrence_group_id:  null,
    },
    {
      // Court 12: upcoming maintenance block (starts in 2 hours, ends in 4 hours)
      id:                   ID.block(2),
      court_id:             court(courts, 12),
      block_type:           'maintenance',
      title:                'Court Maintenance',
      starts_at:            minutesFromNow(120),
      ends_at:              minutesFromNow(240),
      is_recurring:         false,
      recurrence_rule:      null,
      created_by_device_id: KIOSK_DEVICE_ID,
      cancelled_at:         null,
      recurrence_group_id:  null,
    },
  ]);
  if (error) throw new Error(`Insert blocks failed: ${error.message}`);
  console.log('   ✓ 2 blocks');
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('🌱 NOLTC Demo Seed');
  console.log(`   URL: ${supabaseUrl}\n`);

  const [courts, members] = await Promise.all([fetchCourts(), fetchMembers()]);

  // Validate prerequisites
  for (let n = 1; n <= 12; n++) court(courts, n);
  console.log(`✅ ${courts.size} courts found`);
  console.log(`✅ ${members.size} members found\n`);

  await deleteSeededData();
  await seedSessions(courts, members);
  await seedWaitlist(members);
  await seedBlocks(courts);

  console.log('\n✅ Seeded: 10 sessions, 1 waitlist entry, 2 blocks');
}

main().catch(err => {
  console.error('\n❌ Seed failed:', (err as Error).message);
  process.exit(1);
});
