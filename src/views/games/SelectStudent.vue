<template>
  <div class="select-student">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-button @click="goBack" :icon="ArrowLeft">返回</el-button>
          <h2>选择训练学生</h2>
        </div>
      </template>

      <div class="game-info">
        <el-tag size="large" type="primary">{{ gameInfo.name }}</el-tag>
        <span class="game-desc">{{ gameInfo.description }}</span>
      </div>

      <!-- 游戏配置 -->
      <div class="game-config">
        <h3>训练配置</h3>

        <!-- Tasks 1-3: GameGrid 配置 -->
        <template v-if="isGridGame">
          <div class="config-row">
            <label>网格大小：</label>
            <el-radio-group v-model="gridSize">
              <el-radio-button :value="2">2×2（推荐）</el-radio-button>
              <el-radio-button :value="3">3×3</el-radio-button>
              <el-radio-button :value="4">4×4</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-row">
            <label>时间限制：</label>
            <el-radio-group v-model="timeLimit">
              <el-radio-button :value="60">60秒（推荐）</el-radio-button>
              <el-radio-button :value="90">90秒</el-radio-button>
              <el-radio-button :value="120">120秒</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-row">
            <label>训练轮次：</label>
            <el-radio-group v-model="rounds">
              <el-radio-button :value="5">5轮（推荐）</el-radio-button>
              <el-radio-button :value="8">8轮</el-radio-button>
              <el-radio-button :value="10">10轮</el-radio-button>
            </el-radio-group>
          </div>
        </template>

        <!-- Task 4: VisualTracker 配置 -->
        <template v-else-if="isTrackerGame">
          <div class="config-row">
            <label>训练时长：</label>
            <el-radio-group v-model="duration">
              <el-radio-button :value="30">30秒</el-radio-button>
              <el-radio-button :value="60">60秒</el-radio-button>
              <el-radio-button :value="90">90秒</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-row">
            <label>目标大小：</label>
            <el-radio-group v-model="targetSize">
              <el-radio-button :value="40">小</el-radio-button>
              <el-radio-button :value="60">中</el-radio-button>
              <el-radio-button :value="80">大</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-row">
            <label>移动速度：</label>
            <el-radio-group v-model="targetSpeed">
              <el-radio-button :value="1">慢速</el-radio-button>
              <el-radio-button :value="2">中速</el-radio-button>
              <el-radio-button :value="3">快速</el-radio-button>
            </el-radio-group>
          </div>
        </template>

        <!-- Task 5: 声音辨别 -->
        <template v-else-if="gameInfo.id === TaskID.AUDIO_DIFF">
          <div class="config-row">
            <label>时间限制：</label>
            <el-radio-group v-model="timeLimit">
              <el-radio-button :value="60">60秒（推荐）</el-radio-button>
              <el-radio-button :value="90">90秒</el-radio-button>
              <el-radio-button :value="120">120秒</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-row">
            <label>训练轮次：</label>
            <el-radio-group v-model="rounds">
              <el-radio-button :value="5">5轮（推荐）</el-radio-button>
              <el-radio-button :value="8">8轮</el-radio-button>
              <el-radio-button :value="10">10轮</el-radio-button>
            </el-radio-group>
          </div>
        </template>

        <!-- Task 6: 听指令做动作 -->
        <template v-else-if="gameInfo.id === TaskID.AUDIO_COMMAND">
          <div class="config-row">
            <label>网格大小：</label>
            <el-radio-group v-model="gridSize">
              <el-radio-button :value="2">2×2（推荐）</el-radio-button>
              <el-radio-button :value="3">3×3</el-radio-button>
              <el-radio-button :value="4">4×4</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-row">
            <label>时间限制：</label>
            <el-radio-group v-model="timeLimit">
              <el-radio-button :value="60">60秒（推荐）</el-radio-button>
              <el-radio-button :value="90">90秒</el-radio-button>
              <el-radio-button :value="120">120秒</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-row">
            <label>训练轮次：</label>
            <el-radio-group v-model="rounds">
              <el-radio-button :value="5">5轮（推荐）</el-radio-button>
              <el-radio-button :value="8">8轮</el-radio-button>
              <el-radio-button :value="10">10轮</el-radio-button>
            </el-radio-group>
          </div>
        </template>

        <!-- Task 7: 节奏模仿 -->
        <template v-else-if="gameInfo.id === TaskID.AUDIO_RHYTHM">
          <div class="config-row">
            <label>训练轮次：</label>
            <el-radio-group v-model="rounds">
              <el-radio-button :value="5">5轮（推荐）</el-radio-button>
              <el-radio-button :value="8">8轮</el-radio-button>
              <el-radio-button :value="10">10轮</el-radio-button>
            </el-radio-group>
          </div>
        </template>
      </div>

      <div class="student-search">
        <el-input
          v-model="searchText"
          placeholder="搜索学生姓名或学号"
          :prefix-icon="Search"
          clearable
          @input="handleSearch"
        />
        <el-button type="primary" :icon="Plus" @click="showAddDialog">
          添加新学生
        </el-button>
      </div>

      <!-- 空状态 -->
      <el-empty
        v-if="!loading && filteredStudents.length === 0"
        description="暂无学生数据"
      >
        <el-button type="primary" @click="showAddDialog">添加新学生</el-button>
      </el-empty>

      <!-- 学生列表 -->
      <div v-else-if="filteredStudents.length > 0" v-loading="loading" element-loading-text="加载中...">
        <table class="student-table">
          <thead>
            <tr>
              <th>照片</th>
              <th>姓名</th>
              <th>学号</th>
              <th>性别</th>
              <th>出生日期</th>
              <th>年龄</th>
              <th>诊断类型</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="student in filteredStudents"
              :key="student.id"
              @click="selectStudent(student)"
              class="student-row"
            >
              <td>
                <el-avatar :size="50" :src="student.avatar_path">
                  {{ student.name?.charAt(0) || '?' }}
                </el-avatar>
              </td>
              <td>{{ student.name }}</td>
              <td>{{ student.student_no || '-' }}</td>
              <td>{{ student.gender }}</td>
              <td>{{ formatDate(student.birthday) }}</td>
              <td>{{ calculateAge(student.birthday) }}岁</td>
              <td>{{ student.disorder || '-' }}</td>
              <td>
                <el-button
                  type="primary"
                  :icon="Right"
                  circle
                  @click.stop="selectStudent(student)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </el-card>

    <!-- 快速添加学生对话框 -->
    <AddStudentDialog
      v-if="addDialogVisible"
      @close="addDialogVisible = false"
      @saved="handleStudentAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Search,
  Plus,
  Right
} from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import { TaskID } from '@/types/games'
import AddStudentDialog from '@/components/AddStudentDialog.vue'

