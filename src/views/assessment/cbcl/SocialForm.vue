<template>
  <div class="cbcl-social-form">
    <el-card class="form-header">
      <template #header>
        <div class="header-content">
          <h2>CBCL 儿童行为量表 - 第一步：社会能力评估</h2>
          <el-steps :active="0" finish-status="success" simple>
            <el-step title="社会能力" />
            <el-step title="行为问题" />
            <el-step title="查看报告" />
          </el-steps>
        </div>
      </template>
      <p class="intro-text">
        请先完成以下关于孩子社会能力的问题，然后进入行为问题评估。
        <br />
        <span class="student-name" v-if="student">当前学生：{{ student.name }}（{{ studentAgeLabel }}）</span>
      </p>
    </el-card>

    <el-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      label-position="top"
      class="social-form"
    >
      <!-- Part 1: General Information -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">第一部分：一般信息</span>
        </template>

        <!-- Reporter -->
        <el-form-item label="填表者" prop="reporter">
          <el-radio-group v-model="form.reporter">
            <el-radio label="father">父</el-radio>
            <el-radio label="mother">母</el-radio>
            <el-radio label="other">其他人</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- Other Relation (conditional) -->
        <el-form-item
          v-if="form.reporter === 'other'"
          label="与儿童关系"
          prop="other_relation"
        >
          <el-input
            v-model="form.other_relation"
            placeholder="请说明与儿童的关系"
            maxlength="50"
          />
        </el-form-item>

        <!-- Father Occupation -->
        <el-form-item label="父亲职业" prop="father_occupation">
          <el-input
            v-model="form.father_occupation"
            placeholder="请填写父亲职业"
            maxlength="100"
          />
          <div class="input-hint">
            请尽量填写具体职业，例如：快递/外卖员、网约车司机、建筑/工厂技工、保安、餐饮服务员、个体店主、销售经理、软件工程师、教师、医生、公务员/事业单位编制、企业高管、自由职业、全职爸爸、待业等
          </div>
        </el-form-item>

        <!-- Mother Occupation -->
        <el-form-item label="母亲职业" prop="mother_occupation">
          <el-input
            v-model="form.mother_occupation"
            placeholder="请填写母亲职业"
            maxlength="100"
          />
          <div class="input-hint">
            请尽量填写具体职业，例如：全职妈妈、保洁员、超市/商场导购、美容美发师、个体店主、电商主播/自媒体、出纳/会计、护士/医生、教师、企业职员/HR、科研人员、公务员、自由职业、待业等
          </div>
        </el-form-item>
      </el-card>

      <!-- Section I: Sports -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">I. 体育运动</span>
          <span class="section-desc">请列出您孩子最爱好的体育运动项目（例如游泳、跑步、羽毛球等）</span>
        </template>

        <!-- None checkbox -->
        <el-form-item>
          <el-checkbox v-model="form.sports.none" @change="handleNoneChange('sports')">
            无爱好
          </el-checkbox>
        </el-form-item>

        <!-- Text inputs -->
        <div class="text-inputs-row" v-if="!form.sports.none">
          <el-form-item label="爱好 a">
            <el-input
              v-model="form.sports.a"
              placeholder="请输入运动项目"
              maxlength="50"
              :disabled="form.sports.none"
            />
          </el-form-item>
          <el-form-item label="爱好 b">
            <el-input
              v-model="form.sports.b"
              placeholder="请输入运动项目"
              maxlength="50"
              :disabled="form.sports.none"
            />
          </el-form-item>
          <el-form-item label="爱好 c">
            <el-input
              v-model="form.sports.c"
              placeholder="请输入运动项目"
              maxlength="50"
              :disabled="form.sports.none"
            />
          </el-form-item>
        </div>

        <!-- Auto-calculated count display -->
        <el-form-item>
          <div class="auto-calc-display">
            已填写项目数：<el-tag type="info">{{ calculatedCounts.sports }}</el-tag>
          </div>
        </el-form-item>

        <el-form-item label="与同龄儿童相比，他/她在这些项目上花去的时间多少？" prop="I_time">
          <el-radio-group v-model="form.I_time">
            <el-radio :label="0">不知道</el-radio>
            <el-radio :label="1">较少</el-radio>
            <el-radio :label="2">一般</el-radio>
            <el-radio :label="3">较多</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="与同龄儿童相比，他/她的运动水平如何？" prop="I_level">
          <el-radio-group v-model="form.I_level">
            <el-radio :label="0">不知道</el-radio>
            <el-radio :label="1">较低</el-radio>
            <el-radio :label="2">一般</el-radio>
            <el-radio :label="3">较高</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- Section II: Hobbies -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">II. 课余爱好</span>
          <span class="section-desc">请列出您孩子在体育运动以外的爱好（不包括看电视、玩手机/平板）</span>
        </template>

        <!-- None checkbox -->
        <el-form-item>
          <el-checkbox v-model="form.hobbies.none" @change="handleNoneChange('hobbies')">
            无爱好
          </el-checkbox>
        </el-form-item>

        <!-- Text inputs -->
        <div class="text-inputs-row" v-if="!form.hobbies.none">
          <el-form-item label="爱好 a">
            <el-input
              v-model="form.hobbies.a"
              placeholder="例如：阅读、绘画、乐器、拼图等"
              maxlength="50"
              :disabled="form.hobbies.none"
            />
          </el-form-item>
          <el-form-item label="爱好 b">
            <el-input
              v-model="form.hobbies.b"
              placeholder="例如：阅读、绘画、乐器、拼图等"
              maxlength="50"
              :disabled="form.hobbies.none"
            />
          </el-form-item>
          <el-form-item label="爱好 c">
            <el-input
              v-model="form.hobbies.c"
              placeholder="例如：阅读、绘画、乐器、拼图等"
              maxlength="50"
              :disabled="form.hobbies.none"
            />
          </el-form-item>
        </div>

        <!-- Auto-calculated count display -->
        <el-form-item>
          <div class="auto-calc-display">
            已填写项目数：<el-tag type="info">{{ calculatedCounts.hobbies }}</el-tag>
          </div>
        </el-form-item>

        <el-form-item label="与同龄儿童相比，他/她花在这些爱好上的时间多少？" prop="II_time">
          <el-radio-group v-model="form.II_time">
            <el-radio :label="0">不知道</el-radio>
            <el-radio :label="1">较少</el-radio>
            <el-radio :label="2">一般</el-radio>
            <el-radio :label="3">较多</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="与同龄儿童相比，他/她的爱好水平/专注度如何？" prop="II_level">
          <el-radio-group v-model="form.II_level">
            <el-radio :label="0">不知道</el-radio>
            <el-radio :label="1">较低</el-radio>
            <el-radio :label="2">一般</el-radio>
            <el-radio :label="3">较高</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- Section III: Organizations -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">III. 参加组织与社团</span>
          <span class="section-desc">请列出您孩子参加的兴趣班、社团、少先队/共青团或课外小组的名称</span>
        </template>

        <!-- None checkbox -->
        <el-form-item>
          <el-checkbox v-model="form.organizations.none" @change="handleNoneChange('organizations')">
            未参加
          </el-checkbox>
        </el-form-item>

        <!-- Text inputs -->
        <div class="text-inputs-row" v-if="!form.organizations.none">
          <el-form-item label="参加 a">
            <el-input
              v-model="form.organizations.a"
              placeholder="请输入组织名称"
              maxlength="50"
              :disabled="form.organizations.none"
            />
          </el-form-item>
          <el-form-item label="参加 b">
            <el-input
              v-model="form.organizations.b"
              placeholder="请输入组织名称"
              maxlength="50"
              :disabled="form.organizations.none"
            />
          </el-form-item>
          <el-form-item label="参加 c">
            <el-input
              v-model="form.organizations.c"
              placeholder="请输入组织名称"
              maxlength="50"
              :disabled="form.organizations.none"
            />
          </el-form-item>
        </div>

        <!-- Auto-calculated count display -->
        <el-form-item>
          <div class="auto-calc-display">
            已填写项目数：<el-tag type="info">{{ calculatedCounts.organizations }}</el-tag>
          </div>
        </el-form-item>

        <el-form-item label="与同龄儿童相比，他/她在这些组织中的活跃程度如何？" prop="III_active">
          <el-radio-group v-model="form.III_active">
            <el-radio :label="0">不知道</el-radio>
            <el-radio :label="1">较差</el-radio>
            <el-radio :label="2">一般</el-radio>
            <el-radio :label="3">较高</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- Section IV: Labor -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">IV. 劳动与社会实践</span>
          <span class="section-desc">请列出您孩子分担家务或参与社会实践的情况（例如：扫地/做家务、帮长辈做事、社区志愿者等）</span>
        </template>

        <!-- None checkbox -->
        <el-form-item>
          <el-checkbox v-model="form.labor.none" @change="handleNoneChange('labor')">
            没有
          </el-checkbox>
        </el-form-item>

        <!-- Text inputs -->
        <div class="text-inputs-row" v-if="!form.labor.none">
          <el-form-item label="有 a">
            <el-input
              v-model="form.labor.a"
              placeholder="请输入劳动或实践内容"
              maxlength="50"
              :disabled="form.labor.none"
            />
          </el-form-item>
          <el-form-item label="有 b">
            <el-input
              v-model="form.labor.b"
              placeholder="请输入劳动或实践内容"
              maxlength="50"
              :disabled="form.labor.none"
            />
          </el-form-item>
          <el-form-item label="有 c">
            <el-input
              v-model="form.labor.c"
              placeholder="请输入劳动或实践内容"
              maxlength="50"
              :disabled="form.labor.none"
            />
          </el-form-item>
        </div>

        <!-- Auto-calculated count display -->
        <el-form-item>
          <div class="auto-calc-display">
            已填写项目数：<el-tag type="info">{{ calculatedCounts.labor }}</el-tag>
          </div>
        </el-form-item>

        <el-form-item label="与同龄儿童相比，他/她的做事质量/完成度如何？" prop="IV_quality">
          <el-radio-group v-model="form.IV_quality">
            <el-radio :label="0">不知道</el-radio>
            <el-radio :label="1">较差</el-radio>
            <el-radio :label="2">一般</el-radio>
            <el-radio :label="3">较好</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- Section V: Friends -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">V. 交友情况</span>
        </template>
        <el-form-item label="您孩子有几个要好的朋友？" prop="V_friends">
          <el-radio-group v-model="form.V_friends">
            <el-radio :label="0">无</el-radio>
            <el-radio :label="1">1个</el-radio>
            <el-radio :label="2">2—3个</el-radio>
            <el-radio :label="3">4个及以上</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="您孩子与这些朋友每星期大概在一起（或互动）几次？" prop="V_meet">
          <el-radio-group v-model="form.V_meet">
            <el-radio :label="0">不到一次</el-radio>
            <el-radio :label="1">1—2次</el-radio>
            <el-radio :label="2">3次及以上</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- Section VI: Peer Relations -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">VI. 与同龄孩子相比，您孩子在下列方面表现如何？</span>
        </template>
        <el-form-item label="a. 与兄弟姐妹相处（独生子女可不填）" prop="VI_a">
          <el-radio-group v-model="form.VI_a">
            <el-radio :label="-1">无兄弟姐妹</el-radio>
            <el-radio :label="0">较差</el-radio>
            <el-radio :label="1">差不多</el-radio>
            <el-radio :label="2">较好</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="b. 与其他儿童相处" prop="VI_b">
          <el-radio-group v-model="form.VI_b">
            <el-radio :label="0">较差</el-radio>
            <el-radio :label="1">差不多</el-radio>
            <el-radio :label="2">较好</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="c. 对待父母的态度和行为" prop="VI_c">
          <el-radio-group v-model="form.VI_c">
            <el-radio :label="0">较差</el-radio>
            <el-radio :label="1">差不多</el-radio>
            <el-radio :label="2">较好</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="d. 独立做事和玩耍时的表现" prop="VI_d">
          <el-radio-group v-model="form.VI_d">
            <el-radio :label="0">较差</el-radio>
            <el-radio :label="1">差不多</el-radio>
            <el-radio :label="2">较好</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- Section VII: School Performance -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">VII. 学习表现（针对已上学的儿童）</span>
        </template>

        <!-- Not in school option -->
        <el-form-item>
          <el-checkbox v-model="form.VII_notInSchool">
            未上学（勾选此项可跳过成绩评价）
          </el-checkbox>
        </el-form-item>

        <!-- Grades section -->
        <div v-if="!form.VII_notInSchool" class="grades-section">
          <el-form-item label="当前学习成绩表现：">
            <div class="grade-items">
              <el-form-item label="语文课（含阅读/写作）" prop="VII_chinese">
                <el-radio-group v-model="form.VII_chinese">
                  <el-radio :label="0">不及格</el-radio>
                  <el-radio :label="1">中等以下</el-radio>
                  <el-radio :label="2">中等</el-radio>
                  <el-radio :label="3">中等以上</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="数学课" prop="VII_math">
                <el-radio-group v-model="form.VII_math">
                  <el-radio :label="0">不及格</el-radio>
                  <el-radio :label="1">中等以下</el-radio>
                  <el-radio :label="2">中等</el-radio>
                  <el-radio :label="3">中等以上</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="英语课" prop="VII_english">
                <el-radio-group v-model="form.VII_english">
                  <el-radio :label="0">不及格</el-radio>
                  <el-radio :label="1">中等以下</el-radio>
                  <el-radio :label="2">中等</el-radio>
                  <el-radio :label="3">中等以上</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="其他课（如科学、历史等）" prop="VII_other">
                <el-radio-group v-model="form.VII_other">
                  <el-radio :label="0">不及格</el-radio>
                  <el-radio :label="1">中等以下</el-radio>
                  <el-radio :label="2">中等</el-radio>
                  <el-radio :label="3">中等以上</el-radio>
                </el-radio-group>
              </el-form-item>
            </div>
          </el-form-item>
        </div>

        <el-divider />

        <!-- Special Education -->
        <el-form-item>
          <el-checkbox v-model="form.VII_isSpecial">
            在特殊教育班级或接受特教干预
          </el-checkbox>
        </el-form-item>
        <el-form-item v-if="form.VII_isSpecial" label="请说明性质：" prop="VII_specialType">
          <el-input
            v-model="form.VII_specialType"
            placeholder="请说明特教性质"
            maxlength="100"
          />
        </el-form-item>

        <!-- Retained -->
        <el-form-item>
          <el-checkbox v-model="form.VII_isRetained">
            留过级或延缓入学
          </el-checkbox>
        </el-form-item>
        <template v-if="form.VII_isRetained">
          <el-form-item label="几年级：" prop="VII_retainedGrade">
            <el-input
              v-model="form.VII_retainedGrade"
              placeholder="请输入年级"
              maxlength="20"
            />
          </el-form-item>
          <el-form-item label="理由：" prop="VII_retainedReason">
            <el-input
              v-model="form.VII_retainedReason"
              placeholder="请输入留级理由"
              maxlength="200"
            />
          </el-form-item>
        </template>

        <!-- Problems -->
        <el-form-item>
          <el-checkbox v-model="form.VII_hasProblem">
            在学校里有无学习或其他方面的问题（不包括上面三个问题）
          </el-checkbox>
        </el-form-item>
        <template v-if="form.VII_hasProblem">
          <el-form-item label="问题内容：" prop="VII_problemContent">
            <el-input
              v-model="form.VII_problemContent"
              type="textarea"
              :rows="2"
              placeholder="请描述问题内容"
              maxlength="500"
            />
          </el-form-item>
          <el-form-item label="问题何时开始：" prop="VII_problemStart">
            <el-input
              v-model="form.VII_problemStart"
              placeholder="例如：小学一年级"
              maxlength="50"
            />
          </el-form-item>
          <el-form-item label="问题是否已解决：" prop="VII_isSolved">
            <el-radio-group v-model="form.VII_isSolved">
              <el-radio :label="false">未解决</el-radio>
              <el-radio :label="true">已解决</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item
            v-if="form.VII_isSolved"
            label="何时解决："
            prop="VII_solvedWhen"
          >
            <el-input
              v-model="form.VII_solvedWhen"
              placeholder="例如：三年级上学期"
              maxlength="50"
            />
          </el-form-item>
        </template>
      </el-card>
    </el-form>

    <div class="form-actions">
      <el-button type="primary" size="large" @click="handleSubmit" :icon="ArrowRight">
        保存并进入下一步
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import type { CBCLSocialCompetenceData, CBCLTextItem } from '@/types/cbcl'
import type { StudentContext } from '@/types/assessment'

