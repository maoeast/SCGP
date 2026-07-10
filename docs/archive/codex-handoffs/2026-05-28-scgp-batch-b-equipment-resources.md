# SCGP Batch B Equipment And Resources Handoff

**Project / Ticket:** SCGP - physical equipment resources, entry-code migration, and resource-center alignment
**Date of Handoff:** 2026-05-28
**Previous Session Context:** Older SCGP threads around `80 emotion_scene + 60 care_scene`, physical equipment import, training-entry refactor, and equipment/resource-center cleanup
**Handoff Author:** Codex

## Executive Summary

This batch covers the long-running resource and equipment transition where SCGP moved toward a unified `sys_training_resource` model, imported physical-equipment resources across multiple categories, and introduced `entry_code` into training/equipment record flows. These threads are more structurally important than pure UI work because they touch persistent data, routing, quick entry, resource filtering, and training-record semantics.

Unlike Batch E, this batch should only be archived after its current-state summary is captured clearly, because future debugging may still need to understand why `moduleCode`, `trainingEntryCode`, `entry_code`, and `resourceCode` were separated the way they were.

## Key Decisions & Rationale

- Decision: Keep top-level authorization on real `moduleCode`, while using finer-grained entry logic inside training/equipment flows.
  - Rationale: The user explicitly required top-level licensing stability while allowing finer internal entry grouping.

- Decision: Use stable `resourceCode` for physical equipment instead of legacy naming patterns.
  - Rationale: The user explicitly clarified that physical equipment assets should not continue the older fragile naming strategy.

- Decision: Push equipment/training records toward `entry_code` awareness rather than staying module-only.
  - Rationale: The system needed to distinguish internal entry groups like emotional regulation, social communication, fine motor, soothing aids, and life skills more precisely.

## Current Codebase State

- `src/database/init.ts`
  - Emotional seed and schema evolution logic were touched in this workstream.
- `src/database/emotional-resource-data.ts`
  - Current emotional resource seed state matters here.
- `scripts/replace-emotional-scenes.mjs`
  - One-time emotional scene replacement utility.
- `scripts/refresh-emotion-scene-labels.mjs`
  - Label/title refresh utility.
- `scripts/reset-sensory-equipment-resources.cjs`
  - Sensory equipment reset/migration script.
- `src/components/resources/ResourceSelector.vue`
  - Important consumer of entry- and category-related filtering.
- `src/views/equipment/QuickEntry.vue`
  - Important for category/sourceCategory filtering behavior.
- `src/views/equipment/Records.vue`
  - Part of the `entry_code` migration path.
- `docs/references/physical-equipment/`
  - Source CSV/templates for physical equipment import and taxonomy.

## What Has Been Completed

- [x] Emotional demo seed was replaced with a fuller emotional resource base in local/dev workflows.
- [x] Physical equipment import conventions were clarified, including source file placement and runtime image placement.
- [x] `resourceCode` became the preferred stable identifier for new physical equipment resources.
- [x] `entry_code` was introduced into at least part of the training/equipment record path.
- [x] The user repeatedly clarified that internal entry groups should not be confused with top-level module licensing.

## Open Questions & Next Steps (Prioritized)

1. **High** — If this area resumes, verify the current live code for `entry_code` and `sourceCategory` behavior before trusting old chat decisions.
2. **High** — Confirm whether any remaining record/detail flow still assumes module-only semantics.
3. **Medium** — Re-check Quick Entry and Resource Selector filters against actual imported CSV-derived metadata.
4. **Medium** — Keep current game-resource coverage claims conservative; not all 6 groups were fully delivered as game content.

## Constraints & Preferences (Very Important)

- Do not collapse internal training entry grouping back into blunt module-only UI logic.
- Do not represent target-state 6-group game coverage as already fully delivered.
- Keep physical equipment and software game resources conceptually separate.
- Use repo code and current DB reality as the source of truth, not planning aspiration.

## Reactivation Prompt (Copy-Paste Ready)

```text
We are continuing SCGP equipment/resources work from older Codex sessions.

Read these first:
- E:\VSC\H5\SIC-ADS\AGENTS.md
- E:\VSC\H5\SIC-ADS\.continue-here.md
- E:\VSC\H5\SIC-ADS\docs\codex-handoffs\2026-05-28-scgp-batch-b-equipment-resources.md

Then inspect the current code directly, especially:
- `src/components/resources/ResourceSelector.vue`
- `src/views/equipment/QuickEntry.vue`
- `src/views/equipment/Records.vue`
- `src/database/init.ts`

Do not assume old target-state descriptions still match the code. Start by confirming the current `entry_code` and physical-equipment filtering reality.
```

## Archive Safety Note

This batch is archivable after this handoff exists, but it remains a higher-value future-debug target than simple UI polish threads.
