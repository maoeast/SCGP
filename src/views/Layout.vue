<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- Logo 区域 -->
      <div class="sidebar-logo">
        <img :src="systemConfigStore.displayLogoPath" alt="Logo" />
      </div>

      <div class="sidebar-header">
        <h2 v-show="!sidebarCollapsed">
          {{ systemConfigStore.systemName || '感官综合训练与评估' }}
        </h2>
        <h2 v-show="sidebarCollapsed">ATS</h2>
      </div>

      <nav class="sidebar-nav">
        <a
          v-for="route in menuRoutes"
          :key="route.path"
          :href="route.path"
          class="nav-item"
          :class="{ active: isActive(route.path), locked: isRouteLocked(route) }"
          :title="isRouteLocked(route) ? '该模块未授权，请联系厂商购买' : route.meta.title"
          @click.prevent="handleMenuClick(route)"
          v-show="hasRole(route.meta.roles)"
        >
          <i class="icon" :class="`fas fa-${route.meta.icon}`"></i>
          <span class="nav-text" v-show="!sidebarCollapsed">{{
            route.meta.displayTitle || route.meta.title
          }}</span>
          <span v-if="isRouteLocked(route)" class="lock-mark" aria-hidden="true">🔒</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">
          <i class="fas fa-right-from-bracket"></i>
          <span v-show="!sidebarCollapsed">退出</span>
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-container">
      <!-- 顶部栏 -->
      <header class="header">
        <div class="header-left">
          <button class="toggle-btn" @click="toggleSidebar">
            <i class="fas fa-bars"></i>
          </button>
          <h1>{{ pageTitle }}</h1>
        </div>

        <div class="header-right">
          <div class="user-info" @click="goToProfile" title="点击查看个人资料">
            <span class="user-name">{{ authStore.user?.name }}</span>
            <span class="user-role">{{ getRoleName(authStore.user?.role) }}</span>
          </div>
          <div class="activation-status">
            <span class="status-dot" :class="{ active: authStore.isActivated }"></span>
            <span>{{ getActivationText() }}</span>
          </div>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useSystemConfigStore } from '@/stores/systemConfig'

