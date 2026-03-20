import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

// 路由懒加载
const Login = () => import('@/views/Login.vue')
const Layout = () => import('@/views/Layout.vue')
const Dashboard = () => import('@/views/Dashboard.vue')
const Students = () => import('@/views/Students.vue')
const Assessment = () => import('@/views/Assessment.vue')
const Resources = () => import('@/views/Resources.vue')
const Reports = () => import('@/views/Reports.vue')
const System = () => import('@/views/System.vue')
const Activation = () => import('@/views/Activation.vue')
const StudentDetail = () => import('@/views/StudentDetail.vue')
const Profile = () => import('@/views/Profile.vue')
const NotFound = () => import('@/views/NotFound.vue')
const SQLTest = () => import('@/views/SQLTest.vue')
const WeeFIMTest = () => import('@/views/WeeFIMTest.vue')
const ActivationAdmin = () => import('@/views/ActivationAdmin.vue')
const WorkerTest = () => import('@/views/devtools/WorkerTest.vue')
const SchemaMigration = () => import('@/views/devtools/SchemaMigration.vue')
const MigrationVerification = () => import('@/views/devtools/MigrationVerification.vue')
const ModuleDevTools = () => import('@/views/devtools/ModuleDevTools.vue')
const BenchmarkRunner = () => import('@/views/devtools/BenchmarkRunner.vue')
const ClassManagementTest = () => import('@/views/devtools/ClassManagementTest.vue')
const ClassSnapshotVerification = () => import('@/views/devtools/ClassSnapshotVerification.vue')
const ClassSnapshotTestLite = () => import('@/views/devtools/ClassSnapshotTestLite.vue')
const ClassManagement = () => import('@/views/admin/ClassManagement.vue')
const StudentClassAssignment = () => import('@/views/admin/StudentClassAssignment.vue')
const ResourceManager = () => import('@/views/admin/ResourceManager.vue')
const ResourceCenter = () => import('@/views/admin/ResourceCenter.vue')
const GameModuleMenu = () => import('@/views/games/GameModuleMenu.vue')
const GameSelectStudent = () => import('@/views/games/SelectStudent.vue')
const GameLobby = () => import('@/views/games/GameLobby.vue')
const GamePlay = () => import('@/views/games/GamePlay.vue')
const IEPReport = () => import('@/views/games/IEPReport.vue')
const TrainingRecords = () => import('@/views/games/TrainingRecords.vue')
const SensoryTrainingRecords = () => import('@/views/games/SensoryTrainingRecords.vue')
const EmotionalMenu = () => import('@/views/emotional/Menu.vue')
const EmotionalSceneSelector = () => import('@/views/emotional/SceneSelector.vue')
const EmotionSceneTraining = () => import('@/views/emotional/EmotionSceneTraining.vue')
const CareExpressionTraining = () => import('@/views/emotional/CareExpressionTraining.vue')
const EmotionalSessionSummary = () => import('@/views/emotional/SessionSummary.vue')
const EmotionalRecords = () => import('@/views/emotional/Records.vue')
const EmotionalReport = () => import('@/views/emotional/Report.vue')
const BalloonBreathingPage = () => import('@/views/emotional/games/BalloonBreathingPage.vue')
const VoiceVolumeForestPage = () => import('@/views/emotional/games/VoiceVolumeForestPage.vue')

// 训练记录模块（Phase 4.6 重构）
const TrainingRecordsMenu = () => import('@/views/training-records/TrainingRecordsMenu.vue')
const ModuleTrainingRecords = () => import('@/views/training-records/ModuleTrainingRecords.vue')

// 训练计划模块
const PlanList = () => import('@/views/plan/PlanList.vue')

// 器材训练相关页面
const EquipmentMenu = () => import('@/views/equipment/EquipmentMenu.vue')
const EquipmentSelectStudent = () => import('@/views/equipment/SelectStudent.vue')
const EquipmentQuickEntry = () => import('@/views/equipment/QuickEntry.vue')
const EquipmentRecords = () => import('@/views/equipment/Records.vue')

// 评估相关页面
const AssessmentSelect = () => import('@/views/assessment/AssessmentSelect.vue')
const SelectStudent = () => import('@/views/assessment/SelectStudent.vue')
// 旧版评估页面已归档，保留报告页面
const SMReport = () => import('@/views/assessment/sm/Report.vue')
const WeeFIMReport = () => import('@/views/assessment/weefim/Report.vue')
const CSIRSReport = () => import('@/views/assessment/csirs/Report.vue')
const CSIRSHistory = () => import('@/views/assessment/csirs/History.vue')

