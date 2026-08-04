<template>
  <div class="layout-container" :class="{ 'is-immersive': isImmersiveRoute }">
    <!-- 侧边栏 -->
    <div v-if="!isImmersiveRoute" class="sidebar" :class="{ collapsed: sidebarCollapsed }">
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

      <nav class="sidebar-nav" aria-label="主导航">
        <section
          v-for="group in menuGroups"
          :key="group.id"
          class="nav-group"
          :aria-label="sidebarCollapsed ? group.title : undefined"
          :aria-labelledby="sidebarCollapsed ? undefined : `nav-group-${group.id}`"
        >
          <h3
            v-show="!sidebarCollapsed"
            :id="`nav-group-${group.id}`"
            class="nav-group-title"
          >
            {{ group.title }}
          </h3>

          <a
            v-for="menuItem in group.items"
            :key="menuItem.path"
            :href="menuItem.path"
            class="nav-item"
            :class="{ active: isActive(menuItem.path) }"
            :title="menuItem.meta.displayTitle"
            :aria-current="isActive(menuItem.path) ? 'page' : undefined"
            @click.prevent="handleMenuClick(menuItem)"
          >
            <i class="icon" :class="`fas fa-${menuItem.meta.icon}`" aria-hidden="true"></i>
            <span v-show="!sidebarCollapsed" class="nav-text">
              {{ menuItem.meta.displayTitle }}
            </span>
          </a>
        </section>
      </nav>

    </div>

    <!-- 主内容区 -->
    <div class="main-container" :class="{ 'is-immersive': isImmersiveRoute }">
      <!-- 顶部栏 -->
      <header v-if="!isImmersiveRoute" class="header">
        <div class="header-left">
          <button class="toggle-btn" @click="toggleSidebar">
            <i class="fas fa-bars"></i>
          </button>
          <h1>{{ pageTitle }}</h1>
        </div>

        <div class="header-right">
          <el-dropdown
            trigger="click"
            placement="bottom-end"
            popper-class="user-menu-dropdown"
            @command="handleUserMenuCommand"
          >
            <button
              type="button"
              class="user-menu-trigger"
              title="打开用户菜单"
              aria-label="打开用户菜单"
            >
              <span class="user-avatar" :class="{ 'has-image': currentUserAvatarUrl }">
                <img v-if="currentUserAvatarUrl" :src="currentUserAvatarUrl" :alt="`${authStore.user?.name || '当前用户'}头像`" />
                <span v-else>{{ currentUserInitial }}</span>
              </span>
              <span class="user-info">
                <span class="user-name">{{ authStore.user?.name }}</span>
                <span class="user-role">{{ getRoleName(authStore.user?.role) }}</span>
              </span>
              <i class="fas fa-angle-down user-menu-chevron" aria-hidden="true"></i>
            </button>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item class="user-menu-dropdown-item" command="profile">
                  <i class="fas fa-user user-menu-item-icon" aria-hidden="true"></i>
                  <span>个人资料</span>
                </el-dropdown-item>
                <el-dropdown-item class="user-menu-dropdown-item" command="ai-chat-history">
                  <i class="fas fa-comments user-menu-item-icon" aria-hidden="true"></i>
                  <span>AI 聊天记录</span>
                </el-dropdown-item>
                <el-dropdown-item
                  class="user-menu-dropdown-item user-menu-logout-item"
                  command="logout"
                  divided
                >
                  <i
                    class="fas fa-right-from-bracket user-menu-item-icon"
                    aria-hidden="true"
                  ></i>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <div class="activation-status">
            <span class="status-dot" :class="{ active: authStore.isActivated }"></span>
            <span>{{ getActivationText() }}</span>
          </div>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="content" :class="{ 'is-immersive': isImmersiveRoute }">
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
import { useRoute, useRouter, type RouteRecordNormalized } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useSystemConfigStore } from '@/stores/systemConfig'
import { performConfirmedLogout } from '@/utils/auth-ui'
import { resolveAvatarUrl } from '@/utils/avatar-presets'
import { ModuleRegistry } from '@/core/module-registry'
import type { ModuleFeature } from '@/types/module'
import {
  filterVisibleAccessControlledItems,
  type AccessControlledItem,
  type AccessScope,
} from '@/utils/access-visibility'

interface MenuRouteItem extends AccessControlledItem {
  path: string
  meta: {
    displayTitle: string
    icon: string
    roles?: string[]
  }
}

interface MenuGroup {
  id: string
  title: string
  items: MenuRouteItem[]
}