interface MenuRouteItem {
  path: string
  meta: {
    title: string
    displayTitle: string
    icon?: string
    roles?: string[]
    moduleCode?: string
  }
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const systemConfigStore = useSystemConfigStore()

const sidebarCollapsed = ref(false)

// 菜单路由
const menuRoutes = computed<MenuRouteItem[]>(() => {
  const routes = router
    .getRoutes()
    .filter((r) => r.meta?.title && !r.meta?.hideInMenu && r.path !== '/')

  // 指定的菜单顺序
  const menuOrder = [
    'Dashboard', // 系统首页
    'Students', // 学生管理
    'ClassManagement', // 班级管理
    'StudentClassAssignment', // 学生分班
    'Assessment', // 能力评估
    'TrainingPlan', // 训练计划
    'EmotionalTraining', // 情绪行为
    'GameTraining', // 游戏训练
    'EquipmentTraining', // 器材训练
    'TrainingRecordsModule', // 训练记录
    'Reports', // 报告生成
    'ResourceCenter', // 资源中心
    'System', // 系统管理
  ]

  return routes
    .sort((a, b) => {
      const indexA = menuOrder.indexOf(a.name as string)
      const indexB = menuOrder.indexOf(b.name as string)
      const orderA = indexA === -1 ? 999 : indexA
      const orderB = indexB === -1 ? 999 : indexB
      return orderA - orderB
    })
    .map((r) => ({
      path: r.path,
      meta: {
        title: String(r.meta.title || ''),
        displayTitle: String(r.meta.title || ''),
        icon: typeof r.meta.icon === 'string' ? r.meta.icon : undefined,
        roles: Array.isArray(r.meta.roles) ? r.meta.roles as string[] : undefined,
        moduleCode: typeof r.meta.moduleCode === 'string' ? r.meta.moduleCode : undefined,
      },
    }))
})

// 页面标题
const pageTitle = computed(() => {
  // 首页显示系统名称
  if (route.name === 'Dashboard') {
    return systemConfigStore.systemName || '感官综合训练与评估'
  }
  return route.meta.title || '感官综合训练与评估'
})

// 判断是否激活
const isActive = (path: string) => {
  // 精确匹配
  if (path === route.path) return true
  // 首页特殊处理
  if (path === '/dashboard' && route.path === '/') return true
  // 子路由匹配：如果当前路由以菜单路径开头，则高亮该菜单
  if (route.path.startsWith(path + '/') || route.path.startsWith(path)) {
    // 排除根路径
    if (path !== '/' && path.length > 1) {
      return true
    }
  }
  return false
}

// 判断是否有权限
const hasRole = (roles?: string[]) => {
  if (!roles || roles.length === 0) return true
  return roles.includes(authStore.user?.role || '')
}

const isRouteLocked = (route: MenuRouteItem) => {
  if (!route.meta.moduleCode) return false
  return !authStore.hasModuleAccess(route.meta.moduleCode)
}

const handleMenuClick = (route: MenuRouteItem) => {
  if (isRouteLocked(route)) {
    ElMessage.warning('该模块未授权，请联系厂商购买')
    return
  }
  router.push(route.path)
}

// 获取角色名称
const getRoleName = (role?: string) => {
  const roleMap: Record<string, string> = {
    admin: '管理员',
    teacher: '教师',
  }
  return roleMap[role || ''] || ''
}

// 获取激活状态文本
const getActivationText = () => {
  // 如果已激活
  if (authStore.activationInfo.isActivated) {
    if (authStore.activationInfo.expiresAt) {
      const expireDate = new Date(authStore.activationInfo.expiresAt)
      const now = new Date()
      const daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      return `已激活（剩余${daysLeft}天）`
    }
    return '已激活'
  }
  return '未激活'
}

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 退出登录
const handleLogout = () => {
  if (confirm('确定要退出系统吗？')) {
    authStore.logout()
    router.push('/login')
  }
}

// 跳转到个人资料页面
const goToProfile = () => {
  router.push('/profile')
}

onMounted(() => {
  // 检查激活状态
  if (!authStore.isActivated && route.name !== 'Activation') {
    router.push('/activation')
  }
  // 加载系统配置
  systemConfigStore.loadConfig()
})
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 250px;
  background: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  position: relative;
  z-index: 100;
}

.sidebar.collapsed {
  width: 70px;
}

.sidebar-logo {
  padding: 15px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #34495e;
  min-height: auto;
}

.sidebar-logo img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
  width: 200px;
}

.sidebar.collapsed .sidebar-logo img {
  max-width: 40px;
  height: auto;
}

.sidebar-header {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #34495e;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 15px 25px;
  color: #bdc3c7;
  text-decoration: none;
  transition: all 0.3s;
  position: relative;
}

.nav-item:hover {
  background: #34495e;
  color: white;
}

.nav-item.active {
  background: #3498db;
  color: white;
}

.nav-item.locked {
  color: #7f8c8d;
  background: rgba(255, 255, 255, 0.04);
}

.nav-item.locked:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #d5dbdb;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #2980b9;
}

.nav-item .icon {
  width: 20px;
  text-align: center;
  margin-right: 15px;
}

.collapsed .nav-item .icon {
  margin-right: 0;
}

.nav-text {
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.3s;
}

.lock-mark {
  margin-left: auto;
  font-size: 14px;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #34495e;
}

.logout-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 1px solid #e74c3c;
  color: #e74c3c;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #e74c3c;
  color: white;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 50;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.toggle-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.3s;
}

.toggle-btn:hover {
  background: #f0f0f0;
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.3s;
}

.user-info:hover {
  background: #f0f0f0;
}

.user-name {
  font-weight: 500;
  color: #333;
}

.user-role {
  font-size: 12px;
  color: #666;
}

.activation-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8f9fa;
  border-radius: 20px;
  font-size: 14px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
}

.status-dot.active {
  background: #2ecc71;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 0.3s;
    z-index: 1000;
  }

  .sidebar.show {
    transform: translateX(0);
  }

  .main-container {
    margin-left: 0;
  }
}
</style>
