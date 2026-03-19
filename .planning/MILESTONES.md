# Milestones

## v1.5 Strict Modular Licensing (Shipped: 2026-03-19)

**Phases completed:** 2 phases, 2 plans, 8 requirements

**Key accomplishments:**
- Strict modular licensing core now requires `am` in the signed payload, persists allowed modules locally, and exposes entitlement checks plus DEV-only mock authorization.
- Router, sidebar, dashboard, and direct-launch entry points now enforce module authorization while keeping unauthorized modules visible as locked commercial surfaces.
- Development can now proceed with `sensory + emotional` unlocked in DEV without leaking the bypass into production activation logic.

---

## v1.4 Dashboard Special Ed Command Center (Shipped: 2026-03-19)

**Phases completed:** 1 phase, 1 plan, 8 requirements

**Key accomplishments:**
- Dashboard now acts as a real special-ed command center with SQL-backed metrics, intervention alerts, and direct schedule launch into training runtime.
- Today's Schedule is driven by real active plans instead of placeholder homepage content.
- Weekly anomaly and overdue-assessment reminders are aggregated from real local training and assessment tables.
- Teachers can now jump from schedule directly into the concrete training runtime without repeating student/module selection.

---

## v1.3 Unified Assessment Word Export (Shipped: 2026-03-18)

**Phases completed:** 1 phase, 1 plan, 7 requirements

**Key accomplishments:**
- Added a universal payload-based `docx` renderer for assessment reports.
- Added payload builders covering SDQ, CBCL, SRS2, CSIRS, Conners PSQ/TRS, S-M, and WeeFIM.
- Migrated all targeted assessment report pages to the new Word export flow.
- Removed obsolete PDF / print export entry points from those report pages.
- Standardized assessment report export on editable `.docx` output without adding new dependencies.

---

## v1.2 Emotional Resource Pack Import & Export (Shipped: 2026-03-18)

**Phases completed:** 1 phase, 1 plan, 9 requirements

**Key accomplishments:**
- Resource Center emotional management now supports batch import/export without leaving the existing training-resource workflow.
- Emotional resources can be exchanged as versioned JSON packs while preserving base fields, tags, and normalized typed metadata.
- Emotional resources can also be exported/imported as relational Excel workbooks with a downloadable template for offline authoring and review.
- Import preview blocks invalid rows and supports `skip`, `update existing`, and `import as copy` duplicate strategies based on `resourceType + sceneCode`.
- Imported resources stay compatible with existing emotional editors, scene selectors, and training runtime because persistence remains on `sys_training_resource.meta_data`.

---

## v1.1 Emotional Authoring & Scene Gallery (Shipped: 2026-03-17)

**Phases completed:** 3 phases, 3 plans, 8 requirements

**Key accomplishments:**
- Emotional resources in Resource Center now use visual editors instead of raw JSON textareas.
- Emotional editor contracts normalize and validate scene metadata before persistence.
- Teachers now select concrete emotional scenes from a gallery before entering training runtime.
- Emotional training runtime now honors explicit `resourceId` launch flow and reports missing requested resources instead of silently falling back.
- Future demand for emotional resource pack import/export was captured in backlog without expanding v1.1 scope.

---

## v1.0 Emotional MVP (Shipped: 2026-03-17)

**Phases completed:** 5 phases, 9 plans, 9 tasks

**Key accomplishments:**
- Game training mainline was validated against the resource-backed architecture and preserved module-aware launch / record flows.
- SDQ report flow was stabilized and polished with config-driven expert feedback.
- CBCL assessment was integrated into the generalized `ScaleDriver` runtime with dedicated reporting.
- Emotional module MVP shipped with two structured training experiences: 情绪与场景 and 表达关心.
- Emotional training records and module reports are now persisted locally and visible through dedicated emotional pages.

---
