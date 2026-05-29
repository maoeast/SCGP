# SCGP Batch D Entitlements Handoff

**Project / Ticket:** SCGP - entitlement / licensing refactor
**Date of Handoff:** 2026-05-28
**Previous Session Context:** Older SCGP threads around modular licensing, entitlement shadow mapping, entry gating, resource-center integration, and license-generator alignment
**Handoff Author:** Codex

## Executive Summary

This batch captures the transition from older module-based licensing assumptions toward a more explicit entitlement model. The core architectural win was separating storage/business grouping (`moduleCode`) from commercial access control (`EntitlementCode` / effective entitlements), while keeping backward compatibility for old activation payloads.

This is the highest-risk archive batch among the old SCGP threads because it touches activation behavior, route/menu/resource visibility, generator tooling, and compatibility guarantees for existing customers.

## Key Decisions & Rationale

- Decision: Keep `moduleCode` as data ownership, and introduce entitlement-based access as a separate layer.
  - Rationale: The user and later architectural review both emphasized that storage grouping and sellable access units must not remain the same concept.

- Decision: Implement a "shadow mapping" phase first.
  - Rationale: Old activation payloads needed safe upward compatibility before UI or generator behavior could be changed.

- Decision: Default-deny unknown entitlement codes.
  - Rationale: This was explicitly called out as a safety requirement during review.

## Current Codebase State

- `src/features/entitlements/entitlement-catalog.ts`
  - Core source of truth for entitlement definitions and compatibility mapping.
- `src/stores/auth.ts`
  - Effective entitlement resolution and access checks.
- `src/utils/training-entry.ts`
  - Entry definitions with data/permission separation.
- `src/utils/equipment-training-entry.ts`
  - Related entry logic for equipment paths.
- `src/features/assessment/assessment-scale-catalog.ts`
  - Assessment-side access semantics were part of the later migration.
- Resource center integration layer
  - Access-controlled resource visibility was part of the later closure work.
- `license-generator-dist/*`
  - Generator-side terminology and payload alignment also became part of this batch.

## What Has Been Completed

- [x] A shadow mapping approach was explicitly adopted.
- [x] Legacy code expansion rules were defined for compatibility.
- [x] The design direction moved toward entitlement-first access checks instead of module-only gating.
- [x] Training-entry definitions were reviewed through the lens of data/access decoupling.
- [x] Resource center integration into entitlement-aware visibility was recognized as part of the main closure path.

## Open Questions & Next Steps (Prioritized)

1. **High** — If this area resumes, inspect the current entitlement catalog and auth store first; do not trust archived reasoning over live code.
2. **High** — Confirm whether all remaining user-facing copy and generator tooling fully match the new entitlement terminology.
3. **Medium** — Verify whether any old access checks still read raw module assumptions in routes, menus, or reports.
4. **Medium** — Keep backward compatibility guarantees explicit when touching generator or activation parsing code.

## Constraints & Preferences (Very Important)

- Unknown codes must remain default-deny.
- Do not merge data ownership and commercial authorization back into one concept.
- Backward compatibility for old activation payloads is a hard requirement.
- This batch should be archived only after continuity is preserved clearly, because it remains a likely future maintenance hotspot.

## Reactivation Prompt (Copy-Paste Ready)

```text
We are continuing SCGP entitlement/licensing work from older Codex sessions.

Read these first:
- E:\VSC\H5\SIC-ADS\docs\planning\2026-05-20-entitlement-module-refactor-review-proposal.md
- E:\VSC\H5\SIC-ADS\docs\planning\2026-05-20-entitlement-phase1-shadow-mapping-implementation-plan.md
- E:\VSC\H5\SIC-ADS\docs\codex-handoffs\2026-05-28-scgp-batch-d-entitlements.md

Then inspect the live code:
- `src/features/entitlements/entitlement-catalog.ts`
- `src/stores/auth.ts`
- `src/utils/training-entry.ts`
- `src/features/assessment/assessment-scale-catalog.ts`

Start by confirming whether the current repo still has any major module-based access assumptions left in active user-facing paths.
```

## Archive Safety Note

This batch is the most important to preserve well before archiving. The handoff now exists, but future archive execution should still treat it as a later-phase cleanup target, after lower-risk batches are handled.