interface MenuItemConfig {
  routeName: string
  displayTitle: string
  icon: string
  moduleManaged?: boolean
}

interface MenuGroupConfig {
  id: string
  title: string
  items: readonly MenuItemConfig[]
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const systemConfigStore = useSystemConfigStore()

const sidebarCollapsed = ref(false)
const currentUserAvatarUrl = computed(() => resolveAvatarUrl(authStore.user?.avatar_path))
const currentUserInitial = computed(() => authStore.user?.name?.trim().charAt(0).toUpperCase() || '?')

const menuGroupConfigs: readonly MenuGroupConfig[] = [
  {
    id: 'overview',
    title: '概览',
    items: [
      { routeName: 'Dashboard', displayTitle: '系统首页', icon: 'house' },
    ],
  },
  {
    id: 'students-and-classes',
    title: '学生与班级',
    items: [
      { routeName: 'Students', displayTitle: '学生管理', icon: 'user-graduate' },
      { routeName: 'ClassManagement', displayTitle: '班级管理', icon: 'school' },
      { routeName: 'StudentClassAssignment', displayTitle: '学生分班', icon: 'users' },
    ],
  },
  {
    id: 'training-and-assessment',
    title: '训练与评估',
    items: [
      // 系统级条目（手写固定）
      { routeName: 'Assessment', displayTitle: '能力评估', icon: 'clipboard-check' },
      { routeName: 'TrainingPlan', displayTitle: '训练计划', icon: 'calendar-check' },
      // 模块条目由 buildModuleMenuItems() 动态生成，不在此手写
    ],
  },
  {
    id: 'records-and-system',
    title: '记录与系统',
    items: [
      // 系统级条目（手写固定，顺序即侧栏显示顺序）
      { routeName: 'TrainingRecordsModule', displayTitle: '训练记录', icon: 'clock-rotate-left', moduleManaged: true },
      { routeName: 'Reports', displayTitle: '报告生成', icon: 'file-lines' },
      { routeName: 'ResourceCenter', displayTitle: '资源管理', icon: 'folder-open', moduleManaged: true },
      { routeName: 'System', displayTitle: '系统管理', icon: 'gear' },
    ],
  },
]

/**
 * 从 ModuleRegistry 动态生成模块级别的菜单条目，按分组返回。
 *
 * - 模块自有入口：模块设置了 menuRouteName + menuGroup + status==='active'，归入对应分组
 * - 共享功能入口：若任意活跃模块的 features 中某 feature 的 routeName 不为空且
 *   feature.status==='active'，则在对应菜单组中显示该共享入口
 */
function buildModuleMenuItems(): Map<string, MenuItemConfig[]> {
  const activeModules = ModuleRegistry.getActiveModules()
  const result = new Map<string, MenuItemConfig[]>()
  const registeredRouteNames = new Set<string>()

  const addToGroup = (groupId: string, item: MenuItemConfig) => {
    if (!result.has(groupId)) result.set(groupId, [])
    result.get(groupId)!.push(item)
  }

  // 1. 模块自有菜单入口
  for (const mod of activeModules) {
    if (mod.menuRouteName && mod.menuGroup && mod.menuIcon) {
      addToGroup(mod.menuGroup, {
        routeName: mod.menuRouteName,
        displayTitle: mod.name,
        icon: mod.menuIcon,
      })
      registeredRouteNames.add(mod.menuRouteName)
    }
  }

  // 2. 共享功能入口
  const sharedFeatureConfigs: Array<{ featureCode: string; routeName: string; displayTitle: string; icon: string; groupId: string }> = [
    { featureCode: 'games', routeName: 'GameTraining', displayTitle: '游戏训练', icon: 'gamepad', groupId: 'training-and-assessment' },
    { featureCode: 'equipment', routeName: 'EquipmentTraining', displayTitle: '器材训练', icon: 'dumbbell', groupId: 'training-and-assessment' },
    { featureCode: 'training_records', routeName: 'TrainingRecordsModule', displayTitle: '训练记录', icon: 'clock-rotate-left', groupId: 'records-and-system' },
  ]

  for (const cfg of sharedFeatureConfigs) {
    if (registeredRouteNames.has(cfg.routeName)) continue
    const anyActive = activeModules.some((mod) => {
      const feat = mod.features.find((f: ModuleFeature) => f.code === cfg.featureCode)
      return feat && feat.status === 'active'
    })
    if (anyActive) {
      addToGroup(cfg.groupId, {
        routeName: cfg.routeName,
        displayTitle: cfg.displayTitle,
        icon: cfg.icon,
      })
    }
  }

  return result
}

const hasRole = (roles?: string[]) => {
  if (!roles || roles.length === 0) return true
  return roles.includes(authStore.user?.role || '')
}

const createMenuRouteItem = (
  menuRoute: RouteRecordNormalized,
  itemConfig: MenuItemConfig,
): MenuRouteItem => {
  const moduleCode = typeof menuRoute.meta.moduleCode === 'string'
    ? menuRoute.meta.moduleCode
    : undefined
  const entitlementCode = typeof menuRoute.meta.requiredEntitlement === 'string'
    ? menuRoute.meta.requiredEntitlement
    : undefined
  const entitlementCodes = Array.isArray(menuRoute.meta.requiredEntitlementsAnyOf)
    ? menuRoute.meta.requiredEntitlementsAnyOf.filter(
      (value): value is string => typeof value === 'string',
    )
    : undefined

  return {
    path: menuRoute.path,
    accessScope: (
      entitlementCodes
        ? 'entitlement-any'
        : entitlementCode
          ? 'entitlement'
          : moduleCode
            ? 'module'
            : 'global'
    ) as AccessScope,
    moduleCode,
    entitlementCode,
    entitlementCodes,
    meta: {
      displayTitle: itemConfig.displayTitle,
      icon: itemConfig.icon,
      roles: Array.isArray(menuRoute.meta.roles) ? menuRoute.meta.roles as string[] : undefined,
    },
  }
}

const menuGroups = computed<MenuGroup[]>(() => {
  const routes = router
    .getRoutes()
    .filter((r) => r.meta?.title && !r.meta?.hideInMenu && r.path !== '/')
  const routesByName = new Map(routes.map((menuRoute) => [String(menuRoute.name || ''), menuRoute]))

  // 从 ModuleRegistry 动态生成模块菜单条目，按分组索引
  const moduleItemsByGroup = buildModuleMenuItems()

  return menuGroupConfigs.map((group) => {
    // 系统级条目
    const systemItems = group.items
    // 模块级条目（注册表动态生成）
    const moduleItems = moduleItemsByGroup.get(group.id) ?? []
    const moduleItemsByRouteName = new Map(moduleItems.map((item) => [item.routeName, item]))
    // 固定入口只负责稳定排序；若入口由模块提供，则必须先通过注册表准入。
    const orderedSystemItems = systemItems.flatMap((item) => {
      const admittedModuleItem = moduleItemsByRouteName.get(item.routeName)
      if (admittedModuleItem) return [admittedModuleItem]
      return item.moduleManaged ? [] : [item]
    })
    const fixedRouteNames = new Set(systemItems.map((item) => item.routeName))
    const additionalModuleItems = moduleItems.filter((item) => !fixedRouteNames.has(item.routeName))

    return {
      id: group.id,
      title: group.title,
      items: [...orderedSystemItems, ...additionalModuleItems].flatMap((itemConfig) => {
        const menuRoute = routesByName.get(itemConfig.routeName)
        if (!menuRoute) return []

        const item = createMenuRouteItem(menuRoute, itemConfig)

        const hasAccess = filterVisibleAccessControlledItems(
          [item],
          authStore.hasModuleAccess,
          authStore.hasEntitlementAccess,
        ).length > 0

        return hasAccess && hasRole(item.meta.roles) ? [item] : []
      }),
    }
  }).filter((group) => group.items.length > 0)
})

// 页面标题
const pageTitle = computed(() => {
  // 首页显示系统名称
  if (route.name === 'Dashboard') {
    return systemConfigStore.systemName || '感官综合训练与评估'
  }
  return route.meta.title || '感官综合训练与评估'
})

const isImmersiveRoute = computed(() => route.meta.immersiveShell === true)

// 判断是否激活
const isActive = (path: string) => {
  const activeMenu = typeof route.meta.activeMenu === 'string' ? route.meta.activeMenu : ''
  if (activeMenu) {
    return path === activeMenu
  }

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

const handleMenuClick = (route: MenuRouteItem) => {
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
const handleLogout = async () => {
  try {
    await performConfirmedLogout({
      confirm: () => ElMessageBox.confirm('确定要退出系统吗？', '退出登录', {
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        type: 'warning',
        closeOnClickModal: false,
      }),
      logout: () => authStore.logout(),
      navigateToLogin: () => router.replace('/login'),
    })
  } catch (error) {
    console.error('退出登录失败:', error)
    ElMessage.error('退出失败，请重试。')
  }
}

const handleUserMenuCommand = (command: string | number | object) => {
  if (command === 'profile') {
    router.push('/profile')
    return
  }

  if (command === 'ai-chat-history') {
    router.push({ name: 'AiChatHistory' })
    return
  }

  if (command === 'logout') {
    void handleLogout()
  }
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

.layout-container.is-immersive {
  background: #000;
}

.sidebar {
  width: 252px;
  background: #111827;
  color: #e5edf8;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: 8px 0 24px rgba(15, 23, 42, 0.08);
  transition: width 0.25s ease;
  position: relative;
  z-index: 100;
}

.sidebar.collapsed {
  width: 72px;
}

.sidebar-logo {
  padding: 18px 20px 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0d1525;
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
  padding: 14px 20px 18px;
  text-align: center;
  background: #0d1525;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.sidebar-header h2 {
  margin: 0;
  color: #e5edf8;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}

.sidebar-nav {
  flex: 1;
  padding: 14px 0;
  overflow-y: auto;
  scrollbar-color: rgba(148, 163, 184, 0.28) transparent;
  scrollbar-width: thin;
}

.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.28);
  border-radius: 3px;
}

.nav-group {
  margin-bottom: 16px;
}

.nav-group:last-child {
  margin-bottom: 0;
}

.nav-group-title {
  margin: 0;
  padding: 0 26px 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  letter-spacing: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  min-height: 52px;
  margin: 2px 10px;
  padding: 0 16px;
  box-sizing: border-box;
  gap: 14px;
  color: #9aa8bc;
  text-decoration: none;
  border-left: 3px solid transparent;
  border-radius: 6px;
  touch-action: manipulation;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.12s ease;
  position: relative;
}

.nav-item.active {
  border-left-color: #38bdf8;
  background: linear-gradient(
    90deg,
    rgba(14, 165, 233, 0.32) 0%,
    rgba(14, 165, 233, 0.18) 52%,
    rgba(14, 165, 233, 0.07) 82%,
    rgba(14, 165, 233, 0) 100%
  );
  color: #f8fafc;
}

.nav-item.active .icon {
  color: #7dd3fc;
}

.nav-item:active {
  transform: scale(0.98);
}

.nav-item .icon {
  width: 20px;
  flex: 0 0 20px;
  text-align: center;
  font-size: 16px;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  margin-right: 8px;
  margin-left: 8px;
  padding-right: 0;
  padding-left: 0;
  gap: 0;
}

@media (hover: hover) {
  .nav-item:hover {
    background: rgba(148, 163, 184, 0.1);
    color: #dbe7f5;
  }

  .nav-item.active:hover {
    background: linear-gradient(
      90deg,
      rgba(14, 165, 233, 0.38) 0%,
      rgba(14, 165, 233, 0.22) 52%,
      rgba(14, 165, 233, 0.09) 82%,
      rgba(14, 165, 233, 0) 100%
    );
  }
}

.nav-text {
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.3s;
}

.nav-item:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-container.is-immersive {
  min-width: 0;
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

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 6px 12px;
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  transition: background 0.2s ease;
}

.user-menu-trigger:hover {
  background: #f0f0f0;
}

.user-menu-trigger:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: #edf4ff;
  color: #486a93;
  font-size: 14px;
  font-weight: 700;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.user-name {
  font-weight: 500;
  color: #333;
}

.user-role {
  font-size: 12px;
  color: #666;
}

.user-menu-chevron {
  color: #64748b;
  font-size: 13px;
}

:global(.user-menu-dropdown .user-menu-item-icon) {
  width: 18px;
  margin-right: 8px;
  text-align: center;
}

:global(.user-menu-dropdown .user-menu-dropdown-item) {
  min-height: 44px;
  padding: 0 16px;
}

:global(.user-menu-dropdown .user-menu-logout-item) {
  --el-dropdown-menuItem-hover-color: #b91c1c;
  --el-dropdown-menuItem-hover-fill: #fef2f2;
  color: #dc2626 !important;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

:global(.user-menu-dropdown .user-menu-logout-item .user-menu-item-icon),
:global(.user-menu-dropdown .user-menu-logout-item span) {
  color: inherit !important;
}

:global(.user-menu-dropdown .user-menu-logout-item:not(.is-disabled):hover),
:global(.user-menu-dropdown .user-menu-logout-item:not(.is-disabled):focus) {
  background-color: #fef2f2 !important;
  color: #b91c1c !important;
}

:global(.user-menu-dropdown .user-menu-logout-item:not(.is-disabled):active) {
  background-color: #fee2e2 !important;
  color: #991b1b !important;
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

.content.is-immersive {
  padding: 0;
  overflow: hidden;
  background: #000;
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
