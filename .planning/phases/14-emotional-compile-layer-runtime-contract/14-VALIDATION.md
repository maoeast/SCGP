---
phase: 14
slug: emotional-compile-layer-runtime-contract
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vue-tsc + targeted compile/runtime parity checks |
| **Config file** | `tsconfig.emotional.json`, root `tsconfig.json` |
| **Quick run command** | `npm run type-check:emotional` |
| **Full suite command** | `npm run type-check` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run type-check:emotional`
- **After every plan wave:** Run `npm run type-check`
- **Before `$gsd-verify-work`:** Full suite must be green or documented as blocked by pre-existing repository debt
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | CMPL-01 | type-check | `npm run type-check:emotional` | ✅ | ⬜ pending |
| 14-01-02 | 01 | 1 | CMPL-02 | type-check | `npm run type-check:emotional` | ✅ | ⬜ pending |
| 14-01-03 | 01 | 1 | CMPL-03 | type-check + parity review | `npm run type-check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `emotion_scene` compiled step order and intro metadata match current page needs | CMPL-01 | Compile contract parity depends on current UI expectations, not only types | Compare compiled output against current `buildSessionConfig()` shape in `EmotionSceneTraining.vue` |
| `care_scene` compiled step order and care metadata match current page needs | CMPL-02 | Current page derives card/detail copy from raw meta and must remain behaviorally equivalent | Compare compiled output against current `buildSessionConfig()` shape in `CareExpressionTraining.vue` |
| Correct / acceptable value mapping and normalized option metadata preserve current semantics | CMPL-03 | Type-check cannot prove business-equivalent answer classification | Verify `correctValues`, `acceptableValues`, and metadata fields against both page-local compilers |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
