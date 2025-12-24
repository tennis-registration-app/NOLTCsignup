# NOLTC Tennis Court Registration System - Verification Checklist

## Test Environment

| Item | Value |
|------|-------|
| Supabase Project | dncjloqewjubodkoruou |
| Registration URL | http://localhost:5173/NOLTCsignup/src/registration/index.html |
| Courtboard URL | http://localhost:5173/NOLTCsignup/src/courtboard/index.html |
| Admin URL | http://localhost:5173/NOLTCsignup/src/admin/index.html |
| Mobile URL | http://localhost:5173/NOLTCsignup/Mobile.html |
| Kiosk Device ID | a0000000-0000-0000-0000-000000000001 |
| Admin Device ID | a0000000-0000-0000-0000-000000000002 |
| Mobile Device ID | a0000000-0000-0000-0000-000000000003 |
| Club Coordinates | 29.91901, -90.11481 |
| Geofence Radius | 80m |

---

## 1. Board Refresh & Realtime

### 1.1 Signal propagation to Registration
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 1.1.1 | Open Registration app | Welcome screen loads, courts data visible | | | |
| 1.1.2 | Assign a court via Admin (different browser/tab) | Registration updates automatically within 5s | | | |
| 1.1.3 | End a session via Admin | Registration shows court as available | | | |

### 1.2 Signal propagation to Courtboard
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 1.2.1 | Open Courtboard app | All 12 courts displayed | | | |
| 1.2.2 | Assign a court via Registration | Courtboard updates automatically within 5s | | | |
| 1.2.3 | End a session via Registration | Courtboard shows court as available | | | |
| 1.2.4 | Create a block via Admin | Courtboard shows court as blocked | | | |

### 1.3 Signal propagation to Admin
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 1.3.1 | Open Admin app | Dashboard loads with court status | | | |
| 1.3.2 | Assign a court via Registration | Admin dashboard updates automatically | | | |
| 1.3.3 | Join waitlist via Registration | Admin waitlist section updates | | | |

### 1.4 Reconnection resilience
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 1.4.1 | Open Courtboard, switch to different tab for 30s, return | Board refreshes on tab focus | | | |
| 1.4.2 | Simulate network disconnect (DevTools offline), reconnect | Board refreshes on reconnect | | | |

---

## 2. Registration Flows

### 2.1 Court Assignment - Singles
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 2.1.1 | Start registration, search for member | Member autocomplete works | | | |
| 2.1.2 | Select 1 member, proceed | Group screen shows 1 player | | | |
| 2.1.3 | Add 1 more player (2 total) | Group shows 2 players, "Singles" label | | | |
| 2.1.4 | Select available court | Court assigned, success screen shown | | | |
| 2.1.5 | Verify session created in database | Session exists with 2 participants | | | |

### 2.2 Court Assignment - Doubles
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 2.2.1 | Start registration, add 4 players | Group shows 4 players, "Doubles" label | | | |
| 2.2.2 | Select available court | Court assigned, success screen shown | | | |
| 2.2.3 | Verify session created | Session exists with 4 participants, group_type='doubles' | | | |

### 2.3 Member Already Playing Prevention
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 2.3.1 | Assign Player A to Court 1 | Success | | | |
| 2.3.2 | Start new registration, try to add Player A | Toast: "Player A is already playing on Court 1" | | | |
| 2.3.3 | Verify Player A cannot be added | Player unselectable or rejected | | | |

### 2.4 Member Already on Waitlist Prevention
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 2.4.1 | Fill all courts (or simulate) | No available courts | | | |
| 2.4.2 | Add Player B to waitlist | Waitlist position shown | | | |
| 2.4.3 | Start new registration, try to add Player B | Toast: "Player B is already on waitlist" | | | |

### 2.5 End Session (Clear Court)
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 2.5.1 | Clear an occupied court via Registration | Court becomes available | | | |
| 2.5.2 | Verify session_events has END event | END event exists with correct session_id | | | |
| 2.5.3 | Verify sessions.actual_end_at is set | actual_end_at matches END event time | | | |

### 2.6 Overtime Rules
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 2.6.1 | Manually set a session to overtime (past scheduled_end_at) | Court shows as "overtime" | | | |
| 2.6.2 | New group tries to take overtime court | Previous session ended, new session created | | | |
| 2.6.3 | Verify old session has END event with reason | END event shows 'cleared_early' or similar | | | |

