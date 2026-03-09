# Roadmap

## Phases

### Phase 1: Game Training Module Polish
**Goal**: Validate and enhance game newly refactored game training module
**Status**: Completed

### Phase 2: Emotional & Social Expansion
**Goal**: User can access social communication boards and social stories resources.
**Status**: In Progress
**Requirements**: MOD-01, MOD-02

**Success Criteria**:
1. User can play specific game resources designed for Emotional and Social modules.
2. User can conduct SDQ assessments for emotional/behavioral screening.
3. User can conduct SRS-2 assessments for social responsiveness.
4. User can conduct CBCL assessments for comprehensive behavior evaluation.

### Phase 3: Cognitive & Comprehensive Reporting
**Goal**: Users have a complete holistic view of a student's competency across all modules.
**Depends on**: Phase 2
**Requirements**: MOD-03, MOD-04
**Status**: Not Started

**Success Criteria**:
1. User can conduct cognitive assessments using the ScaleDriver strategy.
2. User can generate a unified comprehensive report combining Sensory, emotional, social, and cognitive data.

### Phase 4: CBCL Assessment Integration
**Goal**: Integrate Achenbach Child Behavior Checklist (CBCL) assessment into the Emotional module.
**Depends on**: Phase 2
**Requirements**: MOD-01 (extended)
**Status**: Completed

**Success Criteria**:
1. User can conduct CBCL assessments with two-step wizard (Social Form + 113 behavior questions).
2. System correctly calculates factor scores using gender×age specific norms.
3. User can view professional clinical profile report with ECharts visualization.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Game Training Module Polish | 0/0 | Completed | 2026-03-02 |
| 2. Emotional & Social Expansion | 3/3 | Completed | SDQ ✅ SRS-2 ✅ CBCL ✅ |
| 3. Cognitive & Comprehensive Reporting | 0/0 | Not Started | - |
| 4. CBCL Assessment Integration | 4/4 | Completed | 04.1 ✅ 04.2 ✅ 04.3 ✅ 04.4 ✅ |

### Phase 4 Plans Detail

| Plan | Description | Status | Commit |
|------|-------------|--------|--------|
| 04.1 | Data Infrastructure (types, questions, norms, feedback) | Completed | - |
| 04.2 | Database Schema (cbcl_assess table, API) | Completed | - |
| 04.3 | CBCL Driver (scoring engine, T-scores, feedback) | Completed | - |
| 04.4 | UI Implementation (SocialForm, Report, AssessmentContainer) | Completed | 4683803 |

## Next Steps

Phase 4 (CBCL Assessment Integration) is now complete. The system supports:
- CBCL assessment with two-step wizard (Social Form + 113 behavior questions)
- Clinical profile report with ECharts visualization
- Integration with report center

Consider for future development:
- Phase 3: Cognitive & Comprehensive Reporting
- Additional assessments (e.g., ABAS, Vineland)
- Longitudinal tracking across assessments
