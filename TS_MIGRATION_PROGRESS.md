# TypeScript Migration Progress

## Status: In Progress

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

## Phase 2: Utility Layer — `src/lib/` — PENDING
- [ ] Convert `src/lib/ApiAdapter.js` to `.ts`
- [ ] Convert `src/lib/TennisBusinessLogic.js` to `.ts`
- [ ] Convert `src/lib/TennisCourtDataStore.js` to `.ts`
- [ ] Convert `src/lib/config.js` to `.ts`
- [ ] Convert `src/lib/apiConfig.js` to `.ts`
- [ ] Convert `src/lib/constants.js` to `.ts`
- [ ] Convert `src/lib/court-blocks.js` to `.ts`
- [ ] Convert `src/lib/dateUtils.js` to `.ts`
- [ ] Convert `src/lib/DataValidation.js` to `.ts`
- [ ] Convert `src/lib/formatters.js` to `.ts`
- [ ] Convert `src/lib/logger.js` to `.ts`
- [ ] Convert `src/lib/index.js` to `.ts`
- [ ] Convert `src/lib/storage.js` to `.ts`
- [ ] Convert `src/lib/StorageAdapter.js` to `.ts`
- [ ] Convert `src/lib/normalizeWaitlist.js` to `.ts`
- [ ] Convert `src/lib/api/` files to `.ts`
- [ ] Convert `src/lib/backend/` files to `.ts`
- [ ] Convert `src/lib/commands/` files to `.ts`
- [ ] Convert `src/lib/domain/` files to `.ts`
- [ ] Convert `src/lib/errors/` files to `.ts`
- [ ] Convert `src/lib/normalize/` files to `.ts`
- [ ] Convert `src/lib/schemas/` files to `.ts`
- [ ] Convert `src/lib/types/` files to `.ts`
- [ ] Run `npm run verify`

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