### 2.7 Waitlist - Join
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 2.7.1 | All courts occupied, start registration | "Join Waitlist" option available | | | |
| 2.7.2 | Add players and join waitlist | Success, position shown | | | |
| 2.7.3 | Verify waitlist_entries created | Entry exists with status='waiting' | | | |

### 2.8 Waitlist - Cancel
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 2.8.1 | Cancel waitlist entry via Registration | Entry removed from waitlist | | | |
| 2.8.2 | Verify waitlist_entries.status | Status changed to 'cancelled' | | | |

### 2.9 Waitlist - Assign from Waitlist (CTA)
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 2.9.1 | Group on waitlist, court becomes available | CTA button appears | | | |
| 2.9.2 | Click CTA to claim court | Court assigned to waitlist group | | | |
| 2.9.3 | Verify waitlist_entries.status | Status changed to 'assigned' | | | |

### 2.10 Guest Entry
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 2.10.1 | Add a guest to group (not a member) | Guest appears in group | | | |
| 2.10.2 | Complete registration | Session includes guest participant | | | |
| 2.10.3 | Verify guest charge in transactions | Transaction with guest fee recorded | | | |

---

## 3. Admin Flows

### 3.1 Create Block
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 3.1.1 | Open Admin, select court(s) to block | Block modal appears | | | |
| 3.1.2 | Set reason (wet, maintenance), apply | Block created | | | |
| 3.1.3 | Verify court_blocks table | Block entry exists | | | |
| 3.1.4 | Verify Courtboard shows blocked status | Court displays as blocked | | | |
| 3.1.5 | Verify Registration cannot assign blocked court | Court not selectable | | | |

### 3.2 Cancel Block
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 3.2.1 | Cancel existing block via Admin | Block removed | | | |
| 3.2.2 | Verify court_blocks table | Block entry removed or status updated | | | |
| 3.2.3 | Verify court is now available | Court selectable in Registration | | | |

### 3.3 Admin End Session
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 3.3.1 | Force end a session via Admin | Session ended | | | |
| 3.3.2 | Verify audit_log | action='admin_end_session' logged | | | |
| 3.3.3 | Verify session has END event | END event with 'admin_force_end' reason | | | |

### 3.4 Clear All Courts
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 3.4.1 | Multiple courts occupied | Setup state | | | |
| 3.4.2 | Click "Clear All Courts" in Admin | Confirmation prompt appears | | | |
| 3.4.3 | Confirm action | All sessions ended | | | |
| 3.4.4 | Verify audit_log | action='clear_all_courts' with session count | | | |

### 3.5 Remove from Waitlist
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 3.5.1 | Group on waitlist | Setup state | | | |
| 3.5.2 | Remove via Admin | Entry removed | | | |
| 3.5.3 | Verify waitlist_entries.status | Status='removed' | | | |
| 3.5.4 | Verify audit_log | action='remove_from_waitlist' logged | | | |

### 3.6 Cleanup Sessions (Utility)
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 3.6.1 | Manually create duplicate sessions (test setup) | Multiple active sessions on one court | | | |
| 3.6.2 | Run cleanup-sessions | Duplicates resolved, only newest remains | | | |
| 3.6.3 | Verify audit_log | Cleanup action logged | | | |

---

## 4. Mobile Enforcement

### 4.1 In-Geofence Success
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 4.1.1 | Open Mobile app (or Registration with mobile device ID) | App loads | | | |
| 4.1.2 | Mock GPS to club location (29.91901, -90.11481) | GPS acquired | | | |
| 4.1.3 | Complete registration | Success, session created | | | |
| 4.1.4 | Verify audit_log | geo_verified_method='gps', geofence_status='validated' | | | |

### 4.2 Out-of-Geofence Denied
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 4.2.1 | Mock GPS to distant location (e.g., 29.95, -90.10) | GPS acquired | | | |
| 4.2.2 | Attempt registration | Error: "You must be at the club to register (Xm away)" | | | |
| 4.2.3 | Verify audit_log | geofence_status='failed', outcome='denied' | | | |

### 4.3 GPS Denied/Unavailable
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 4.3.1 | Block GPS permission in browser | GPS unavailable | | | |
| 4.3.2 | Attempt registration | Prompt to scan QR code appears | | | |
| 4.3.3 | Verify error handling | Clear message, QR option offered | | | |

