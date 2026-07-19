import type { RouteRecordRaw } from 'vue-router'
import { ASSESSMENT_SCALE_CATALOG, type AssessmentScaleCode, type ReportPathParamStyle } from '@/features/assessment/assessment-scale-catalog'

function buildAssessmentReportPath(urlSlug: string, paramStyle: ReportPathParamStyle): string {
  // sm/weefim 用 query 形态（无 :assessId 路径段），其余用 path params
  return paramStyle === 'query'
    ? `assessment/${urlSlug}/report`
    : `assessment/${urlSlug}/report/:assessId`
}

// 纯元数据（path/name/meta）：jiti 可加载，供契约测试断言 name 集合，不触碰 .vue 编译
export const assessmentReportRouteRecords = ASSESSMENT_SCALE_CATALOG.map((item) => ({
  path: buildAssessmentReportPath(item.urlSlug, item.reportPathParamStyle),
  name: item.reportRouteName,
  meta: {
    title: item.reportMetaTitle,
    hideInMenu: true,
    roles: ['admin', 'teacher'],
  },
}))

// 动态组件表：name → 懒加载 Report.vue（Vite 模板字面量动态 import 切 chunk）
// 双导出：组件 import 与纯元数据分离，避免 jiti 契约测试触碰 .vue 编译
export const assessmentReportRouteComponents: Record<string, () => Promise<any>> = ASSESSMENT_SCALE_CATALOG.reduce(
  (components, item) => {
    components[item.reportRouteName] = () => import(`@/views/assessment/${item.reportComponentFolder}/Report.vue`)
    return components
  },
  {} as Record<string, () => Promise<any>>,
)

// 合成完整路由记录（供 router/index.ts 展开为 children）
// 非空断言安全：records 与 components 同源于 catalog，name 一一对应
export const assessmentReportRoutes: RouteRecordRaw[] = assessmentReportRouteRecords.map((record) => ({
  ...record,
  component: assessmentReportRouteComponents[record.name]!,
}))

// 旧版评估入口路由重定向（保外链/书签兼容，统一指向 unified 入口）
// sm/weefim 历史路径含 /assessment/ 中缀（旧版入口），其余为 assessment/<code>/:studentId；
// 新增量表（无遗留入口）按主导形态补齐，无副作用（仅重定向到 live unified 入口）
const ASSESSMENT_LEGACY_REDIRECT_SPECIAL_PATHS: Partial<Record<AssessmentScaleCode, string>> = {
  sm: 'assessment/sm/assessment/:studentId',
  weefim: 'assessment/weefim/assessment/:studentId',
}

export const assessmentLegacyRedirectRoutes: RouteRecordRaw[] = ASSESSMENT_SCALE_CATALOG.map((item) => ({
  path: ASSESSMENT_LEGACY_REDIRECT_SPECIAL_PATHS[item.code] ?? `assessment/${item.code}/:studentId`,
  redirect: (to: any) => `/assessment/unified/${item.code}/${to.params.studentId}`,
}))
