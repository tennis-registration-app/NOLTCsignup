# TypeScript Migration Progress

## Status: In Progress (Phase 2 complete, Phase 3 next)

---

## Phase 1: Shared Types — COMPLETE
- [x] Created `src/types/index.ts` with shared interfaces:
  - `Court` (raw API snake_case shape)
  - `Block` (raw API snake_case shape)
  - `Session` (raw API snake_case shape)
  - `Member` (raw API snake_case shape)
  - `Account` (billing/family unit)
  - `Recurrence` (pattern, frequency, endType, occurrences, endDate, daysOfWeek)
  - `BoardCourt` (normalized court from get-board)
  - `ApiResponse<T>` (ok, code, message, data, board, serverNow)
- [x] Re-exports all domain types from `appTypes.ts` (which already existed with 1206 lines)
- [x] Based on JSDoc annotations and actual data shapes in normalize/*.js
- [x] Run `npm run verify` — PASS

---

## Phase 2: Utility Layer — `src/lib/` — COMPLETE
- [x] Renamed all 60 `src/lib/**/*.js` files to `.ts` via `git mv`
- [x] Added TypeScript class property declarations (ApiAdapter, AdminCommands, TennisCourtDataStore, StorageAdapter, TennisCommands, TennisDirectory, TennisBackend, TennisQueries)
- [x] Fixed `const errors: string[] = []` in all 10 command files (was inferred `never[]`)
- [x] Typed all `options = {}` parameters with explicit interfaces
- [x] Fixed `Record<string, unknown>` property accesses with targeted casts
- [x] Added `ApiConfigShape` interface and typed Proxy in `apiConfig.ts`
- [x] Fixed `wire.ts` payload types with `Record<string, unknown>`
- [x] Fixed `normalizeCourt.ts` and `normalizeMember.ts` null variable declarations
- [x] Fixed all logger call type errors (data: unknown)
- [x] Fixed `TennisBackendShape` / `TennisBusinessLogicShape` compatibility in `appTypes.ts`
- [x] Fixed `AdminCommands` API response typing with `ApiResponse` type
- [x] Fixed `useBallPurchase.js` `existingPurchases` JSDoc cast
- [x] Reduced TS errors from 478 → 0
- [x] Run `npm run verify` — PASS (lint ✅, type-check ✅, coverage ✅, fixtures ✅, build ✅, e2e ✅)

---

## Phase 3: Registration Module — `src/registration/` — PENDING
- [ ] Convert all .js/.jsx files to .ts/.tsx
- [ ] Run `npm run verify`

## Phase 4: Admin Shared — `src/admin/` root + handlers — PENDING
- [ ] Convert .js/.jsx in src/admin/ root and src/admin/handlers/
- [ ] Run `npm run verify`

## Phase 5: Admin Blocks — `src/admin/blocks/` — PENDING
- [ ] Convert all .js/.jsx (SmartTimeRangePicker.tsx already done)
- [ ] Run `npm run verify`

## Phase 6: Admin Calendar — `src/admin/calendar/` — PENDING
- [ ] Convert all .js/.jsx
- [ ] Run `npm run verify`

## Phase 7: Admin Remaining — analytics, system, guards, etc. — PENDING
- [ ] Convert remaining .js/.jsx in src/admin/
- [ ] Run `npm run verify`

## Phase 8: Top-Level App Files — PENDING
- [ ] Convert src/App.jsx, src/main.jsx and remaining src/ root .js/.jsx
- [ ] Run `npm run verify`

## Phase 9: Test Files — PENDING
- [ ] Convert tests/ from .js/.jsx to .ts/.tsx
- [ ] Run `npm run verify`

## Phase 10: Cleanup and Verification — PENDING
- [ ] Search for remaining .js/.jsx in src/
- [ ] Search for remaining .js/.jsx in tests/
- [ ] Verify zero avoidable `any` types
- [ ] Run `npm run verify` final time
