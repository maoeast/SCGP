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
      <!-- Section I: Sports -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">I. 体育运动</span>
          <span class="section-desc">请根据孩子参与体育运动的情况回答</span>
        </template>
        <el-form-item label="1. 爱好数量" prop="I_count">
          <el-radio-group v-model="form.I_count">
            <el-radio :label="0">无爱好</el-radio>
            <el-radio :label="1">1项</el-radio>
            <el-radio :label="2">2项</el-radio>
            <el-radio :label="3">3项及以上</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="2. 时间投入" prop="I_time">
          <el-radio-group v-model="form.I_time">
            <el-radio :label="0">不知道</el-radio>
            <el-radio :label="1">较少</el-radio>
            <el-radio :label="2">一般</el-radio>
            <el-radio :label="3">较多</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="3. 运动水平" prop="I_level">
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
          <span class="section-desc">（如集邮、手工、画画、下棋、乐器等）</span>
        </template>
        <el-form-item label="1. 爱好数量" prop="II_count">
          <el-radio-group v-model="form.II_count">
            <el-radio :label="0">无爱好</el-radio>
            <el-radio :label="1">1项</el-radio>
            <el-radio :label="2">2项</el-radio>
            <el-radio :label="3">3项及以上</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="2. 时间投入" prop="II_time">
          <el-radio-group v-model="form.II_time">
            <el-radio :label="0">不知道</el-radio>
            <el-radio :label="1">较少</el-radio>
            <el-radio :label="2">一般</el-radio>
            <el-radio :label="3">较多</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="3. 技能水平" prop="II_level">
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
          <span class="section-title">III. 参加组织</span>
          <span class="section-desc">（如少先队、兴趣小组、社团等）</span>
        </template>
        <el-form-item label="1. 参加数量" prop="III_count">
          <el-radio-group v-model="form.III_count">
            <el-radio :label="0">无</el-radio>
            <el-radio :label="1">1个</el-radio>
            <el-radio :label="2">2个</el-radio>
            <el-radio :label="3">3个及以上</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="2. 活跃程度" prop="III_active">
          <el-radio-group v-model="form.III_active">
            <el-radio :label="0">不知道</el-radio>
            <el-radio :label="1">不活跃</el-radio>
            <el-radio :label="2">一般</el-radio>
            <el-radio :label="3">很活跃</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- Section IV: Labor -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">IV. 劳动实践</span>
          <span class="section-desc">（如家务劳动、学校劳动、社区服务等）</span>
        </template>
        <el-form-item label="1. 参与数量" prop="IV_count">
          <el-radio-group v-model="form.IV_count">
            <el-radio :label="0">无</el-radio>
            <el-radio :label="1">1项</el-radio>
            <el-radio :label="2">2项</el-radio>
            <el-radio :label="3">3项及以上</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="2. 完成质量" prop="IV_quality">
          <el-radio-group v-model="form.IV_quality">
            <el-radio :label="0">不知道</el-radio>
            <el-radio :label="1">较差</el-radio>
            <el-radio :label="2">一般</el-radio>
            <el-radio :label="3">很好</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- Section V: Friends -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">V. 交友情况</span>
        </template>
        <el-form-item label="1. 朋友数量" prop="V_friends">
          <el-radio-group v-model="form.V_friends">
            <el-radio :label="0">无</el-radio>
            <el-radio :label="1">1个</el-radio>
            <el-radio :label="2">2-3个</el-radio>
            <el-radio :label="3">4个及以上</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="2. 见面频率" prop="V_meet">
          <el-radio-group v-model="form.V_meet">
            <el-radio :label="0">从不/很少</el-radio>
            <el-radio :label="1">偶尔（每周1次）</el-radio>
            <el-radio :label="2">经常（每周2-3次）</el-radio>
            <el-radio :label="3">几乎每天</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- Section VI: Peer Relations -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">VI. 与同龄孩子相比</span>
          <span class="section-desc">孩子在以下方面的表现如何？</span>
        </template>
        <el-form-item label="1. 与兄弟姐妹相处" prop="VI_a">
          <el-radio-group v-model="form.VI_a">
            <el-radio :label="-1">无兄弟姐妹</el-radio>
            <el-radio :label="0">较差</el-radio>
            <el-radio :label="1">一般</el-radio>
            <el-radio :label="2">很好</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="2. 与其他儿童相处" prop="VI_b">
          <el-radio-group v-model="form.VI_b">
            <el-radio :label="0">较差</el-radio>
            <el-radio :label="1">一般</el-radio>
            <el-radio :label="2">很好</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="3. 对待父母态度" prop="VI_c">
          <el-radio-group v-model="form.VI_c">
            <el-radio :label="0">较差</el-radio>
            <el-radio :label="1">一般</el-radio>
            <el-radio :label="2">很好</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="4. 独立做事表现" prop="VI_d">
          <el-radio-group v-model="form.VI_d">
            <el-radio :label="0">较差</el-radio>
            <el-radio :label="1">一般</el-radio>
            <el-radio :label="2">很好</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- Section VII: School Performance -->
      <el-card class="section-card">
        <template #header>
          <span class="section-title">VII. 学习表现</span>
        </template>
        <el-form-item label="1. 各科成绩评价" class="grades-section">
          <div class="grade-items">
            <el-form-item label="数学" prop="VII_math">
              <el-radio-group v-model="form.VII_math">
                <el-radio :label="0">不及格</el-radio>
                <el-radio :label="1">及格</el-radio>
                <el-radio :label="2">良好</el-radio>
                <el-radio :label="3">优秀</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="语文" prop="VII_chinese">
              <el-radio-group v-model="form.VII_chinese">
                <el-radio :label="0">不及格</el-radio>
                <el-radio :label="1">及格</el-radio>
                <el-radio :label="2">良好</el-radio>
                <el-radio :label="3">优秀</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="英语" prop="VII_english">
              <el-radio-group v-model="form.VII_english">
                <el-radio :label="0">不及格</el-radio>
                <el-radio :label="1">及格</el-radio>
                <el-radio :label="2">良好</el-radio>
                <el-radio :label="3">优秀</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="其他科目" prop="VII_other">
              <el-radio-group v-model="form.VII_other">
                <el-radio :label="0">不及格</el-radio>
                <el-radio :label="1">及格</el-radio>
                <el-radio :label="2">良好</el-radio>
                <el-radio :label="3">优秀</el-radio>
              </el-radio-group>
            </el-form-item>
          </div>
        </el-form-item>
        <el-divider />
        <el-form-item label="2. 特殊情况（可多选）">
          <el-checkbox v-model="form.VII_isSpecial">在特教班级就读</el-checkbox>
          <el-checkbox v-model="form.VII_isRetained">曾经留级</el-checkbox>
          <el-checkbox v-model="form.VII_hasProblem">有学习困难或问题</el-checkbox>
        </el-form-item>
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
import type { CBCLSocialCompetenceData } from '@/types/cbcl'
import type { StudentContext } from '@/types/assessment'

