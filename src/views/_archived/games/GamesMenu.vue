<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>感官训练</h1>
        <p class="subtitle">通过科学设计的游戏训练，提升学生感知能力</p>
      </div>
      <div class="header-right">
        <el-button type="primary" size="large" @click="goToRecords">
          <i class="fas fa-chart-line"></i> 训练记录
        </el-button>
      </div>
    </div>

    <!-- 训练分类 -->
    <div class="category-section">
      <div class="category-header">
        <div class="category-icon visual">
          <i class="fas fa-eye"></i>
        </div>
        <h2>视觉训练</h2>
      </div>
      <div class="games-grid">
        <div
          v-for="game in visualGames"
          :key="game.id"
          class="game-card"
          @click="startGame(game)"
        >
          <div class="game-icon" :style="{ background: game.color }">
            <span class="game-emoji">{{ game.emoji }}</span>
          </div>
          <div class="game-info">
            <h3>{{ game.name }}</h3>
            <p>{{ game.description }}</p>
            <div class="game-meta">
              <span class="difficulty">
                <i class="fas fa-star"></i> {{ game.difficulty }}
              </span>
              <span class="duration">
                <i class="fas fa-clock"></i> {{ game.duration }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 听觉训练 -->
    <div class="category-section">
      <div class="category-header">
        <div class="category-icon audio">
          <i class="fas fa-headphones"></i>
        </div>
        <h2>听觉训练</h2>
      </div>
      <div class="games-grid">
        <div
          v-for="game in audioGames"
          :key="game.id"
          class="game-card"
          @click="startGame(game)"
        >
          <div class="game-icon" :style="{ background: game.color }">
            <span class="game-emoji">{{ game.emoji }}</span>
          </div>
          <div class="game-info">
            <h3>{{ game.name }}</h3>
            <p>{{ game.description }}</p>
            <div class="game-meta">
              <span class="difficulty">
                <i class="fas fa-star"></i> {{ game.difficulty }}
              </span>
              <span class="duration">
                <i class="fas fa-clock"></i> {{ game.duration }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { TaskID } from '@/types/games'

const router = useRouter()

// 游戏列表
const visualGames = [
  {
    id: TaskID.COLOR_MATCH,
    name: '颜色配对',
    description: '识别和匹配不同颜色，提升视觉辨别能力',
    emoji: '🎨',
    color: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
    difficulty: '简单',
    duration: '3-5分钟',
    mode: 'color'
  },
  {
    id: TaskID.SHAPE_MATCH,
    name: '形状识别',
    description: '识别基本几何形状，提升图形认知',
    emoji: '🔷',
    color: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
    difficulty: '简单',
    duration: '3-5分钟',
    mode: 'shape'
  },
  {
    id: TaskID.ICON_MATCH,
    name: '物品配对',
    description: '识别日常物品，提升视觉联想能力',
    emoji: '🍎',
    color: 'linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%)',
    difficulty: '中等',
    duration: '3-5分钟',
    mode: 'icon'
  },
  {
    id: TaskID.VISUAL_TRACK,
    name: '视觉追踪',
    description: '追踪移动目标，训练视觉注意力和平滑 pursuit',
    emoji: '🎯',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    difficulty: '中等',
    duration: '1分钟',
    mode: 'track'
  }
]

const audioGames = [
  {
    id: TaskID.AUDIO_DIFF,
    name: '声音辨别',
    description: '辨别不同音调，提升听觉敏锐度',
    emoji: '🔊',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    difficulty: '简单',
    duration: '3-5分钟',
    mode: 'diff'
  },
  {
    id: TaskID.AUDIO_COMMAND,
    name: '听指令做动作',
    description: '根据语音指令选择正确选项，训练听觉理解',
    emoji: '🎧',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    difficulty: '中等',
    duration: '3-5分钟',
    mode: 'command'
  },
  {
    id: TaskID.AUDIO_RHYTHM,
    name: '节奏模仿',
    description: '听节奏并模仿拍打，训练听觉序列记忆',
    emoji: '🎵',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    difficulty: '困难',
    duration: '3-5分钟',
    mode: 'rhythm'
  }
]

// 跳转到训练记录
const goToRecords = () => {
  router.push('/games/records')
}

// 开始游戏 - 跳转到选择学生页面
const startGame = (game: any) => {
  router.push({
    path: '/games/select-student',
    query: {
      taskId: game.id.toString(),
      mode: game.mode
    }
  })
}
</script>

<style scoped>
/* 训练分类 */
.category-section {
  margin-bottom: 50px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}

.category-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.category-icon.visual {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.category-icon.audio {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.category-header h2 {
  font-size: 24px;
  color: #333;
  margin: 0;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.game-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
}

.game-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.game-icon {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.game-emoji {
  font-size: 64px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.game-info {
  padding: 20px;
}

.game-info h3 {
  font-size: 20px;
  color: #333;
  margin: 0 0 8px 0;
}

.game-info p {
  font-size: 14px;
  color: #666;
  margin: 0 0 15px 0;
  line-height: 1.5;
}

.game-meta {
  display: flex;
  gap: 15px;
}

.game-meta span {
  font-size: 13px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 响应式 */
@media (max-width: 768px) {
  .games-grid {
    grid-template-columns: 1fr;
  }
}
</style>
