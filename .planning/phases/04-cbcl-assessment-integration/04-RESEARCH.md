# Phase 4: CBCL Assessment Integration - Research Document

**Research Date:** 2026-03-09
**Phase:** 04-cbcl-assessment-integration
**Status:** Research Complete - Ready for Planning

---

## 1. Executive Summary

CBCL (Achenbach儿童行为量表) is the most widely used child behavior assessment tool globally. This phase integrates it into the system's Emotional module, providing clinical-grade assessment capabilities.

**Key Differentiators from Existing Assessments:**
- **Heterogeneous questionnaire structure**: Social competence form (custom Vue components) + 113 behavior questions (standard Likert)
- **Complex dynamic norm matching**: Gender × Age group (4-5, 6-11, 12-16) with completely different factor structures per group
- **Clinical profile visualization**: ECharts-based syndrome profile chart required

---

## 2. Technical Research: CBCL Integration Approach

### 2.1 Data Structure Analysis

Based on the documentation analysis:

**Part 1: General Information**
- Student demographics (name, gender, age, grade)
- Parent occupation details
- Respondent relationship

**Part 2: Social Competence (Non-standardized Form)**
7 sections requiring custom form components:
1. **Sports/Physical Activities** (I) - 3 questions: hobbies, time spent, skill level
2. **Hobbies** (II) - 3 questions: non-screen activities, time, proficiency
3. **Organizations** (III) - 2 questions: groups joined, activity level
4. **Chores/Social Practice** (IV) - 2 questions: tasks, quality
5. **Friendships** (V) - 2 questions: friend count, interaction frequency
6. **Peer Comparison** (VI) - 4 ratings: siblings, peers, parents, independence
7. **School Performance** (VII) - 4 questions: grades, special education, retention, problems

**Part 3: Behavior Problems (113 Questions)**
- Standard 3-point Likert scale: 0=None, 1=Sometimes, 2=Often
- Some questions have sub-items (56a-56h)
- Open-ended question 113 for additional concerns

### 2.2 Scoring Engine Complexity

**Social Competence Scoring (3 Factors):**
```typescript
// Activity Score (I-IV)
const factorActivity = scoreI + scoreII + scoreIII + scoreIV

// Social Score (V-VI)
const factorSocial = scoreV1 + scoreV2 + scoreVI_abc + scoreVI_d

// School Score (VII)
const factorSchool = scoreVII_1 + scoreVII_234
```

**Behavior Problem Scoring (8-9 Factors):**
Dynamic factor mapping based on:
- Gender: boy/girl
- Age group: 4-5, 6-11, 12-16

Example factor differences:
- **Boys 6-11**: 分裂样, 抑郁, 交往不良, 强迫性, 体诉, 社交退缩, 多动, 攻击性, 违纪 (9 factors)
- **Girls 6-11**: 体诉, 分裂样, 交往不良, 不成熟, 强迫性, 敌意性, 违纪, 攻击性, 多动 (9 factors)
- **Boys 12-16**: 焦虑强迫, 体诉, 分裂样, 抑郁退缩, 不成熟, 违纪, 攻击性, 残忍 (8 factors)

**Norm Matching:**
```typescript
type NormGroup =
  | 'boy_4_5' | 'boy_6_11' | 'boy_12_16'
  | 'girl_4_5' | 'girl_6_11' | 'girl_12_16'

interface FactorNorm {
  items: (number | string)[]  // Question IDs including sub-items like '56a'
  p69: number  // 69th percentile threshold
  p98: number  // 98th percentile threshold (clinical cutoff)
}
```

### 2.3 Two-Step Wizard Flow

```
Step 1: Social Competence Form (CBCLSocialForm.vue)
  ├── Sports & Activities
  ├── Hobbies
  ├── Organizations
  ├── Chores
  ├── Friendships
  ├── Peer Relations
  └── School Performance
         ↓
Step 2: Behavior Questions (113 items)
  ├── Standard AssessmentContainer
  ├── Pagination (10 per page) or Virtual Scroll
  └── Progress persistence
```

---

## 3. Analysis of Existing Assessment Implementations

### 3.1 ScaleDriver Pattern (from SDQ, SRS-2)

**BaseDriver.ts provides:**
- Abstract properties: `scaleCode`, `scaleName`, `version`, `ageRange`, `totalQuestions`, `dimensions`
- Abstract methods: `getQuestions()`, `getStartIndex()`, `calculateScore()`, `generateFeedback()`
- Default implementations: `getNextQuestion()`, `calculateProgress()`, `getScaleInfo()`