const router = useRouter()
const route = useRoute()
const studentStore = useStudentStore()

// 游戏信息
const gameInfo = ref({
  id: parseInt(route.query.taskId as string),
  name: '',
  description: '',
  mode: route.query.mode as string
})

// 游戏配置（使用 ref 而不是 reactive，避免响应式问题）
// 默认值针对特殊儿童优化：更少的轮次、更宽松的时间限制
const gridSize = ref<2 | 3 | 4>(2)
const timeLimit = ref(60) // 默认60秒，给特殊儿童更多时间
const rounds = ref(5) // 默认5轮，避免疲劳
const duration = ref(30)
const targetSize = ref(60)
const targetSpeed = ref(2)

// 判断游戏类型
const isGridGame = computed(() =>
  [TaskID.COLOR_MATCH, TaskID.SHAPE_MATCH, TaskID.ICON_MATCH].includes(gameInfo.value.id)
)

const isTrackerGame = computed(() => gameInfo.value.id === TaskID.VISUAL_TRACK)

// 游戏名称映射
const gameNames: Record<number, { name: string; description: string }> = {
  [TaskID.COLOR_MATCH]: { name: '颜色配对', description: '识别和匹配不同颜色，提升视觉辨别能力' },
  [TaskID.SHAPE_MATCH]: { name: '形状识别', description: '识别基本几何形状，提升图形认知' },
  [TaskID.ICON_MATCH]: { name: '物品配对', description: '识别日常物品，提升视觉联想能力' },
  [TaskID.VISUAL_TRACK]: { name: '视觉追踪', description: '追踪移动目标，训练视觉注意力' },
  [TaskID.AUDIO_DIFF]: { name: '声音辨别', description: '辨别不同音调，提升听觉敏锐度' },
  [TaskID.AUDIO_COMMAND]: { name: '听指令做动作', description: '根据语音指令选择正确选项，训练听觉理解' },
  [TaskID.AUDIO_RHYTHM]: { name: '节奏模仿', description: '听节奏并模仿拍打，训练听觉序列记忆' }
}

