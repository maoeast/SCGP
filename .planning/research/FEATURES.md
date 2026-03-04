# Feature Landscape

**Domain:** Special Education Competency Development (SCGP)
**Researched:** Current Date

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Assessment Scales (S-M, WeeFIM, CSIRS, Conners PSQ/TRS) | Baseline capability for diagnosing and tracking child development. | High | Already implemented via `ScaleDriver` architecture. |
| IEP Generation | Translates raw scores into actionable Individualized Education Programs. | High | Already implemented using a Strategy pattern per module. |
| Resource Management | Managing assets (images, equipment, documents, videos). | Med | Centralized via `ResourceManager` and `ResourceCenter`. |
| Training Records & Class Management | Tracking daily usage per student and managing batches of students. | Med | Recently refactored to support mixed snapshots. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Local-First Offline Mode | Clinics/schools often have poor internet or strict data privacy needs. Runs entirely offline. | High | Relies on Electron + `sql.js` in-browser SQLite. |
| Integrated Game Training | Direct intervention tools built-in (Color match, Rhythm, etc.). | High | Refactored in Phase 5.2 as unified resources (`sys_training_resource`). |
| In-App Auto-Updates | Painless deployment of new scales and features to distributed machines. | Med | Uses `electron-updater` via GitHub releases. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Cloud/SaaS Central Database | Strict educational data privacy regulations; breaks local-first principle. | Local SQLite with robust backup/export functionality. |
| Native Node Addons (`node-gyp`) | Causes cross-platform compilation nightmares in Electron. | Pure JS alternatives (`sql.js`, `browser-image-compression`). |

## Feature Dependencies

```text
Class Management → Student Profiles
Assessment Scales → IEP Generation
Training Resources → Game Training & Equipment Training
```

## MVP Recommendation

Prioritize (Next Steps based on current phase):
1. **Game Training Validation:** E2E validation of the Phase 5.2 refactoring.
2. **Game Resource Migration:** Ensure smooth transitioning of legacy tasks to the new resource schema.
3. **Module Expansion:** Prepare the registry for Emotional and Social modules.

Defer: 
- Visual Tracking Games: Require controlled physical environment testing; keep paused.

## Sources

- `PROJECT_CONTEXT.md`
- `docs/plans/2025-02-05-refactor-implementation-plan.md`