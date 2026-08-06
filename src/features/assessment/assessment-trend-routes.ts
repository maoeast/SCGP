import type { RouteRecordRaw } from 'vue-router'
import { ASSESSMENT_SCALE_CATALOG } from '@/features/assessment/assessment-scale-catalog'

/**
 * 评估量表「纵向趋势」路由（catalog 派生，与 assessment-report-routes 同模式）。
 *
 * 路径形态统一为 `assessment/{urlSlug}/trend/:studentId`（无 query 变体，趋势页只需 studentId）。
 * 仅 trendSupported=true 的量表生成路由；crt / cognitive_self 不生成。
 *
 * 组件：所有趋势路由复用同一个通用组件 AssessmentTrendPage.vue（组件内按 urlSlug 反查
 * catalog code → SCORE_ADAPTERS 取归一化分数），无需每量表单独组件。
 */

/** 支持纵向趋势的 catalog 子集（过滤 trendSupported）。 */
export const TREND_SUPPORTED_CATALOG = ASSESSMENT_SCALE_CATALOG.filter((item) => item.trendSupported)

// 纯元数据（path/name/meta）：jiti 可加载，供契约测试断言 name 集合，不触碰 .vue 编译
export const assessmentTrendRouteRecords = TREND_SUPPORTED_CATALOG.map((item) => ({
  // slug 用参数段（:urlSlug）：AssessmentTrendPage 按 route.params.urlSlug 反查 catalog code
  path: `assessment/:urlSlug/trend/:studentId`,
  name: item.trendRouteName!,
  meta: {
    title: `${item.title}纵向趋势`,
    hideInMenu: true,
    roles: ['admin', 'teacher'] as const,
  },
}))

// 合成完整路由记录（供 router/index.ts 展开为 children）
// 所有趋势路由复用同一个通用组件；非空断言安全：trendSupported=true 时 trendRouteName 必填（TS 接口保证）
export const assessmentTrendRoutes: RouteRecordRaw[] = assessmentTrendRouteRecords.map((record) => ({
  ...record,
  component: () => import('@/views/assessment/components/AssessmentTrendPage.vue'),
}))

/** 按量表 urlSlug 构建趋势路由路径。 */
export function buildAssessmentTrendRoute(urlSlug: string, studentId: number | string): string {
  return `/assessment/${urlSlug}/trend/${studentId}`
}