**SDQDriver Implementation Pattern:**
```typescript
export class SDQDriver extends BaseDriver {
  readonly scaleCode = 'sdq'
  readonly scaleName = '长处和困难问卷 (SDQ)'
  readonly totalQuestions = 25
  readonly dimensions = ['emotional', 'conduct', 'hyperactivity', 'peer', 'prosocial']

  calculateScore(answers, context): ScoreResult {
    // 1. Process reverse scoring
    // 2. Calculate dimension scores
    // 3. Compute total difficulties score
    // 4. Determine levels
  }

  generateFeedback(scoreResult): AssessmentFeedback {
    // 1. Match score to level config
    // 2. Generate dimension details
    // 3. Extract expert recommendations
    // 4. Replace placeholders
  }
}
```

**SRS2Driver adds:**
- T-score calculation (mean=50, SD=10)
- Gender-specific norm tables
- Clinical cutoff at T=60

### 3.2 AssessmentContainer.vue Flow

Current implementation supports:
1. **Welcome phase**: Driver-provided content via `getWelcomeContent()`
2. **Assessing phase**: Question-by-question with progress tracking
3. **Complete phase**: Score display and report navigation

**Key extension points for CBCL:**
- Need pre-questionnaire form (Social Competence)
- 113 questions require pagination/virtual scroll
- Progress calculation needs adjustment for large question sets

### 3.3 Report Page Patterns

**SDQ Report.vue structure:**
1. Header with student info
2. Result overview (total score + prosocial score cards)
3. Overall assessment summary
4. Dimension scores table (expandable rows)
5. Core principles section
6. Structured expert advice (IEP framework)

**SRS-2 Report.vue adds:**
- T-score visualization
- Disclaimer card (medical non-diagnostic warning)

**CBCL Report will need:**
- Social competence section (3 factors with T-scores)
- Behavior syndrome profile (8-9 factors with T-scores)
- **Clinical profile chart** (ECharts radar/bar chart)
- Broad band scales (Internalizing/Externalizing)
- Total problems score

---

## 4. Database Schema Recommendations

### 4.1 New Table: cbcl_assess

```sql
CREATE TABLE IF NOT EXISTS cbcl_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),

  -- Part 2: Social Competence (raw form data)
  social_competence_data TEXT NOT NULL,  -- JSON: { I_count, I_time, I_level, ... }

  -- Calculated social competence scores
  social_activity_score REAL,
  social_social_score REAL,
  social_school_score REAL,

  -- Part 3: Behavior Problems
  raw_answers TEXT NOT NULL,  -- JSON: { "1": 0, "2": 1, "56a": 2, ... }

  -- Calculated factor scores (dynamic based on age/gender)
  behavior_raw_scores TEXT NOT NULL,  -- JSON: { "factor_name": raw_score }
  factor_t_scores TEXT NOT NULL,      -- JSON: { "factor_name": t_score }

  -- Summary scores
  total_problems_score INTEGER NOT NULL,
  total_problems_t_score REAL,
  internalizing_t_score REAL,
  externalizing_t_score REAL,

  -- Overall level
  summary_level TEXT NOT NULL CHECK(summary_level IN ('normal', 'borderline', 'clinical')),

  -- Metadata
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (student_id) REFERENCES student(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cbcl_assess_student ON cbcl_assess(student_id);
CREATE INDEX IF NOT EXISTS idx_cbcl_assess_created ON cbcl_assess(created_at DESC);
```

### 4.2 Update report_record CHECK Constraint

```sql
-- Migration required: Add 'cbcl' to report_type CHECK constraint
-- See migrate-report-constraints.ts pattern
```

### 4.3 JSON Structure Examples

**social_competence_data:**
```json
{
  "I_count": 2,
  "I_time": 2,
  "I_level": 3,
  "II_count": 1,
  "II_time": 1,
  "II_level": 2,
  "III_count": 1,
  "III_active": 2,
  "IV_count": 2,
  "IV_quality": 3,
  "V_friends": 3,
  "V_meet": 2,
  "VI_a": 2,
  "VI_b": 3,
  "VI_c": 2,
  "VI_d": 3,
  "VII_math": 3,
  "VII_chinese": 3,
  "VII_english": 2,
  "VII_other": 3,
  "VII_isSpecial": false,
  "VII_isRetained": false,
  "VII_hasProblem": false
}
```

**behavior_raw_scores:**
```json
{
  "分裂样": 3,
  "抑郁": 8,
  "交往不良": 2,
  "强迫性": 5,
  "体诉": 1,
  "社交退缩": 4,
  "多动": 7,
  "攻击性": 12,
  "违纪": 3
}
```

---

## 5. UI/UX Patterns for Two-Step Wizard

