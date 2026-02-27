<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>评估中心</h1>
        <p class="subtitle">选择合适的量表进行标准化评估</p>
      </div>
    </div>

    <!-- 量表选择区 -->
    <div class="main-content">
      <div class="scale-cards">
        <!-- S-M量表卡片 -->
        <el-card
          class="scale-card"
          shadow="hover"
          @click="selectScale('sm')"
        >
          <div class="scale-icon sm-icon">
            <el-icon size="60"><User /></el-icon>
          </div>
          <h3 class="scale-title">婴儿-初中生社会生活能力量表</h3>
          <p class="scale-subtitle">(S-M量表)</p>
          <div class="scale-info">
            <ul>
              <li>适用年龄：6个月 - 14岁</li>
              <li>题目数量：132道</li>
              <li>评估维度：交往、作业、运动能力、独立生活能力、自我管理、集体活动</li>
              <li>评估时间：约30-45分钟</li>
            </ul>
          </div>
          <el-button type="primary" size="large" class="scale-btn">
            开始评估
          </el-button>
        </el-card>

        <!-- WeeFIM量表卡片 -->
        <el-card
          class="scale-card"
          shadow="hover"
          @click="selectScale('weefim')"
        >
          <div class="scale-icon weefim-icon">
            <el-icon size="60"><Setting /></el-icon>
          </div>
          <h3 class="scale-title">改良儿童功能独立性评估量表</h3>
          <p class="scale-subtitle">(WeeFIM量表)</p>
          <div class="scale-info">
            <ul>
              <li>适用年龄：0 - 18岁</li>
              <li>题目数量：18道</li>
              <li>评估领域：日常生活活动（13题）、认知功能（5题）</li>
              <li>评估时间：约15-20分钟</li>
            </ul>
          </div>
          <el-button type="success" size="large" class="scale-btn">
            开始评估
          </el-button>
        </el-card>

        <!-- CSIRS量表卡片 -->
        <el-card
          class="scale-card csirs-card"
          shadow="hover"
          @click="selectScale('csirs')"
        >
          <div class="scale-icon csirs-icon">
            <el-icon size="60"><Sunny /></el-icon>
          </div>
          <h3 class="scale-title">儿童感觉统合能力发展评定量表</h3>
          <p class="scale-subtitle">(CSIRS量表)</p>
          <div class="scale-info">
            <ul>
              <li>适用年龄：3 - 12岁</li>
              <li>题目数量：58道</li>
              <li>评估维度：前庭觉、触觉、本体感、学习能力、执行功能</li>
              <li>评估时间：约15-20分钟</li>
            </ul>
          </div>
          <el-button type="warning" size="large" class="scale-btn">
            开始评估
          </el-button>
        </el-card>

        <!-- Conners PSQ量表卡片 -->
        <el-card
          class="scale-card conners-psq-card"
          shadow="hover"
          @click="selectScale('conners-psq')"
        >
          <div class="scale-icon conners-psq-icon">
            <el-icon size="60"><HomeFilled /></el-icon>
          </div>
          <h3 class="scale-title">Conners 父母用问卷</h3>
          <p class="scale-subtitle">(PSQ量表)</p>
          <div class="scale-info">
            <ul>
              <li>适用年龄：3 - 17岁</li>
              <li>题目数量：48道</li>
              <li>评估维度：品行问题、学习问题、冲动性、焦虑、多动指数</li>
              <li>评估时间：约10-15分钟</li>
            </ul>
          </div>
          <el-button type="danger" size="large" class="scale-btn">
            开始评估
          </el-button>
        </el-card>

        <!-- Conners TRS量表卡片 -->
        <el-card
          class="scale-card conners-trs-card"
          shadow="hover"
          @click="selectScale('conners-trs')"
        >
          <div class="scale-icon conners-trs-icon">
            <el-icon size="60"><OfficeBuilding /></el-icon>
          </div>
          <h3 class="scale-title">Conners 教师用问卷</h3>
          <p class="scale-subtitle">(TRS量表)</p>
          <div class="scale-info">
            <ul>
              <li>适用年龄：3 - 17岁</li>
              <li>题目数量：28道</li>
              <li>评估维度：品行问题、多动、注意力缺陷、多动指数</li>
              <li>评估时间：约5-10分钟</li>
            </ul>
          </div>
          <el-button type="info" size="large" class="scale-btn">
            开始评估
          </el-button>
        </el-card>
      </div>

      <!-- 评估说明 -->
      <el-card class="notice-card">
        <template #header>
          <div class="notice-header">
            <el-icon><InfoFilled /></el-icon>
            <span>评估说明</span>
          </div>
        </template>
        <div class="notice-content">
          <h4>注意事项：</h4>
          <ol>
            <li>请确保评估环境安静、舒适，避免干扰</li>
            <li>评估前请准备好学生的基本信息（姓名、年龄等）</li>
            <li>根据学生的实际情况如实作答，不要主观臆断</li>
            <li>如果需要中途退出，系统会自动保存评估进度</li>
            <li>评估完成后，系统将自动生成评估报告</li>
          </ol>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Setting, Sunny, InfoFilled, HomeFilled, OfficeBuilding } from '@element-plus/icons-vue'

const router = useRouter()

// 选择量表
const selectScale = (scaleType: 'sm' | 'weefim' | 'csirs' | 'conners-psq' | 'conners-trs') => {
  // 跳转到学生选择页面，传递量表类型参数
  router.push({
    path: '/assessment/select-student',
    query: { scale: scaleType }
  })
}
</script>

<style scoped>
/* 量表卡片网格 */
.scale-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px;
  margin-bottom: 30px;
}

.scale-card {
  cursor: pointer;
  transition: transform 0.3s;
  text-align: center;
  padding: 30px;
}

.scale-card:hover {
  transform: translateY(-5px);
}

.scale-icon {
  margin: 0 auto 20px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sm-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.weefim-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.csirs-icon {
  background: linear-gradient(135deg, #FF6B6B 0%, #FFD93D 100%);
  color: white;
}

.conners-psq-icon {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: white;
}

.conners-trs-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.scale-title {
  margin: 0 0 10px 0;
  font-size: 24px;
  color: #303133;
}

.scale-subtitle {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #909399;
}

.scale-info {
  text-align: left;
  margin-bottom: 30px;
}

.scale-info ul {
  list-style: none;
  padding: 0;
}

.scale-info li {
  padding: 8px 0;
  color: #606266;
  position: relative;
  padding-left: 20px;
}

.scale-info li:before {
  content: '•';
  color: #409eff;
  font-weight: bold;
  position: absolute;
  left: 0;
}

.scale-btn {
  width: 200px;
  height: 50px;
  font-size: 18px;
}

.notice-card {
  margin-top: 40px;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #409eff;
}

.notice-content h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.notice-content ol {
  padding-left: 20px;
}

.notice-content li {
  padding: 5px 0;
  color: #606266;
}
</style>