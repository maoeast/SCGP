# AIimages Self-Care Storyboards Handoff

**Project / Ticket:** AIimages - special-needs self-care storyboard generation
**Date of Handoff:** 2026-05-28
**Previous Session Context:** Large May 2026 Codex sessions under `G:\SCGP_Rec\AIimages`
**Handoff Author:** Codex

## Executive Summary

This workstream focused on generating special-education-friendly life self-care visual materials with `apimart-imagegen`, moving away from unstable single-step image generation toward storyboard-style multi-panel assets. The key shift was from many independent images to one continuous multi-panel "mother image" per skill, plus optional post-cropping into single teaching cards.

The largest sessions in active Codex state for this project are from `2026-05-11` to `2026-05-14`, and they mostly document prompt iteration, model choice, failure analysis, and batch generation for Montessori-style self-care materials. These sessions are good archive candidates only after this handoff exists.

## Key Decisions & Rationale

- Decision: Prefer "single skill -> one multi-panel storyboard mother image" over "one step -> one independent generated image".
  - Rationale: The user identified four repeated failure classes in single-image generation: action topology errors, scene continuity loss, prop identity drift, and hand/body distortion.
  - Tradeoffs considered: Multi-panel images improve continuity and consistency, but some fine motor actions still need close-up variants.

- Decision: For high-risk fine-motor tasks, use storyboard mother image plus optional close-up detail images.
  - Rationale: Shoelaces, buttons, zippers, and clothing opening directions were especially unstable in full-body or distant single images.
  - Tradeoffs considered: Full continuity alone was not enough; detail framing mattered.

- Decision: Freeze character, outfit, room, camera angle, and props as explicit prompt constraints.
  - Rationale: The user explicitly called out disappearing chairs, changing tools, and drifting object identity.
  - Tradeoffs considered: Without fixed-setting prompts, model output quality dropped sharply even when style was acceptable.

## Current Codebase State

- `G:\SCGP_Rec\AIimages\run_life_selfcare_images.py`: Batch generation helper for self-care image workflows.
- `G:\SCGP_Rec\AIimages\test_run_life_selfcare_images.py`: Tests around model selection and batch helper behavior.
- `G:\SCGP_Rec\AIimages\montessori-self-care-steps.md`: Main domain source for self-care training prompt structure.
- `G:\SCGP_Rec\AIimages\selfcare-next-steps-outline.md`: Expanded planning document for the next themed self-care batches and recommended rendering style per topic.
- `G:\SCGP_Rec\AIimages\storyboard-schemeB-pilot.batch.json`: Pilot batch for storyboard-style mother images.
- `G:\SCGP_Rec\AIimages\selfcare-shoes-8grid-v1.batch.json`: Reworked "magic-strap shoes" 8-step poster-style prompt.
- `G:\SCGP_Rec\AIimages\selfcare-wave1-actions.batch.json`: Prepared action-oriented batch set.
- `G:\SCGP_Rec\AIimages\selfcare-wave2-diagrams.batch.json`: Prepared diagram-oriented batch set including fold shirt, tie laces, and button workflows.
- `G:\SCGP_Rec\AIimages\selfcare-wave3-homecare.batch.json`: Prepared household/practical-life batch set.
- `G:\SCGP_Rec\AIimages\AIimages\batch-summary-20260512-135747.json`: Example successful pilot summary for storyboard batch generation.
- `G:\SCGP_Rec\AIimages\AIimages\batch-summary-20260514-095101.json`: Example successful regenerated shoes storyboard summary.

## Environment & Commands

- Main working directory: `G:\SCGP_Rec\AIimages`
- Generation helper:
  - `python C:\Users\maoea\.codex\skills\apimart-imagegen\scripts\apimart_imagegen.py --cwd G:\SCGP_Rec\AIimages ...`
- Local batch runner:
  - `python .\run_life_selfcare_images.py`
- Tests:
  - `python -m unittest test_run_life_selfcare_images.py`

## What Has Been Completed

- [x] Failure modes of single-step generation were analyzed and made explicit.
- [x] Workflow recommendation shifted to storyboard mother images plus optional local crops.
- [x] Pilot storyboard batch generated successfully for at least these topics:
  - `12` undress shirt
  - `13` put on pants
  - `14` take off pants
  - `17` tie shoelaces close-up
  - `26` sweeping
- [x] Reworked "wear magic-strap shoes" into a poster-style 8-step mother image.
- [x] Split next-stage batch preparation into three thematic waves:
  - action-focused
  - diagram-focused
  - homecare/practical-life

## Open Questions & Next Steps (Prioritized)

1. **High** — Review existing generated storyboard mother images and score which ones are production-usable versus needing prompt revision.
2. **High** — Decide whether to standardize one cropping/post-layout pipeline for all mother images, or keep some topics as poster-only assets.
3. **High** — For buttons, shoelaces, and similar fine-motor tasks, decide whether to add explicit close-up-only variants beyond the current mother images.
4. **Medium** — Normalize batch naming and output naming so storyboards and derived single cards are easier to trace.
5. **Medium** — Decide whether to capture a reusable "fixed setting table" format as a project-standard prompt template.

## Constraints & Preferences (Very Important)

- Do not revert to the old "one step = one independent image" default workflow.
- For special-needs teaching materials, physical correctness and continuity matter more than decorative style.
- Avoid putting text, numbers, labels, or watermarks into generated images; those should be overlaid later if needed.
- For close motor tasks, do not rely on distant full-body framing.

## Reactivation Prompt (Copy-Paste Ready)

```text
We are continuing work from a previous Codex session.

Read the handoff document at:
E:\VSC\H5\SIC-ADS\docs\codex-handoffs\2026-05-28-aiimages-selfcare-storyboards.md

1. First, inspect the current state of `G:\SCGP_Rec\AIimages`.
2. Read the handoff document completely.
3. Verify which storyboard mother images and batch files still exist.
4. Continue from the "Open Questions & Next Steps" section.
5. Do not assume the old giant chat context is available.

Start by confirming the current state and identifying the next highest-value image set to review or revise.
```

## Additional Notes for Future You

- The oversized active Codex sessions tied to this work are primarily prompt iteration and generation history, not source-code-heavy engineering threads.
- They are strong archive candidates after maintenance because the operational knowledge is now condensed here.