// Conners 报告页面（评估页面已归档）
const ConnersPSQReport = () => import('@/views/assessment/conners-psq/Report.vue')
const ConnersTRSReport = () => import('@/views/assessment/conners-trs/Report.vue')

// SDQ 报告页面
const SDQReport = () => import('@/views/assessment/sdq/Report.vue')

// SRS-2 报告页面
const SRS2Report = () => import('@/views/assessment/srs2/Report.vue')

// CBCL 报告页面
const CBCLReport = () => import('@/views/assessment/cbcl/Report.vue')

// 通用评估容器（Phase 4 重构）
const AssessmentContainer = () => import('@/views/assessment/AssessmentContainer.vue')

// Electron 环境检测：在 Electron 中使用 HashRouter 避免 file:// 协议下的路由白屏问题
const processRef = typeof window !== 'undefined' ? ((window as any).process as { type?: string } | undefined) : undefined
const isElectron = !!processRef?.type
// 开发环境下也可以通过检查是否有 electronAPI 来判断
const isElectronEnv = !!(window as any).electronAPI || isElectron

const router = createRouter({
  // 在 Electron 环境使用 HashRouter，Web 环境使用 BrowserRouter
  // HashRouter 使用 #/ 格式的 URL，不依赖服务器配置，适合 Electron 的 file:// 协议
  history: isElectronEnv
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/activation'
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: {
        title: '登录',
        requiresAuth: false,
        hideInMenu: true
      }
    },
    {
      path: '/activation',
      name: 'Activation',
      component: Activation,
      meta: {
        title: '软件激活',
        requiresAuth: false,
        hideInMenu: true
      }
    },
    {
      path: '/',
      component: Layout,
      meta: {
        requiresAuth: true
      },
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: Dashboard,
          meta: {
            title: '系统首页',
            icon: 'house'
          }
        },
        {
          path: 'students',
          name: 'Students',
          component: Students,
          meta: {
            title: '学生管理',
            icon: 'user-graduate',
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'students/:id',
          name: 'StudentDetail',
          component: StudentDetail,
          meta: {
            title: '学生详情',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'profile',
          name: 'Profile',
          component: Profile,
          meta: {
            title: '个人资料',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'assessment',
          name: 'Assessment',
          component: AssessmentSelect,
          meta: {
            title: '能力评估',
            icon: 'clipboard-check',
            roles: ['admin', 'teacher'],
            moduleCode: 'sensory'
          }
        },
        {
          path: 'emotional',
          name: 'EmotionalTraining',
          redirect: '/emotional/menu',
          meta: {
            title: '情绪行为',
            icon: 'smile',
            roles: ['admin', 'teacher'],
            moduleCode: 'emotional'
          }
        },
        // ===== 游戏训练模块（顶级菜单，与器材训练模式一致） =====
        {
          path: 'emotional/menu',
          name: 'EmotionalMenu',
          component: EmotionalMenu,
          meta: {
            title: '情绪行为',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'emotional/emotion-scene/select',
          name: 'EmotionSceneSelector',
          component: EmotionalSceneSelector,
          meta: {
            title: '选择情绪场景',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'emotional/emotion-scene',
          name: 'EmotionSceneTraining',
          component: EmotionSceneTraining,
          meta: {
            title: '情绪与场景训练',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'emotional/care-expression/select',
          name: 'CareExpressionSelector',
          component: EmotionalSceneSelector,
          meta: {
            title: '选择关心情境',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'emotional/care-expression',
          name: 'CareExpressionTraining',
          component: CareExpressionTraining,
          meta: {
            title: '表达关心训练',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'emotional/session-summary',
          name: 'EmotionalSessionSummary',
          component: EmotionalSessionSummary,
          meta: {
            title: '情绪模块会话总结',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'emotional/records',
          name: 'EmotionalRecords',
          component: EmotionalRecords,
          meta: {
            title: '情绪模块训练记录',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'emotional/report',
          name: 'EmotionalReport',
          component: EmotionalReport,
          meta: {
            title: '情绪模块报告',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'emotional/games/balloon',
          name: 'BalloonBreathingGame',
          component: BalloonBreathingPage,
          meta: {
            title: '深呼吸热气球',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'emotional/games/forest',
          name: 'VoiceVolumeForestGame',
          component: VoiceVolumeForestPage,
          meta: {
            title: '音量魔法森林',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'games',
          name: 'GameTraining',
          redirect: '/games/menu',
          meta: {
            title: '游戏训练',
            icon: 'gamepad',
            roles: ['admin', 'teacher'],
            moduleCode: 'sensory'
          }
        },
        {
          path: 'games/menu',
          name: 'GameModuleMenu',
          component: GameModuleMenu,
          meta: {
            title: '游戏训练 - 选择模块',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'games/select-student',
          name: 'GameSelectStudent',
          component: GameSelectStudent,
          meta: {
            title: '选择学生 - 游戏训练',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'games/lobby/:studentId',
          name: 'GameLobby',
          component: GameLobby,
          meta: {
            title: '游戏大厅',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'games/play',
          name: 'GamePlay',
          component: GamePlay,
          meta: {
            title: '训练进行中',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        // 旧路由重定向到新的训练记录模块
        {
          path: 'games/records',
          redirect: '/training-records/menu'
        },
        // ===== 训练记录模块（Phase 4.6 重构） =====
        {
          path: 'training-records',
          name: 'TrainingRecordsModule',
          redirect: '/training-records/menu',
          meta: {
            title: '训练记录',
            icon: 'chart-line',
            roles: ['admin', 'teacher'],
            moduleCode: 'sensory'
          }
        },
        {
          path: 'training-records/menu',
          name: 'TrainingRecordsMenu',
          component: TrainingRecordsMenu,
          meta: {
            title: '训练记录 - 选择模块',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'training-records/:moduleCode',
          name: 'ModuleTrainingRecords',
          component: ModuleTrainingRecords,
          meta: {
            title: '模块训练记录',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        // 旧路由重定向（向后兼容）
        {
          path: 'games/records/sensory',
          redirect: '/training-records/sensory?type=game'
        },
        {
          path: 'training-records/equipment',
          redirect: '/training-records/sensory?type=equipment'
        },
        {
          path: 'games/report',
          name: 'IEPReport',
          component: IEPReport,
          meta: {
            title: 'IEP 评估报告',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        // ===== 器材训练模块（顶级菜单） =====
        {
          path: 'equipment',
          name: 'EquipmentTraining',
          redirect: '/equipment/menu',
          meta: {
            title: '器材训练',
            icon: 'dumbbell',
            roles: ['admin', 'teacher'],
            moduleCode: 'sensory'
          }
        },
        {
          path: 'equipment/menu',
          name: 'EquipmentMenu',
          component: EquipmentMenu,
          meta: {
            title: '器材训练 - 选择模块',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'equipment/select-student',
          name: 'EquipmentSelectStudent',
          component: EquipmentSelectStudent,
          meta: {
            title: '选择学生 - 器材训练',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'equipment/quick-entry/:studentId',
          name: 'EquipmentQuickEntry',
          component: EquipmentQuickEntry,
          meta: {
            title: '器材训练录入',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'equipment/records/:studentId?',
          name: 'EquipmentRecords',
          component: EquipmentRecords,
          meta: {
            title: '器材训练记录',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'assessment/select-student',
          name: 'SelectStudent',
          component: SelectStudent,
          meta: {
            title: '选择学生',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        // ===== 通用评估容器路由（Phase 4 重构） =====
        {
          path: 'assessment/unified/:scaleCode/:studentId',
          name: 'UnifiedAssessment',
          component: AssessmentContainer,
          meta: {
            title: '评估进行中',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        // ===== 旧版评估路由重定向（已归档） =====
        {
          path: 'assessment/sm/assessment/:studentId',
          redirect: (to: any) => `/assessment/unified/sm/${to.params.studentId}`
        },
        {
          path: 'assessment/weefim/assessment/:studentId',
          redirect: (to: any) => `/assessment/unified/weefim/${to.params.studentId}`
        },
        {
          path: 'assessment/csirs/:studentId',
          redirect: (to: any) => `/assessment/unified/csirs/${to.params.studentId}`
        },
        {
          path: 'assessment/conners-psq/:studentId',
          redirect: (to: any) => `/assessment/unified/conners-psq/${to.params.studentId}`
        },
        {
          path: 'assessment/conners-trs/:studentId',
          redirect: (to: any) => `/assessment/unified/conners-trs/${to.params.studentId}`
        },
        {
          path: 'assessment/sdq/:studentId',
          redirect: (to: any) => `/assessment/unified/sdq/${to.params.studentId}`
        },
        {
          path: 'assessment/srs2/:studentId',
          redirect: (to: any) => `/assessment/unified/srs2/${to.params.studentId}`
        },
        {
          path: 'assessment/cbcl/:studentId',
          redirect: (to: any) => `/assessment/unified/cbcl/${to.params.studentId}`
        },
        // ===== 报告页面（保留） =====
        {
          path: 'assessment/sm/report',
          name: 'SMReport',
          component: SMReport,
          meta: {
            title: 'S-M量表评估报告',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'assessment/weefim/report',
          name: 'WeeFIMReport',
          component: WeeFIMReport,
          meta: {
            title: 'WeeFIM量表评估报告',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'assessment/csirs/report/:assessId',
          name: 'CSIRSReport',
          component: CSIRSReport,
          meta: {
            title: 'CSIRS感觉统合评估报告',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'assessment/csirs/history/:studentId',
          name: 'CSIRSHistory',
          component: CSIRSHistory,
          meta: {
            title: 'CSIRS历史评估对比',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'assessment/conners-psq/report/:assessId',
          name: 'ConnersPSQReport',
          component: ConnersPSQReport,
          meta: {
            title: 'Conners父母问卷评估报告',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'assessment/conners-trs/report/:assessId',
          name: 'ConnersTRSReport',
          component: ConnersTRSReport,
          meta: {
            title: 'Conners教师问卷评估报告',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'assessment/sdq/report/:assessId',
          name: 'SDQReport',
          component: SDQReport,
          meta: {
            title: 'SDQ长处和困难问卷评估报告',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'assessment/srs2/report/:assessId',
          name: 'SRS2Report',
          component: SRS2Report,
          meta: {
            title: 'SRS-2社交反应量表评估报告',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'assessment/cbcl/report/:assessId',
          name: 'CBCLReport',
          component: CBCLReport,
          meta: {
            title: 'CBCL儿童行为量表评估报告',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'reports',
          name: 'Reports',
          component: Reports,
          meta: {
            title: '报告生成',
            icon: 'chart-column',
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'resources',
          name: 'Resources',
          redirect: '/resource-center',
          meta: {
            title: '资料库',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'resource-center',
          name: 'ResourceCenter',
          component: ResourceCenter,
          meta: {
            title: '资源中心',
            icon: 'folder-open',
            roles: ['admin', 'teacher']
          }
        },
        // ===== 训练计划模块（顶级菜单） =====
        {
          path: 'training-plan',
          name: 'TrainingPlan',
          component: PlanList,
          meta: {
            title: '训练计划',
            icon: 'calendar-check',
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'system',
          name: 'System',
          component: System,
          meta: {
            title: '系统管理',
            icon: 'gear',
            roles: ['admin']
          }
        },
        {
          path: 'sql-test',
          name: 'SQLTest',
          component: SQLTest,
          meta: {
            title: 'SQL.js测试',
            hideInMenu: true
          }
        },
        {
          path: 'weefim-test',
          name: 'WeeFIMTest',
          component: WeeFIMTest,
          meta: {
            title: 'WeeFIM数据测试',
            hideInMenu: true
          }
        },
        {
          path: 'worker-test',
          name: 'WorkerTest',
          component: WorkerTest,
          meta: {
            title: 'Database Worker测试',
            hideInMenu: true
          }
        },
        {
          path: 'schema-migration',
          name: 'SchemaMigration',
          component: SchemaMigration,
          meta: {
            title: 'Schema 2.0 迁移工具',
            hideInMenu: true
          }
        },
        {
          path: 'migration-verification',
          name: 'MigrationVerification',
          component: MigrationVerification,
          meta: {
            title: 'Phase 1.5 迁移验证',
            hideInMenu: true
          }
        },
        {
          path: 'module-devtools',
          name: 'ModuleDevTools',
          component: ModuleDevTools,
          meta: {
            title: '模块开发者工具',
            hideInMenu: true,
            roles: ['admin']
          }
        },
        {
          path: 'benchmark-runner',
          name: 'BenchmarkRunner',
          component: BenchmarkRunner,
          meta: {
            title: '性能基准测试',
            hideInMenu: true,
            roles: ['admin']
          }
        },
        {
          path: 'class-management-test',
          name: 'ClassManagementTest',
          component: ClassManagementTest,
          meta: {
            title: '班级管理测试',
            hideInMenu: true,
            roles: ['admin']
          }
        },
        {
          path: 'class-snapshot-verification',
          name: 'ClassSnapshotVerification',
          component: ClassSnapshotVerification,
          meta: {
            title: '班级快照验证',
            hideInMenu: true,
            roles: ['admin']
          }
        },
        {
          path: 'class-test-lite',
          name: 'ClassSnapshotTestLite',
          component: ClassSnapshotTestLite,
          meta: {
            title: '班级快照轻量测试',
            hideInMenu: true,
            roles: ['admin']
          }
        },
        {
          path: 'class-management',
          name: 'ClassManagement',
          component: ClassManagement,
          meta: {
            title: '班级管理',
            icon: 'school',
            roles: ['admin']
          }
        },
        {
          path: 'student-class-assignment',
          name: 'StudentClassAssignment',
          component: StudentClassAssignment,
          meta: {
            title: '学生分班',
            icon: 'users',
            roles: ['admin']
          }
        },
        {
          path: 'admin/resources',
          name: 'ResourceManager',
          redirect: '/resource-center',
          meta: {
            title: '资源管理',
            hideInMenu: true,
            roles: ['admin']
          }
        },
        {
          path: 'activation-admin',
          name: 'ActivationAdmin',
          component: ActivationAdmin,
          meta: {
            title: '激活管理',
            icon: 'key',
            roles: ['admin'],
            hideInMenu: true // 开发环境工具，默认隐藏
          }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: NotFound,
      meta: {
        title: '页面未找到',
        hideInMenu: true
      }
    }
  ]
})

// 全局路由守卫
router.beforeEach(async (to, from, next) => {
  // 动态获取系统名称
  const getSystemName = () => {
    // 尝试从 localStorage 获取系统名称
    const stored = localStorage.getItem('systemName')
    if (stored) return stored
    return '生活自理适应综合训练'
  }

  // 设置页面标题
  const systemName = getSystemName()
  document.title = to.meta.title
    ? `${to.meta.title} - ${systemName}`
    : systemName

  const authStore = useAuthStore()

  const resolveModuleCode = () => {
    const fromMeta = typeof to.meta.moduleCode === 'string' ? to.meta.moduleCode : ''
    if (fromMeta) return fromMeta

    if (to.path.startsWith('/emotional')) return 'emotional'
    if (
      to.path.startsWith('/games') ||
      to.path.startsWith('/equipment') ||
      to.path.startsWith('/assessment') ||
      to.path.startsWith('/training-records')
    ) {
      return 'sensory'
    }

    return ''
  }

  // 首次访问时，确保激活状态已检查
  if (!from.name) {
    await authStore.checkActivation()
    console.log('首次访问，激活状态:', authStore.isActivated, '是否在试用:', authStore.activationInfo.isInTrial)
  }

  // 检查是否需要登录
  if (to.meta.requiresAuth !== false) {
    if (!authStore.isLoggedIn) {
      // 未登录，跳转到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // 检查角色权限
    const routeRoles = Array.isArray(to.meta.roles) ? (to.meta.roles as string[]) : []
    if (routeRoles.length > 0) {
      if (!routeRoles.includes(authStore.user?.role || '')) {
        // 权限不足
        next('/403')
        return
      }
    }

    // 检查软件激活状态（除激活页面外）
    // 只有在完全未激活（不在试用期内）才跳转到激活页面
    if (to.name !== 'Activation' && !authStore.isActivated && !authStore.activationInfo.isInTrial) {
      next('/activation')
      return
    }

    const moduleCode = resolveModuleCode()
    if (moduleCode && !authStore.hasModuleAccess(moduleCode)) {
      ElMessage.warning('该模块未授权')
      if (to.path === '/dashboard') {
        next(false)
      } else {
        next('/dashboard')
      }
      return
    }
  } else {
    // 不需要登录的页面（登录页、激活页）

    // 如果访问登录页面但完全未激活（不在试用期内），跳转到激活页面
    if (to.name === 'Login' && !authStore.isActivated && !authStore.activationInfo.isInTrial) {
      next('/activation')
      return
    }

    // 如果已登录且访问登录页，跳转到首页
    if (authStore.isLoggedIn && to.name === 'Login') {
      next('/dashboard')
      return
    }
  }

  next()
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
})

export default router