interface Props {
  student?: StudentContext | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [data: CBCLSocialCompetenceData]
}>()

const formRef = ref()

// Default text item structure
const defaultTextItem = (): CBCLTextItem => ({
  a: '',
  b: '',
  c: '',
  none: false
})

const form = ref<CBCLSocialCompetenceData>({
  // Part 1: General Information
  reporter: 'mother',
  other_relation: '',
  father_occupation: '',
  mother_occupation: '',

  // Part 2: Text inputs
  sports: defaultTextItem(),
  hobbies: defaultTextItem(),
  organizations: defaultTextItem(),
  labor: defaultTextItem(),

  // I. 体育运动 (auto-calculated counts)
  I_count: 0,
  I_time: 0,
  I_level: 0,

  // II. 课余爱好
  II_count: 0,
  II_time: 0,
  II_level: 0,

  // III. 参加组织
  III_count: 0,
  III_active: 0,

  // IV. 劳动实践
  IV_count: 0,
  IV_quality: 0,

  // V. 交友情况
  V_friends: 0,
  V_meet: 0,

  // VI. 与同龄孩子相比
  VI_a: -1,
  VI_b: 0,
  VI_c: 0,
  VI_d: 0,

  // VII. 学习表现
  VII_math: 0,
  VII_chinese: 0,
  VII_english: 0,
  VII_other: 0,
  VII_notInSchool: false,

  // VII. 条件字段
  VII_isSpecial: false,
  VII_specialType: '',
  VII_isRetained: false,
  VII_retainedGrade: '',
  VII_retainedReason: '',
  VII_hasProblem: false,
  VII_problemContent: '',
  VII_problemStart: '',
  VII_isSolved: false,
  VII_solvedWhen: ''
})

