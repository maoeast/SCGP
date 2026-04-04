---
phase: 17
slug: cnbs-r2016-question-bank-standardization-foundation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-04
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for CNBS-R2016 data-foundation work.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node verifier scripts + npm run type-check + npm run build:web` |
| **Config file** | `none — verifier scripts are phase-local` |
| **Quick run command** | `node scripts/verify-cnbsr2016-item-bank.mjs && node scripts/verify-cnbsr2016-feedback.mjs` |
| **Full suite command** | `npm run type-check && npm run build:web` |
| **Estimated runtime** | ~30-180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/verify-cnbsr2016-item-bank.mjs && node scripts/verify-cnbsr2016-feedback.mjs`
- **After every plan wave:** Run `npm run type-check && npm run build:web`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | BANK-01, BANK-03 | — | N/A | structure | `node scripts/verify-cnbsr2016-item-bank.mjs` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | BANK-01, BANK-03 | — | N/A | data integrity | `node scripts/verify-cnbsr2016-item-bank.mjs && npm run type-check` | ❌ W0 | ⬜ pending |
| 17-01-03 | 01 | 1 | BANK-02 | — | N/A | config integrity | `node scripts/verify-cnbsr2016-feedback.mjs && npm run type-check && npm run build:web` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-cnbsr2016-item-bank.mjs` — asserts total items, domain codes, month-group set, and score-weight distribution
- [ ] `scripts/verify-cnbsr2016-feedback.mjs` — asserts `src/config/cnbsr2016-thresholds.ts` and `src/config/CNBSR2016FeedbackConfig.js` stay aligned on official DQ thresholds, age-bracket keys, and domain feedback coverage

*Existing repo infrastructure already covers type-check and build verification once the phase-local verifier scripts exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Digitized item wording for representative anchors matches the official PDF | BANK-01, BANK-03 | PDF table extraction can silently distort row grouping or wording | Manually compare sampled groups from `1月龄`, `12月龄`, `36月龄`, and `72月龄` in the PDF against the generated `src/database/cnbsr2016-questions.ts` entries |
| Corrected DQ thresholds match the official PDF wording rather than old draft thresholds | BANK-02 | Config prose may retain stale labels even when numeric ranges are corrected | Compare the app-facing CNBS-R2016 config entry against PDF Section 5 and verify `>130 / 110-129 / 80-109 / 70-79 / <70` is used consistently |

---

## Validation Sign-Off

- [x] All tasks have automated verification coverage or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 identifies the missing verifier artifacts explicitly
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
