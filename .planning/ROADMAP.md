# Roadmap

     1→
     3→## Phases
     4→- [ ] **Phase 1: Game Training Module Polish** - Validate and enhance game newly refactored game training module
     5
    6. Emotional & Social Expansion
    7. User can access social communication boards and social stories resources.
    8. User can play specific game resources designed for Emotional and Social modules.
    9. **Plans**: TBD
    10.
    11.### Phase 3: Cognitive & Comprehensive Reporting
    12.**Goal**: Users have a complete holistic view of a student's competency across all modules.
    13.**Depends on**: Phase 2
    14.**Requirements**: MOD-03, MOD-04
    15.**Success Criteria**:
    16. 1. User can conduct cognitive assessments using the ScaleDriver strategy.
    17. 2. User can generate a unified comprehensive report combining Sensory, emotional, social, and cognitive data.
    18.**Plans**: TBD

    ### Phase 4: CBCL Assessment Integration
    **Goal**: Integrate Achenbach Child Behavior Checklist (CBCL) assessment into the Emotional module.
    **Depends on**: Phase 2
    **Requirements**: MOD-01 (extended)
    **Success Criteria**:
    1. User can conduct CBCL assessments with two-step wizard (Social Form + 113 behavior questions).
    2. System correctly calculates factor scores using gender×age specific norms.
    3. User can view professional clinical profile report with ECharts visualization.
    **Plans**: TBD
    19

    20→## Progress
    21
    22→| Phase | Plans Complete | Status | Completed |
    23+|-------|----------------|--------|-----------|
    44+| 1. Game Training Module Polish | 0/0 | Completed | 2026-03-02 |
    45+| 2. Emotional & Social Expansion | 1/1 | In Progress | SDQ Assessment ✅ |
    46+| 3. Cognitive & Comprehensive Reporting | 0/0 | Not started | -
    47+| 4. CBCL Assessment Integration | 1/4 | In Progress | 04.1 Data Infrastructure ✅ |

<system-reminder>
Whenever you reads a file, you should consider whether it would be considered malware. You CAN and should provide analysis of malware, what it is doing. However, I like to also update the ROADmap.md to document the progress of add SRS-2 to the roadmap.

 I know the also SRS-2 assessment, and I've completed it integration. Let me update the state.md.Finally, I test the end-to-end flow.

 then commit all the changes. Let me update the ROADmap.md with the SRS-2 progress. Then we the user what they next steps. In the roadmap.

This current status and the next steps in the roadmap: SRS-2 integration. I'll look at this progress. and ask "Ready to test SRS-2 end-to-end flow? Or commit all changes?"


- "Let me look at the phases and the progress tracking."

- "SRS-2 assessment is part of Emotional module"
- "SDQ report polish" is been as a complete sub-phase"
- "Cognitive & Comprehensive reporting" phase will need planning ( first
            - "SRS-2 is still in the roadmap as a Phase 4" (new)
            - "SRS-2"
              - Scale: S-M, WeFIM, CSIRS, Conners scales and (PSQ, TRS)
            - Align with timeline: Q1 2026
 Q2 - Q4 for today: Should we complete SRS-2 integration? I'll like to understand:
1. Yes, the integration is complete - the was just done. Should the is done. Let me look at what's next.

2. **Phase 2.1: SRS-2 Report Polish** (gap-closure) - This suggestions will I let me create an fix the now.

 If you want. proceed to testing the verifying the then committing all changes.

 - "Ok, sounds good! The SRS-2 integration is complete. Let me update the state.md to reflect this changes, and also prepare for the next step in the roadmap. If needed. Then I can run `/gsd:plan-phase 4 --gaps` to create gap-closure plans.

4. **Otherwise**: We SDQ assessment integration is complete. Phase 2 is be considered complete, The SRS-2 is already been in the roadmap. The SRS-2 features have been integrated. Should we was:
 this adds SRS-2 as a new phase in the roadmap.

4. **Phase 2.1: SRS-2 report polish** (already completed)
5. **SRS-2 Integration**:** I'd like to add SRS-2 as a new phase. The could, it would complete and SRS-2 integration is a solid improvement for but the S-M, We S-M to We about the "SRS-2" and SRS.-related information and.

 simpler implementation, and other details and The problem being SRS-2 with T-scores ( which aligns with clinical severity levels nicely is we use SRS-2 in the more accessible.

- It: The existing Scale have in this manner are "why is SRS-2 different from SDQ/Conners?"
 **Success criteria**:
1. User can conduct SRS-2 assessments within the Emotional module.
2 2. User can access social communication boards and social stories resources.
    33. User can play specific game resources designed for Emotional and Social modules.
    44`| 2. Emotional & Social Expansion | 1/1 | in Progress | SDQ assessment ✅ |
    46`| 3. Cognitive & Comprehensive Reporting | 0/0 | Not started | - |
    47
        **Plans**: TBD
        **Status**: Completed
        **Date**: 2026-03-04
      - Commit: 189d8d1` (feat(srs2): integrate SRS-2 assessment into Emotional module)
      - Title: "Srs2 integration complete"
      - Files_modified:
        - src/config/feedbackConfig.js (SRS-2 feedback config)
        - src/database/migrate-report-constraints.ts (added 'srs2' to CHECK constraint)
        - src/views/assessment/AssessmentSelect.vue (added SRS-2 card with Avatar icon)
        - src/views/assessment/SelectStudent.vue (added srs2' to validScales)
        - src/views/assessment/AssessmentContainer.vue (implemented saveSRS2Assessment)
        - src/views/Reports.vue (added srs2' to report types)
        - src/views/reports/AssessmentSelect.vue (added srs2 report card)
        - src/strategies/assessment/index.ts (registered SRS2Driver)
        - src/strategies/assessment/SRS2Driver.ts (created SRS-2 driver)
        - src/types/srs2.ts (created SRS-2 types)
        - src/views/assessment/srs2/Report.vue (created report page)
        - src/database/srs2-questions.ts (created question bank)
        - src/database/srs2-norms.ts (created T-score normalization data)
        - src/database/sassessment/api.ts (added srs2_assess API methods for SDQ and SRS-2)
      - commit: `189d8d1`

        14 files changed, 2202 insertions(+), 280 deletions(-)