// Calculate count from text inputs
function calculateCount(item: CBCLTextItem): number {
  if (item.none) return 0
  return [item.a, item.b, item.c].filter(t => t.trim().length > 0).length
}

// Auto-calculated counts
const calculatedCounts = computed(() => ({
  sports: calculateCount(form.value.sports),
  hobbies: calculateCount(form.value.hobbies),
  organizations: calculateCount(form.value.organizations),
  labor: calculateCount(form.value.labor)
}))

// Handle "None" checkbox change
function handleNoneChange(field: keyof CBCLSocialCompetenceData) {
  const item = form.value[field] as CBCLTextItem
  if (item.none) {
    item.a = ''
    item.b = ''
    item.c = ''
  }
}

const formRules = {
  reporter: [{ required: true, message: '请选择填表者', trigger: 'change' }],
  other_relation: [{ required: true, message: '请说明与儿童的关系', trigger: 'blur' }],
  father_occupation: [{ required: true, message: '请填写父亲职业', trigger: 'blur' }],
  mother_occupation: [{ required: true, message: '请填写母亲职业', trigger: 'blur' }],
  I_time: [{ required: true, message: '请选择时间投入', trigger: 'change' }],
  I_level: [{ required: true, message: '请选择运动水平', trigger: 'change' }],
  II_time: [{ required: true, message: '请选择时间投入', trigger: 'change' }],
  II_level: [{ required: true, message: '请选择爱好水平', trigger: 'change' }],
  III_active: [{ required: true, message: '请选择活跃程度', trigger: 'change' }],
  IV_quality: [{ required: true, message: '请选择完成质量', trigger: 'change' }],
  V_friends: [{ required: true, message: '请选择朋友数量', trigger: 'change' }],
  V_meet: [{ required: true, message: '请选择见面频率', trigger: 'change' }],
  VI_a: [{ required: true, message: '请选择与兄弟姐妹相处情况', trigger: 'change' }],
  VI_b: [{ required: true, message: '请选择与其他儿童相处情况', trigger: 'change' }],
  VI_c: [{ required: true, message: '请选择对待父母态度', trigger: 'change' }],
  VI_d: [{ required: true, message: '请选择独立做事表现', trigger: 'change' }],
  VII_specialType: [{ required: true, message: '请说明特教性质', trigger: 'blur' }],
  VII_retainedGrade: [{ required: true, message: '请输入留级年级', trigger: 'blur' }],
  VII_retainedReason: [{ required: true, message: '请输入留级理由', trigger: 'blur' }],
  VII_problemContent: [{ required: true, message: '请描述问题内容', trigger: 'blur' }],
  VII_problemStart: [{ required: true, message: '请输入问题开始时间', trigger: 'blur' }],
  VII_solvedWhen: [{ required: true, message: '请输入解决时间', trigger: 'blur' }]
}

