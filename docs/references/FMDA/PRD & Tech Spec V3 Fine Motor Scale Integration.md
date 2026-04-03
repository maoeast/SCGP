 PRD & Tech Spec V3: Fine Motor Scale Integration
Context: This project is an EXISTING application that already supports multiple assessment scales (e.g., S-M, SRS-2, CBCL).
Goal: Integrate a new scale, "Preschool Fine Motor Assessment (学前儿童精细动作评估)", by REUSING existing database schemas, UI components, and routing, applying the Strategy Pattern for scale-specific logic.
1. Database Extension Strategy (SQLite)
Do NOT create entirely new tables for this scale. Instead, extend or utilize the existing tables:
items (题库表): Must support a scale_type field (e.g., 'fine_motor'). Needs to store domain info, age requirements (age_min_months), and specific metadata (iep_goal, expert_advice).
assessments (评估主表): Must track which scale is being used (scale_type = 'fine_motor').
assessment_records (打分记录表): CRITICAL ADDITION: Ensure this table has an is_auto_filled (INTEGER 0 or 1) field. This is mandatory for the Basal/Ceiling algorithm to differentiate between a manual '0' and a system-skipped '0'.
2. Core Engine: Strategy Pattern Implementation
Create an isolated strategy class/composable: FineMotorEngine.ts. It must not interfere with CBCL or S-M logic.
A. Basal & Ceiling Algorithm (During Testing)
Rule: Executes independently within each domain based on age sorting.
Basal (起点): 3 consecutive 2s. Action: Auto-fill all easier items in this domain with score = 2 and is_auto_filled = 1.
Ceiling (上限): 3 consecutive 0s. Action: Auto-fill all harder items in this domain with score = 0 and is_auto_filled = 1. Stop testing this domain.
B. Scoring Logic (Post-Testing)
Formula: Mastery Rate = Total Raw Score / (Valid Items Count * 2)
Thresholds:
>= 0.80 -> Status: age_appropriate
0.40 - 0.79 -> Status: emerging
< 0.40 -> Status: delayed
C. IEP Goal Extraction
Priority 1: Extract items where score == 1.
Priority 2: Extract items where score == 0 AND is_auto_filled == 0.
Strict Exclusion: NEVER extract items where score == 0 AND is_auto_filled == 1.
3. UI/UX Reuse Strategy (Vue 3)
Do NOT create a separate FineMotorAssessmentView.vue unless absolutely necessary.
Assessment View: Modify the existing assessment component. Use v-if="scale_type === 'fine_motor'" to render the specific 3-tier buttons: [2分 掌握], [1分 部分], [0分 未掌握]. Hook these buttons to the FineMotorEngine to trigger Basal/Ceiling auto-routing.
Report View: Modify the existing report component. If scale_type === 'fine_motor', dynamically render the Domain Mastery Rates, fetch the text from ReportConfig based on the status, and render the extracted IEP Goals list at the bottom.