### 5.1 Step 1: Social Competence Form

**Component:** `CBCLSocialForm.vue`

**Layout:**
```
┌─────────────────────────────────────────┐
│  CBCL 儿童行为量表 - 第一步：社会能力评估      │
├─────────────────────────────────────────┤
│  I. 体育运动                              │
│  [爱好输入] [时间选择] [水平选择]          │
├─────────────────────────────────────────┤
│  II. 课余爱好                             │
│  [爱好输入] [时间选择] [水平选择]          │
├─────────────────────────────────────────┤
│  ... (其他部分)                           │
├─────────────────────────────────────────┤
│  [保存并进入下一步]                        │
└─────────────────────────────────────────┘
```

**Design Patterns:**
- Use Element Plus `el-form` with validation
- Group sections with `el-card` or `el-collapse`
- Use `el-radio-group` for Likert-style selections
- Use `el-input` with tags for hobby/activity lists
- Progress indicator showing step 1 of 2

### 5.2 Step 2: Behavior Questions

**Options for 113-question display:**

**Option A: Pagination (Recommended)**
```typescript
// 10 questions per page = 12 pages
const pageSize = 10
const totalPages = Math.ceil(113 / pageSize)
```
- Pros: Manageable cognitive load, clear progress
- Cons: More clicks to complete

**Option B: Virtual Scroll**
- Use `vue-virtual-scroller` or native CSS scroll-snap
- Pros: Smooth experience, fast navigation
- Cons: Progress estimation harder

**Recommended: Hybrid Approach**
- Default: Pagination (10 per page)
- Optional: "Continuous Mode" toggle for power users
- Save progress after each page

### 5.3 AssessmentContainer Modifications

**New props for CBCL:**
```typescript
interface CBCLAssessmentState extends AssessmentState {
  step: 'social' | 'behavior'
  socialData?: SocialCompetenceData
}
```

**Modified flow:**
1. Welcome dialog (standard)
2. **NEW**: Social Competence Form (if step === 'social')
3. Behavior questions (if step === 'behavior')
4. Complete dialog (standard)

---

## 6. ECharts Visualization Strategy

### 6.1 Clinical Profile Chart

**Chart Type:** Horizontal Bar Chart (clinical standard)

**Data Structure:**
```typescript
interface SyndromeProfileData {
  factors: Array<{
    name: string
    rawScore: number
    tScore: number
    percentile: number
    level: 'normal' | 'borderline' | 'clinical'
  }>
  normGroup: string
}
```

**ECharts Configuration:**
```typescript
const option = {
  title: { text: 'CBCL 临床剖面图' },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'value',
    name: 'T分数',
    min: 0,
    max: 100,
    interval: 10
  },
  yAxis: {
    type: 'category',
    data: factors.map(f => f.name)
  },
  series: [{
    type: 'bar',
    data: factors.map(f => ({
      value: f.tScore,
      itemStyle: {
        color: f.tScore >= 70 ? '#f56c6c' :  // clinical
               f.tScore >= 65 ? '#e6a23c' :  // borderline
                               '#67c23a'     // normal
      }
    }))
  }],
  // Reference lines at T=65 (borderline) and T=70 (clinical)
  markLine: {
    data: [
      { xAxis: 65, label: '边缘', lineStyle: { color: '#e6a23c' } },
      { xAxis: 70, label: '临床', lineStyle: { color: '#f56c6c' } }
    ]
  }
}
```

### 6.2 Social Competence Chart

**Chart Type:** Simple bar or gauge
- Activity, Social, School scores
- Reference lines at norm thresholds

### 6.3 Component Structure

```vue
<!-- CBCLProfileChart.vue -->
<template>
  <div class="cbcl-profile-chart">
    <v-chart :option="chartOption" autoresize />
  </div>
</template>

<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, TitleComponent, MarkLineComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, TitleComponent, MarkLineComponent])

const props = defineProps<{
  factorScores: FactorScore[]
}>()

const chartOption = computed(() => ({ /* ... */ }))
</script>
```

---

## 7. Risk Assessment and Mitigation

### 7.1 Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Complex norm matching logic** | High | High | Extensive unit testing for all 6 gender/age combinations; validate against reference data |
| **T-score calculation accuracy** | High | Medium | Use validated conversion tables; cross-check with original CBCL manual |
| **Large question set performance** | Medium | Medium | Implement pagination; lazy-load questions; test with low-end devices |
| **Social form data validation** | Medium | High | Comprehensive form validation; required field checks before proceeding |
| **Report generation complexity** | Medium | Medium | Modular report components; reuse SDQ/SRS-2 patterns |