interface Props {
  student?: StudentContext | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [data: CBCLSocialCompetenceData]
}>()

const formRef = ref()

const form = ref<CBCLSocialCompetenceData>({
  // I. 体育运动
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
  VII_isSpecial: false,
  VII_isRetained: false,
  VII_hasProblem: false
})

const formRules = {
  I_count: [{ required: true, message: '请选择爱好数量', trigger: 'change' }],
  I_time: [{ required: true, message: '请选择时间投入', trigger: 'change' }],
  I_level: [{ required: true, message: '请选择运动水平', trigger: 'change' }],
  II_count: [{ required: true, message: '请选择爱好数量', trigger: 'change' }],
  II_time: [{ required: true, message: '请选择时间投入', trigger: 'change' }],
  II_level: [{ required: true, message: '请选择技能水平', trigger: 'change' }],
  III_count: [{ required: true, message: '请选择参加数量', trigger: 'change' }],
  III_active: [{ required: true, message: '请选择活跃程度', trigger: 'change' }],
  IV_count: [{ required: true, message: '请选择参与数量', trigger: 'change' }],
  IV_quality: [{ required: true, message: '请选择完成质量', trigger: 'change' }],
  V_friends: [{ required: true, message: '请选择朋友数量', trigger: 'change' }],
  V_meet: [{ required: true, message: '请选择见面频率', trigger: 'change' }],
  VI_a: [{ required: true, message: '请选择与兄弟姐妹相处情况', trigger: 'change' }],
  VI_b: [{ required: true, message: '请选择与其他儿童相处情况', trigger: 'change' }],
  VI_c: [{ required: true, message: '请选择对待父母态度', trigger: 'change' }],
  VI_d: [{ required: true, message: '请选择独立做事表现', trigger: 'change' }],
  VII_math: [{ required: true, message: '请选择数学成绩', trigger: 'change' }],
  VII_chinese: [{ required: true, message: '请选择语文成绩', trigger: 'change' }],
  VII_english: [{ required: true, message: '请选择英语成绩', trigger: 'change' }],
  VII_other: [{ required: true, message: '请选择其他科目成绩', trigger: 'change' }]
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
    emit('submit', { ...form.value })
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
  .grade-items {
    grid-template-columns: 1fr;
  }

  :deep(.el-radio-group) {
    flex-direction: column;
  }
}
</style>