// 设置游戏信息
if (route.query.taskId) {
  const info = gameNames[parseInt(route.query.taskId as string)]
  if (info) {
    gameInfo.value = {
      ...gameInfo.value,
      name: info.name,
      description: info.description
    }
  }
}

// 搜索相关
const searchText = ref('')

// 加载状态
const loading = ref(false)

// 学生列表
const students = computed(() => studentStore.students || [])

// 过滤后的学生列表
const filteredStudents = computed(() => {
  if (!searchText.value) return students.value
  const search = searchText.value.toLowerCase()
  return students.value.filter(
    s =>
      s.name?.toLowerCase().includes(search) ||
      s.student_no?.toLowerCase().includes(search)
  )
})

// 添加学生对话框
const addDialogVisible = ref(false)

// 返回上一页
const goBack = () => {
  router.push('/games')
}

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已通过 computed 实现
}

// 显示添加对话框
const showAddDialog = () => {
  addDialogVisible.value = true
}

// 处理学生添加成功
const handleStudentAdded = async () => {
  addDialogVisible.value = false
  ElMessage.success('添加成功')
}

// 选择学生
const selectStudent = (student: any) => {
  const query: any = {
    studentId: student.id.toString(),
    taskId: gameInfo.value.id.toString(),
    mode: gameInfo.value.mode
  }

  // 根据游戏类型添加配置参数
  if (isGridGame.value) {
    // 视觉训练：网格大小、时间限制、轮次
    query.gridSize = gridSize.value
    query.timeLimit = timeLimit.value
    query.rounds = rounds.value
  } else if (isTrackerGame.value) {
    // 视觉追踪：训练时长、目标大小、移动速度
    query.duration = duration.value
    query.targetSize = targetSize.value
    query.targetSpeed = targetSpeed.value
  } else if (gameInfo.value.id === TaskID.AUDIO_DIFF) {
    // 声音辨别：时间限制、轮次
    query.timeLimit = timeLimit.value
    query.rounds = rounds.value
  } else if (gameInfo.value.id === TaskID.AUDIO_COMMAND) {
    // 听指令做动作：网格大小、时间限制、轮次
    query.gridSize = gridSize.value
    query.timeLimit = timeLimit.value
    query.rounds = rounds.value
  } else if (gameInfo.value.id === TaskID.AUDIO_RHYTHM) {
    // 节奏模仿：轮次（无时间限制）
    query.rounds = rounds.value
  }

  console.log('跳转到游戏，参数:', query)
  router.push({
    path: '/games/play',
    query
  })
}

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

// 计算年龄
const calculateAge = (birthday: string) => {
  if (!birthday) return ''
  const birth = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// 初始化
onMounted(async () => {
  loading.value = true
  try {
    await studentStore.loadStudents()
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.select-student {
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 15px;
}

.card-header h2 {
  margin: 0;
}

.game-info {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.game-desc {
  color: #606266;
  font-size: 14px;
}

.game-config {
  margin-bottom: 20px;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.game-config h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
}

.config-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  gap: 15px;
}

.config-row:last-child {
  margin-bottom: 0;
}

.config-row label {
  min-width: 100px;
  font-weight: 500;
  color: #606266;
}

.student-search {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.student-search .el-input {
  flex: 1;
}

.student-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.student-table th {
  background-color: #f5f7fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

.student-table td {
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}

.student-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.student-row:hover {
  background-color: #f5f7fa;
}

.student-row:last-child td {
  border-bottom: none;
}
</style>