### 7.2 Clinical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Misinterpretation of scores** | High | Clear disclaimers; explicit "not a diagnosis" warnings; reference ranges clearly marked |
| **Missing 4-5 year factor norms** | Medium | Document limitation; calculate only total score for 4-5 group; add UI notice |
| **Cultural adaptation** | Low | Use 2026 digitized version with localized terminology |

### 7.3 Implementation Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Breaking existing assessment flow** | High | Maintain backward compatibility; CBCL as optional extension |
| **Database migration failures** | Medium | Test migrations on backup data; provide rollback scripts |
| **Memory usage with 113 questions** | Low | Use pagination; don't render all questions simultaneously |

---

## 8. Implementation Recommendations

### 8.1 File Structure

```
src/
├── strategies/assessment/
│   ├── CBCLDriver.ts           # Main driver with norm matching
│   └── cbcl/
│       ├── norms.ts            # All norm configurations
│       ├── questions.ts        # 113 behavior questions
│       └── scoring.ts          # T-score conversion tables
├── views/assessment/cbcl/
│   ├── SocialForm.vue          # Step 1: Social competence
│   └── Report.vue              # CBCL-specific report
├── components/charts/
│   └── CBCLProfileChart.vue    # ECharts clinical profile
├── config/
│   └── feedbackConfig.ts       # Add CBCL section (extend existing)
└── types/
    └── cbcl.ts                 # TypeScript definitions
```

### 8.2 Development Phases

**Phase 4.1: Data Infrastructure**
1. Create `cbcl-norms.ts` with all factor configurations
2. Create `cbcl-questions.ts` with 113 behavior questions
3. Design database schema migration
4. Create TypeScript type definitions

**Phase 4.2: Scoring Engine**
1. Implement `CBCLDriver.ts` extending `BaseDriver`
2. Implement social competence calculation
3. Implement behavior problem calculation with dynamic factor mapping
4. Implement T-score lookup
5. Unit test all 6 norm groups

**Phase 4.3: UI Components**
1. Create `CBCLSocialForm.vue`
2. Modify `AssessmentContainer.vue` for two-step flow
3. Implement pagination for 113 questions
4. Create progress persistence

**Phase 4.4: Report & Visualization**
1. Create `CBCLProfileChart.vue` with ECharts
2. Create `Report.vue` with social + behavior sections
3. Integrate feedback configuration
4. Add disclaimer and clinical warnings

**Phase 4.5: Integration & Testing**
1. Register driver in `strategies/assessment/index.ts`
2. Add report type to `Reports.vue`
3. End-to-end testing
4. Clinical validation (content accuracy)

### 8.3 Key Dependencies

- `echarts` + `vue-echarts`: Clinical profile visualization
- Existing: `element-plus`, `pinia`, `vue-router`, `sql.js`

### 8.4 Testing Strategy

**Unit Tests:**
- Social competence calculation for all input combinations
- Behavior factor scoring for all 6 norm groups
- T-score conversion accuracy
- Level determination (normal/borderline/clinical)

**Integration Tests:**
- Two-step wizard flow
- Data persistence between steps
- Report generation
- Database CRUD operations

**Validation Tests:**
- Compare calculated scores against reference cases
- Verify factor item mappings match CBCL manual

---

## 9. References

### Documentation Files
- `/docs/儿童行为量表（CBCL）- 2026数字化题目.md` - Complete question set
- `/docs/儿童行为量表（CBCL）自动计分引擎.js` - Scoring algorithm reference
- `/docs/儿童行为量表（CBCL）报告解释生成引擎.js` - Feedback content reference

### Code References
- `src/strategies/assessment/SDQDriver.ts` - Similar dimension-based scoring
- `src/strategies/assessment/SRS2Driver.ts` - T-score calculation pattern
- `src/views/assessment/sdq/Report.vue` - Report layout pattern
- `src/views/assessment/AssessmentContainer.vue` - Assessment flow
- `src/database/init.ts` - Database schema patterns

### External References
- Achenbach TM, Rescorla LA. Manual for the ASEBA School-Age Forms & Profiles. 2001.
- CBCL 中国常模修订版

---

## 10. Open Questions for Planning

1. **Should we support 4-5 age group?** Documentation notes limited norm data for this group.

2. **Pagination vs Virtual Scroll?** Recommendation: pagination for clarity, but could be configurable.

3. **Should social competence form be skippable?** Clinical standard is to complete both parts.

4. **Do we need PDF export in initial release?** Pattern from SDQ/SRS-2 shows placeholder; could defer.

5. **Should we store raw T-score conversion tables or formula?** Tables are more accurate but larger; formulas may have rounding errors.

---

*End of Research Document*