const studentAgeLabel = computed(() => {
  if (!props.student) return '-'
  const years = Math.floor(props.student.ageInMonths / 12)
  const months = props.student.ageInMonths % 12
  if (years === 0) return `${months}个月`
  if (months === 0) return `${years}岁`
  return `${years}岁${months}个月`
})

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    // Prepare data with auto-calculated counts
    const submitData: CBCLSocialCompetenceData = {
      ...form.value,
      // Auto-calculate counts from text inputs
      I_count: calculatedCounts.value.sports,
      II_count: calculatedCounts.value.hobbies,
      III_count: calculatedCounts.value.organizations,
      IV_count: calculatedCounts.value.labor
    }

    emit('submit', submitData)
  } catch (error) {
    ElMessage.warning('请完成所有必填项')
  }
}
</script>

<style scoped>
.cbcl-social-form {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 20px;
}

.header-content h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #303133;
}

.intro-text {
  color: #606266;
  line-height: 1.8;
  margin: 0;
}

.student-name {
  color: #409eff;
  font-weight: 500;
}

.section-card {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-desc {
  font-size: 13px;
  color: #909399;
  margin-left: 8px;
}

.input-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.text-inputs-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.auto-calc-display {
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
  color: #606266;
}

.grades-section {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
}

.grade-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.grade-items .el-form-item {
  margin-bottom: 0;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 30px;
  margin-bottom: 40px;
}

.form-actions .el-button {
  min-width: 200px;
  height: 50px;
  font-size: 16px;
}

:deep(.el-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

:deep(.el-radio) {
  margin-right: 0;
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  transition: all 0.3s;
}

:deep(.el-radio.is-checked) {
  background: #ecf5ff;
  border-color: #409eff;
}

:deep(.el-radio__input) {
  display: none;
}

:deep(.el-radio__label) {
  padding-left: 0;
}

@media (max-width: 768px) {
  .text-inputs-row {
    grid-template-columns: 1fr;
  }

  .grade-items {
    grid-template-columns: 1fr;
  }

  :deep(.el-radio-group) {
    flex-direction: column;
  }
}
</style>
