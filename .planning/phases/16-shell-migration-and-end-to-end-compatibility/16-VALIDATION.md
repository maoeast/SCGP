---
phase: 16
slug: shell-migration-and-end-to-end-compatibility
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-24
---

# Phase 16 - Validation Strategy

> Per-phase validation contract for shell deduplication and compatibility closure.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vue-tsc` focused type-check + production build + database-backed Node verifier |
| **Config file** | `tsconfig.emotional.json` |
| **Quick run command** | `npm run type-check:emotional` |
| **Build command** | `npm run build:web` |
| **Compatibility command** | `node scripts/verify-emotional-engine-compat.mjs --db "C:/Users/maoea/AppData/Roaming/scgp/database.sqlite"` |
| **Estimated runtime** | ~30-180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run type-check:emotional`
- **After shell/persistence changes:** Run `node scripts/verify-emotional-engine-compat.mjs --db "C:/Users/maoea/AppData/Roaming/scgp/database.sqlite"`
- **After the final task:** Run `npm run build:web`
- **Before `$gsd-verify-work`:** Keep Phase 15 manual UI parity items and Phase 16 compatibility script results together
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | COMP-01, COMP-02 | type-check | `npm run type-check:emotional` | YES | pending |
| 16-01-02 | 01 | 1 | COMP-03 | type-check + DB verifier | `node scripts/verify-emotional-engine-compat.mjs --db "C:/Users/maoea/AppData/Roaming/scgp/database.sqlite"` | NO - to be added in phase | pending |
| 16-01-03 | 01 | 2 | COMP-02, COMP-03, COMP-04 | build + DB verifier + manual regression | `npm run build:web` and `node scripts/verify-emotional-engine-compat.mjs --db "C:/Users/maoea/AppData/Roaming/scgp/database.sqlite"` | NO - to be added in phase | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] Existing `npm run type-check:emotional` coverage still includes the emotional runtime shell and engine files
- [x] Existing `npm run build:web` covers production compilation after shell extraction
- [ ] Add `scripts/verify-emotional-engine-compat.mjs` for repeatable DB-backed compatibility checks
- [ ] Re-run the remaining manual UI checks carried from Phase 15 after Phase 16 changes land

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Emotion-scene still auto-advances after a valid answer with the same perceived pacing | COMP-02, COMP-04 | Timing parity is UX-sensitive | Run one `emotion_scene` correct path and one wrong-first path, confirm feedback still appears before timed advance |
| Care-scene still pauses on effect/reason reveal cards before continue/complete | COMP-02, COMP-04 | Intermediate reveal state is renderer/UI dependent | Run one `care_scene`, confirm utterance effect card and receiver reason card still appear before the next action |
| Selector entry UX still feels stable after the 2026-03-25 filter refactor | COMP-02 | Selector behavior now includes summary chips, quick presets, and an advanced-filter drawer | Open both selector routes, verify preset counts are reasonable, chip removal updates the grid, and `emotion_scene` uses age/domain/theme while `care_scene` uses age/receiverEmotion/careType |
| Route leave still persists partial sessions only when attempts exist | COMP-02, COMP-03 | Requires actual navigation in the running app | Start either submodule, answer one step, navigate away, confirm cancellation persists and no summary page is shown |
| `/emotional/session-summary` still opens with persisted IDs after completion | COMP-02, COMP-04 | End-to-end route result cannot be proven by DB queries alone | Complete one run in each submodule and confirm the summary page opens and report navigation still works |

---

## Validation Sign-Off

- [x] All tasks have automated or manual verification coverage
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 missing verifier script is implemented during execution
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