### 4.4 QR Fallback
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 4.4.1 | Generate QR token on Kiosk/Admin | QR code displayed with countdown | | | |
| 4.4.2 | Scan QR with Mobile app | Token captured | | | |
| 4.4.3 | Complete registration with token | Success, session created | | | |
| 4.4.4 | Verify audit_log | geo_verified_method='qr' | | | |
| 4.4.5 | Verify location_tokens | Token marked as used | | | |

### 4.5 QR Token Expiry
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 4.5.1 | Generate token, wait for expiry (5 min) | Token expires | | | |
| 4.5.2 | Attempt to use expired token | Error: "Token expired" | | | |

### 4.6 QR Token Reuse Prevention
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 4.6.1 | Use a token successfully | Registration completes | | | |
| 4.6.2 | Attempt to use same token again | Error: "Token already used" | | | |

---

## 5. Transactions & Billing

### 5.1 Ball Purchase
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 5.1.1 | Complete registration with "Add Balls" option | Success screen shows ball charge | | | |
| 5.1.2 | Verify transactions table | Ball purchase transaction exists | | | |
| 5.1.3 | Verify transaction fields | account_id, amount, item_type='balls' | | | |

### 5.2 Guest Charge
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 5.2.1 | Register with a guest player | Success | | | |
| 5.2.2 | Verify transactions table | Guest fee transaction exists | | | |
| 5.2.3 | Verify billing attribution | Correct account_id charged | | | |

### 5.3 Audit Log Completeness
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 5.3.1 | Review audit_log for session_start | Entry exists with all fields | | | |
| 5.3.2 | Review audit_log for session_end | Entry exists | | | |
| 5.3.3 | Review audit_log for waitlist_join | Entry exists | | | |
| 5.3.4 | Review audit_log for block_create | Entry exists | | | |
| 5.3.5 | Review audit_log for denied actions | Denial entries exist with reason | | | |

---

## 6. Data Sanity Checks

### 6.1 No Duplicate Active Sessions
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 6.1.1 | Query: SELECT court_id, COUNT(*) FROM sessions WHERE actual_end_at IS NULL GROUP BY court_id HAVING COUNT(*) > 1 | Zero rows returned | | | |

### 6.2 Session END Event Consistency
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 6.2.1 | Query: Sessions with actual_end_at but no END event | Zero rows (all ended sessions have END event) | | | |
| 6.2.2 | Query: Sessions with END event but no actual_end_at | Zero rows (consistency) | | | |

### 6.3 Waitlist Entry State Consistency
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 6.3.1 | Query: waitlist_entries with status='waiting' older than 24h | Review for stale entries | | | |
| 6.3.2 | Query: waitlist_entries with invalid status transitions | Zero invalid transitions | | | |

### 6.4 Block Consistency
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 6.4.1 | Active blocks display correctly on all apps | Blocks visible on Registration, Courtboard, Admin | | | |
| 6.4.2 | Expired blocks no longer enforced | Past-end-time blocks don't block registration | | | |

### 6.5 Location Token Cleanup
| Step | Action | Expected | Pass/Fail | Notes | Bug ID |
|------|--------|----------|-----------|-------|--------|
| 6.5.1 | Query: Expired, unused tokens | May exist (cleanup is deferred) | | | |
| 6.5.2 | Document: Token cleanup strategy | Note if manual cleanup needed | | | |

---

## Test Execution Log

| Date | Tester | Sections Tested | P0 Bugs | P1 Bugs | P2 Bugs | Notes |
|------|--------|-----------------|---------|---------|---------|-------|
| | | | | | | |

---

## Bug Tracking

### Priority Definitions
- **P0**: Data integrity issue, security breach, or complete feature failure. Blocks release.
- **P1**: Significant functionality broken but workaround exists. Should fix before trial.
- **P2**: Minor issue, cosmetic, or edge case. Can defer.

### Bug List

| ID | Priority | Section | Description | Status | Resolution |
|----|----------|---------|-------------|--------|------------|
| | | | | | |

---

## Release Candidate Criteria

- [ ] All P0 bugs fixed
- [ ] No open data integrity issues (Section 6 all pass)
- [ ] All security tests pass (Section 4)
- [ ] Core flows work end-to-end (Sections 1-3)
- [ ] Transactions recorded correctly (Section 5)
