import {
  createRouter,
  createWebHistory,
  createWebHashHistory,
  type NavigationGuardWithThis,
  type RouteLocationNormalized,
} from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  getAssessmentScaleCatalogItem,
  isAssessmentScaleAuthorized,
} from '@/features/assessment/assessment-scale-catalog'
import { assessmentLegacyRedirectRoutes, assessmentReportRoutes } from '@/features/assessment/assessment-report-routes'
import { assessmentTrendRoutes } from '@/features/assessment/assessment-trend-routes'
import { selfCareRoutes } from '@/features/self-care/self-care-routes'
import {
  getEquipmentTrainingEntryRequiredEntitlement,
} from '@/utils/equipment-training-entry'
import {
  getAllTrainingEntries,
  getTrainingEntryRequiredEntitlement,
} from '@/utils/training-entry'
import { resolveRouteModuleCode } from '@/utils/training-route-access'
import { devRoutes, DEV_ROUTE_NAMES } from '@/router/dev-routes'

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
const AiChatHistory = () => import('@/views/AiChatHistory.vue')
const NotFound = () => import('@/views/NotFound.vue')
const ClassManagement = () => import('@/views/admin/ClassManagement.vue')
const StudentClassAssignment = () => import('@/views/admin/StudentClassAssignment.vue')
const ResourceManager = () => import('@/views/admin/ResourceManager.vue')
const ResourceCenter = () => import('@/views/admin/ResourceCenter.vue')
const GameModuleMenu = () => import('@/views/games/GameModuleMenu.vue')
const GameSelectStudent = () => import('@/views/games/SelectStudent.vue')
const GameLobby = () => import('@/views/games/GameLobby.vue')
const GamePlay = () => import('@/views/games/GamePlay.vue')
const IEPReport = () => import('@/views/games/IEPReport.vue')
const EmotionalMenu = () => import('@/views/emotional/Menu.vue')
const EmotionalSceneSelector = () => import('@/views/emotional/SceneSelector.vue')
const EmotionSceneTraining = () => import('@/views/emotional/EmotionSceneTraining.vue')
const CareExpressionImmersiveTraining = () => import('@/views/emotional/CareExpressionImmersiveTraining.vue')
const EmotionalSessionSummary = () => import('@/views/emotional/SessionSummary.vue')
const EmotionalGameRecordDetail = () => import('@/views/emotional/GameRecordDetail.vue')
const EmotionalReport = () => import('@/views/emotional/Report.vue')
const BalloonBreathingPage = () => import('@/views/emotional/games/BalloonBreathingPage.vue')
const BurgerCoopPage = () => import('@/views/emotional/games/BurgerCoopPage.vue')
const DandelionPage = () => import('@/views/emotional/games/DandelionPage.vue')
const PuddlePage = () => import('@/views/emotional/games/PuddlePage.vue')
const XylophonePage = () => import('@/views/emotional/games/XylophonePage.vue')
const HourglassPage = () => import('@/views/emotional/games/HourglassPage.vue')
const MoodMeterPage = () => import('@/views/emotional/games/MoodMeterPage.vue')
const VoiceVolumeForestPage = () => import('@/views/emotional/games/VoiceVolumeForestPage.vue')
const WipeSadnessPage = () => import('@/views/emotional/games/WipeSadnessPage.vue')
const CloudErasePage = () => import('@/views/emotional/games/CloudErasePage.vue')
const StarTracePage = () => import('@/views/emotional/games/StarTracePage.vue')
const RecyclingSortPage = () => import('@/views/emotional/games/RecyclingSortPage.vue')
const TrackBuildPage = () => import('@/views/emotional/games/TrackBuildPage.vue')
const BalloonTapPage = () => import('@/views/emotional/games/BalloonTapPage.vue')
const SteadySpoonPage = () => import('@/views/emotional/games/SteadySpoonPage.vue')
const BodySignalPage = () => import('@/views/emotional/games/BodySignalPage.vue')
const TowelTwistPage = () => import('@/views/emotional/games/TowelTwistPage.vue')
const HomeSoundPage = () => import('@/views/emotional/games/HomeSoundPage.vue')
const MarketPayPage = () => import('@/views/emotional/games/MarketPayPage.vue')
const EmotionMonsterPage = () => import('@/views/emotional/games/EmotionMonsterPage.vue')
const EmotionMirrorPage = () => import('@/views/emotional/games/EmotionMirrorPage.vue')
const StorySequencePage = () => import('@/views/emotional/games/StorySequencePage.vue')
const GiftMatchPage = () => import('@/views/emotional/games/GiftMatchPage.vue')
const EchoParrotPage = () => import('@/views/emotional/games/EchoParrotPage.vue')
const EnergyBallPage = () => import('@/views/emotional/games/EnergyBallPage.vue')
const ExpressionDetectivePage = () => import('@/views/emotional/games/ExpressionDetectivePage.vue')
const ExpressionDuelPage = () => import('@/views/emotional/games/ExpressionDuelPage.vue')
const PatternNextPage = () => import('@/views/emotional/games/PatternNextPage.vue')
const MemoryMatchPage = () => import('@/views/emotional/games/MemoryMatchPage.vue')
const MissingItemPage = () => import('@/views/emotional/games/MissingItemPage.vue')
const EchoSeqPage = () => import('@/views/emotional/games/EchoSeqPage.vue')
const StoryOrderPage = () => import('@/views/emotional/games/StoryOrderPage.vue')
const SizeOrderPage = () => import('@/views/emotional/games/SizeOrderPage.vue')
const SpotDiffPage = () => import('@/views/emotional/games/SpotDiffPage.vue')
const MazeRunPage = () => import('@/views/emotional/games/MazeRunPage.vue')
const OddOneOutPage = () => import('@/views/emotional/games/OddOneOutPage.vue')
const NumberSensePage = () => import('@/views/emotional/games/NumberSensePage.vue')

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
// CSIRS 历史评估对比页已下线：旧路由重定向到通用趋势页 /assessment/csirs/trend/:studentId
// 15 个 Report.vue 由 assessment-report-routes 生成化懒加载；13 个趋势页由 assessment-trend-routes 生成化懒加载

