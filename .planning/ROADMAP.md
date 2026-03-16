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

### Phase 2.1: SDQ Report Polish
**Goal**: Enhance the SDQ report page with expert feedback content from `feedbackConfig.js`.
**Depends on**: Phase 2
**Requirements**: MOD-01
**Status**: Completed

**Success Criteria**:
1. SDQ report displays total score content from `feedbackConfig.js`.
2. Expert advice and dimension feedback are rendered from configuration instead of hardcoded text.
3. Student placeholders and rich text formatting render correctly in the report.

### Phase 2.2: Emotional Behavior Regulation Module
**Goal**: Users can conduct structured emotional scene reasoning and caring-expression training within the Emotional module.
**Depends on**: Phase 2
**Requirements**: MOD-01, MOD-02
**Status**: Not Started

**Success Criteria**:
1. User can enter the Emotional module from the current training flow and start module-specific sessions for selected students.
2. User can complete "Emotion & Scene" training with emotion recognition, guided reasoning, and response selection.
3. User can complete "Expressing Care" training with empathy, suggestion, and action-oriented utterance practice across sender and receiver perspectives.
4. System records local session data, detailed responses, and teacher/parent-visible trend reports for the Emotional module.

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
| 1. Game Training Module Polish | 1/1 | Completed | historical backfill ✅ |
| 2. Emotional & Social Expansion | 1/1 | In Progress | SDQ cleanup ✅ |
| 2.1 SDQ Report Polish | 1/1 | Completed | feedback polish ✅ |
| 2.2 Emotional Behavior Regulation Module | 0/0 | Not Started | - |
| 3. Cognitive & Comprehensive Reporting | 0/0 | Not Started | - |
| 4. CBCL Assessment Integration | 5/5 | Completed | 04.1 ✅ 04.2 ✅ 04.3 ✅ 04.4 ✅ 04.5 ✅ |

### Phase 4 Plans Detail

| Plan | Description | Status | Commit |
|------|-------------|--------|--------|
| 04.1 | Data Infrastructure (types, questions, norms, feedback) | Completed | - |
| 04.2 | Database Schema (cbcl_assess table, API) | Completed | - |
| 04.3 | CBCL Driver (scoring engine, T-scores, feedback) | Completed | - |
| 04.4 | UI Implementation (SocialForm, Report, AssessmentContainer) | Completed | 4683803 |
| 04.5 | Gap Closure (SocialForm refactor and source alignment) | Completed | - |

## Next Steps

The normalized planning state now shows these completed workstreams:
- Phase 1 historical completion backfilled into `.planning`
- Phase 2 SDQ cleanup complete
- Phase 2.1 SDQ report polish complete
- Phase 4 CBCL assessment integration complete

Recommended next planned work:
- Phase 2.2: Emotional Behavior Regulation Module
- Phase 3: Cognitive & Comprehensive Reporting

Possible future follow-ups:
- Additional assessments (e.g., ABAS, Vineland)
- Longitudinal tracking across assessments
