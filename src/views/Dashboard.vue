<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <i class="fas fa-user-graduate"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.studentCount }}</h3>
          <p>学生总数</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon orange">
          <i class="fas fa-clipboard-check"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.pendingAssessments }}</h3>
          <p>待评估</p>
        </div>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="dashboard-content">
      <!-- 最近学生 -->
      <div class="card">
        <div class="card-header">
          <h2>最近添加的学生</h2>
          <router-link to="/students" class="view-all">查看全部</router-link>
        </div>
        <div class="student-list">
          <div v-for="student in recentStudents" :key="student.id" class="student-item">
            <div class="student-avatar">
              <img v-if="student.avatar_path" :src="student.avatar_path" :alt="student.name" />
              <i v-else class="fas fa-user"></i>
            </div>
            <div class="student-info">
              <h4>{{ student.name }}</h4>
              <p>{{ student.gender }} · {{ getAge(student.birthday) }}岁 · {{ student.disorder }}</p>
            </div>
            <div class="student-actions">
              <router-link :to="`/students/${student.id}`" class="btn btn-sm">查看</router-link>
              <button @click="startAssessment(student.id)" class="btn btn-sm btn-primary">评估</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 待办事项 -->
      <div class="card">
        <div class="card-header">
          <h2>待办事项</h2>
        </div>
        <div class="todo-list">
          <div v-for="todo in todos" :key="todo.id" class="todo-item" :class="todo.type">
            <div class="todo-icon">
              <i :class="todo.icon"></i>
            </div>
            <div class="todo-content">
              <h4>{{ todo.title }}</h4>
              <p>{{ todo.description }}</p>
            </div>
            <div class="todo-time">
              {{ todo.time }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStudentStore } from '@/stores/student'

const router = useRouter()
const studentStore = useStudentStore()

// 统计数据
const stats = ref({
  studentCount: 0,
  pendingAssessments: 0
})

// 最近学生
const recentStudents = ref([])

// 待办事项
const todos = ref([
  {
    id: 1,
    type: 'warning',
    icon: 'fas fa-triangle-exclamation',
    title: '待评估学生',
    description: '部分学生尚未进行能力评估',
    time: '今天'
  },
  {
    id: 2,
    type: 'info',
    icon: 'fas fa-gamepad',
    title: '感官训练',
    description: '新感官训练模块即将上线',
    time: '即将推出'
  }
])

// 获取年龄
const getAge = (birthday: string) => {
  const birth = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// 开始评估
const startAssessment = (studentId: number) => {
  router.push(`/assessment?student=${studentId}`)
}

// 加载数据
const loadData = async () => {
  try {
    // 加载学生数据
    await studentStore.loadStudents()

    // 计算统计数据
    stats.value = {
      studentCount: studentStore.students.length,
      pendingAssessments: studentStore.students.filter(s => !s.last_assessment_date).length
    }

    // 获取最近添加的学生（最多3个）
    recentStudents.value = studentStore.students
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 3)
      .map(student => ({
        id: student.id,
        name: student.name,
        gender: student.gender,
        birthday: student.birthday,
        disorder: student.disability_type,
        avatar_path: student.avatar_path || ''
      }))

    // 更新待办事项
    todos.value = [
      {
        id: 1,
        type: 'warning',
        icon: 'fas fa-triangle-exclamation',
        title: '待评估学生',
        description: `有${stats.value.pendingAssessments}名学生尚未进行能力评估`,
        time: '今天'
      },
      {
        id: 2,
        type: 'info',
        icon: 'fas fa-gamepad',
        title: '感官训练',
        description: '新感官训练模块即将上线',
        time: '即将推出'
      }
    ]

  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.orange {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.green {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.purple {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-content h3 {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  color: #333;
}

.stat-content p {
  margin: 4px 0 0 0;
  color: #666;
  font-size: 14px;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.card.full-width {
  grid-column: 1 / -1;
}

.card-header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.view-all {
  color: #667eea;
  text-decoration: none;
  font-size: 14px;
}

.view-all:hover {
  text-decoration: underline;
}

.student-list {
  padding: 20px;
}

.student-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.student-item:last-child {
  border-bottom: none;
}

.student-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.student-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.student-avatar i {
  font-size: 20px;
  color: #999;
}

.student-info {
  flex: 1;
}

.student-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #333;
}

.student-info p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.student-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  color: #666;
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:hover {
  background: #f0f0f0;
}

.btn.btn-primary {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.btn.btn-primary:hover {
  background: #5a67d8;
}

.btn.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.todo-list {
  padding: 20px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.todo-item.warning {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
}

.todo-item.info {
  background: #cce5ff;
  border: 1px solid #b3d9ff;
}

.todo-item.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
}

.todo-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.todo-item.warning .todo-icon {
  background: #f39c12;
  color: white;
}

.todo-item.info .todo-icon {
  background: #3498db;
  color: white;
}

.todo-item.success .todo-icon {
  background: #2ecc71;
  color: white;
}

.todo-content {
  flex: 1;
}

.todo-content h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #333;
}

.todo-content p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.todo-time {
  font-size: 12px;
  color: #999;
}

@media (max-width: 1024px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
}
</style>