// 通用评估容器（Phase 4 重构）
const AssessmentContainer = () => import('@/views/assessment/AssessmentContainer.vue')

// Electron 环境检测：在 Electron 中使用 HashRouter 避免 file:// 协议下的路由白屏问题
const processRef = typeof window !== 'undefined' ? ((window as any).process as { type?: string } | undefined) : undefined
const isElectron = !!processRef?.type
// 开发环境下也可以通过检查是否有 electronAPI 来判断
const isElectronEnv = !!(window as any).electronAPI || isElectron

const TRAINING_ENTRY_REQUIRED_ENTITLEMENTS = Array.from(new Set(
  getAllTrainingEntries().map((entry) => entry.requiredEntitlement)
))

function normalizeAssessmentScaleRouteValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

const createAssessmentScaleAccessGuard = (
  source: 'query' | 'params'
): NavigationGuardWithThis<undefined> => {
  return (to: RouteLocationNormalized) => {
    const authStore = useAuthStore()
    const scaleValue = source === 'query'
      ? normalizeAssessmentScaleRouteValue(to.query.scale)
      : normalizeAssessmentScaleRouteValue(to.params.scaleCode)

    const scaleItem = getAssessmentScaleCatalogItem(scaleValue)
    if (!scaleItem) {
      ElMessage.warning('无效的评估量表')
      return '/assessment'
    }

    if (!isAssessmentScaleAuthorized(
      scaleItem,
      (moduleCode) => authStore.hasModuleAccess(moduleCode),
      (entitlementCode) => authStore.hasEntitlementAccess(entitlementCode)
    )) {
      ElMessage.warning('该量表未授权')
      return '/assessment'
    }

    return true
  }
}

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
          path: 'profile/ai-chat-history',
          name: 'AiChatHistory',
          component: AiChatHistory,
          meta: {
            title: '我的 AI 会话',
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
            roles: ['admin', 'teacher']
          }
        },
        ...selfCareRoutes,
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
            roles: ['admin', 'teacher'],
            immersiveShell: true,
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
          component: CareExpressionImmersiveTraining,
          meta: {
            title: '表达关心训练',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/care-expression/immersive',
          redirect: (to) => ({
            path: '/emotional/care-expression',
            query: to.query,
          }),
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
          path: 'emotional/game-record',
          name: 'EmotionalGameRecordDetail',
          component: EmotionalGameRecordDetail,
          meta: {
            activeMenu: '/training-records',
            title: '情绪小游戏记录详情',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        {
          path: 'emotional/records',
          redirect: '/training-records/emotional-regulation?type=game',
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
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/burger',
          name: 'BurgerCoopGame',
          component: BurgerCoopPage,
          meta: {
            title: '合作造汉堡',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/dandelion',
          name: 'DandelionGame',
          component: DandelionPage,
          meta: {
            title: '吹蒲公英',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/puddle',
          name: 'PuddleGame',
          component: PuddlePage,
          meta: {
            title: '水塘波纹',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/xylophone',
          name: 'XylophoneGame',
          component: XylophonePage,
          meta: {
            title: '星空八音盒',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/hourglass',
          name: 'HourglassGame',
          component: HourglassPage,
          meta: {
            title: '魔法沙漏',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/mood-meter',
          name: 'MoodMeterGame',
          component: MoodMeterPage,
          meta: {
            title: '我的情绪温度计',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/forest',
          name: 'VoiceVolumeForestGame',
          component: VoiceVolumeForestPage,
          meta: {
            title: '音量魔法森林',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/wipe-ice',
          name: 'WipeSadnessGame',
          component: WipeSadnessPage,
          meta: {
            title: '擦亮坏心情',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/monster',
          name: 'EmotionMonsterGame',
          component: EmotionMonsterPage,
          meta: {
            title: '喂食情绪小怪兽',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/emotion-mirror',
          name: 'EmotionMirrorGame',
          component: EmotionMirrorPage,
          meta: {
            title: '表情猜猜乐',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/story-seq',
          name: 'StorySequenceGame',
          component: StorySequencePage,
          meta: {
            title: '故事接龙板',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/gift-match',
          name: 'GiftMatchGame',
          component: GiftMatchPage,
          meta: {
            title: '礼物分享派对',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/echo-parrot',
          name: 'EchoParrotGame',
          component: EchoParrotPage,
          meta: {
            title: '动物传声筒',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/cloud-erase',
          name: 'CloudEraseGame',
          component: CloudErasePage,
          meta: {
            title: '云朵擦擦擦',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/star-trace',
          name: 'StarTraceGame',
          component: StarTracePage,
          meta: {
            title: '连线小星座',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/recycling',
          name: 'RecyclingSortGame',
          component: RecyclingSortPage,
          meta: {
            title: '分拣小能手',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/track-build',
          name: 'TrackBuildGame',
          component: TrackBuildPage,
          meta: {
            title: '轨道修补匠',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/balloons',
          name: 'BalloonTapGame',
          component: BalloonTapPage,
          meta: {
            title: '刺破慢气球',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/energy-ball',
          name: 'EnergyBallGame',
          component: EnergyBallPage,
          meta: {
            title: '表情能量球',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/expression-detective',
          name: 'ExpressionDetectiveGame',
          component: ExpressionDetectivePage,
          meta: {
            title: '表情侦探',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/expression-duel',
          name: 'ExpressionDuelGame',
          component: ExpressionDuelPage,
          meta: {
            title: '双人表情擂台',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'life-skills/games/steady-spoon',
          name: 'SteadySpoonGame',
          component: SteadySpoonPage,
          meta: {
            title: '稳稳送一勺',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'life-skills/games/body-signal',
          name: 'BodySignalGame',
          component: BodySignalPage,
          meta: {
            title: '身体信号小灯塔',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'life-skills/games/towel-twist',
          name: 'TowelTwistGame',
          component: TowelTwistPage,
          meta: {
            title: '毛巾拧拧工坊',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'life-skills/games/home-sound',
          name: 'HomeSoundGame',
          component: HomeSoundPage,
          meta: {
            title: '家里声音小侦探',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'life-skills/games/market-pay',
          name: 'MarketPayGame',
          component: MarketPayPage,
          meta: {
            title: '超市付款小能手',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/pattern-next',
          name: 'PatternNextGame',
          component: PatternNextPage,
          meta: {
            title: '图形找规律',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/memory-match',
          name: 'MemoryMatchGame',
          component: MemoryMatchPage,
          meta: {
            title: '记忆翻牌',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/odd-one-out',
          name: 'OddOneOutGame',
          component: OddOneOutPage,
          meta: {
            title: '哪个不同类',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/number-sense',
          name: 'NumberSenseGame',
          component: NumberSensePage,
          meta: {
            title: '数感小铺',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/missing-item',
          name: 'MissingItemGame',
          component: MissingItemPage,
          meta: {
            title: '少了什么',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/echo-seq',
          name: 'EchoSeqGame',
          component: EchoSeqPage,
          meta: {
            title: '序列复现',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/story-order',
          name: 'StoryOrderGame',
          component: StoryOrderPage,
          meta: {
            title: '故事排序',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/size-order',
          name: 'SizeOrderGame',
          component: SizeOrderPage,
          meta: {
            title: '排排队',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/spot-diff',
          name: 'SpotDiffGame',
          component: SpotDiffPage,
          meta: {
            title: '找不同',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
          }
        },
        {
          path: 'emotional/games/maze-run',
          name: 'MazeRunGame',
          component: MazeRunPage,
          meta: {
            title: '小迷宫',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            immersiveShell: true,
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
            requiredEntitlementsAnyOf: TRAINING_ENTRY_REQUIRED_ENTITLEMENTS,
          }
        },
        {
          path: 'games/menu',
          name: 'GameModuleMenu',
          component: GameModuleMenu,
          meta: {
            title: '游戏训练 - 选择模块',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            requiredEntitlementsAnyOf: TRAINING_ENTRY_REQUIRED_ENTITLEMENTS,
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
            roles: ['admin', 'teacher'],
            immersiveShell: true,
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
            requiredEntitlementsAnyOf: TRAINING_ENTRY_REQUIRED_ENTITLEMENTS,
          }
        },
        {
          path: 'training-records/menu',
          name: 'TrainingRecordsMenu',
          component: TrainingRecordsMenu,
          meta: {
            title: '训练记录 - 选择模块',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            requiredEntitlementsAnyOf: TRAINING_ENTRY_REQUIRED_ENTITLEMENTS,
          }
        },
        {
          path: 'training-records/:entryCode',
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
          redirect: '/training-records/sensory-integration?type=game'
        },
        {
          path: 'training-records/equipment',
          redirect: '/training-records/sensory-integration?type=equipment'
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
            requiredEntitlementsAnyOf: TRAINING_ENTRY_REQUIRED_ENTITLEMENTS,
          }
        },
        {
          path: 'equipment/menu',
          name: 'EquipmentMenu',
          component: EquipmentMenu,
          meta: {
            title: '器材训练 - 选择模块',
            hideInMenu: true,
            roles: ['admin', 'teacher'],
            requiredEntitlementsAnyOf: TRAINING_ENTRY_REQUIRED_ENTITLEMENTS,
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
          beforeEnter: createAssessmentScaleAccessGuard('query'),
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
          beforeEnter: createAssessmentScaleAccessGuard('params'),
          meta: {
            title: '评估进行中',
            hideInMenu: true,
            roles: ['admin', 'teacher']
          }
        },
        // ===== 旧版评估路由重定向（catalog 生成化，见 features/assessment/assessment-report-routes.ts） =====
        ...assessmentLegacyRedirectRoutes,
        // ===== 报告页面（catalog 生成化，见 features/assessment/assessment-report-routes.ts） =====
        ...assessmentReportRoutes,
        // ===== 纵向趋势页面（catalog 生成化，见 features/assessment/assessment-trend-routes.ts） =====
        ...assessmentTrendRoutes,
        // CSIRS 旧历史页路由重定向到通用趋势页（保外链/书签兼容）
        {
          path: 'assessment/csirs/history/:studentId',
          redirect: (to: any) => `/assessment/csirs/trend/${to.params.studentId}`,
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
            title: '资源管理',
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
        // 开发专用路由（测试 / 迁移 / 基准 / 开发者工具 / 激活管理）：
        // 生产构建下 devRoutes 折叠为空数组，对应 chunk 被 Rollup 移除。
        ...devRoutes
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
  const LEGACY_SYSTEM_NAME = '生活自理适应综合训练'
  const CURRENT_SYSTEM_NAME = '星愿能力发展训练系统'

  // 动态获取系统名称
  const getSystemName = () => {
    // 尝试从 localStorage 获取系统名称
    const stored = localStorage.getItem('systemName')
    if (stored) {
      if (stored === LEGACY_SYSTEM_NAME) {
        localStorage.setItem('systemName', CURRENT_SYSTEM_NAME)
        return CURRENT_SYSTEM_NAME
      }
      return stored
    }
    return CURRENT_SYSTEM_NAME
  }

  // 设置页面标题
  const systemName = getSystemName()
  document.title = to.meta.title
    ? `${to.meta.title} - ${systemName}`
    : systemName

  const authStore = useAuthStore()

  if (!import.meta.env.DEV && typeof to.name === 'string' && DEV_ROUTE_NAMES.has(to.name)) {
    ElMessage.warning('当前版本不开放调试或测试路由')
    next('/dashboard')
    return
  }

  const resolveModuleCode = () => resolveRouteModuleCode({
    path: to.path,
    metaModuleCode: to.meta.moduleCode,
    queryEntry: to.query.entry,
    queryModule: to.query.module,
    paramsEntryCode: to.params.entryCode,
    paramsModuleCode: to.params.moduleCode,
  })

  const resolveRequiredEntitlementsAnyOf = () => {
    const fromMetaAnyOf = Array.isArray(to.meta.requiredEntitlementsAnyOf)
      ? to.meta.requiredEntitlementsAnyOf.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : []
    if (fromMetaAnyOf.length > 0) {
      return fromMetaAnyOf
    }

    const fromMetaSingle = typeof to.meta.requiredEntitlement === 'string'
      ? to.meta.requiredEntitlement.trim()
      : ''
    if (fromMetaSingle) {
      return [fromMetaSingle]
    }

    if (to.path.startsWith('/equipment')) {
      const entitlementCode = getEquipmentTrainingEntryRequiredEntitlement(to.query.entry, to.query.module)
      return entitlementCode ? [entitlementCode] : []
    }

    if (to.path.startsWith('/games')) {
      const entitlementCode = getTrainingEntryRequiredEntitlement(to.query.entry, to.query.module)
      return entitlementCode ? [entitlementCode] : []
    }

    if (to.path.startsWith('/training-records')) {
      const routeEntryCode = typeof to.params.entryCode === 'string'
        ? to.params.entryCode
        : typeof to.params.moduleCode === 'string'
          ? to.params.moduleCode
          : ''
      const entitlementCode = routeEntryCode ? getTrainingEntryRequiredEntitlement(routeEntryCode) : ''
      return entitlementCode ? [entitlementCode] : []
    }

    return []
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
    // 生产环境下只要未正式激活，就必须先进入激活页
    if (to.name !== 'Activation' && !authStore.isActivated) {
      next('/activation')
      return
    }

    const requiredEntitlementsAnyOf = resolveRequiredEntitlementsAnyOf()
    if (
      requiredEntitlementsAnyOf.length > 0
      && !requiredEntitlementsAnyOf.some((entitlementCode) => authStore.hasEntitlementAccess(entitlementCode))
    ) {
      ElMessage.warning('该入口未授权')
      if (to.path === '/dashboard') {
        next(false)
      } else {
        next('/dashboard')
      }
      return
    }

    const moduleCode = resolveModuleCode()
    if (moduleCode && !authStore.hasModuleAccess(moduleCode)) {
      ElMessage.warning('该入口对应能力包未授权')
      if (to.path === '/dashboard') {
        next(false)
      } else {
        next('/dashboard')
      }
      return
    }
  } else {
    // 不需要登录的页面（登录页、激活页）

    // 只有正式激活后，才跳过激活页
    if (to.name === 'Activation' && authStore.isActivated) {
      next(authStore.isLoggedIn ? '/dashboard' : '/login')
      return
    }

    // 如果访问登录页面但尚未正式激活，跳转到激活页面
    if (to.name === 'Login' && !authStore.isActivated) {
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
