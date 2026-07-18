import type { RouteRecordRaw } from 'vue-router'

/**
 * 仅在开发模式注册的路由：测试页、迁移/验证工具、性能基准、模块开发者工具与激活管理页。
 *
 * route record 与其组件动态 import 一并内联在 `import.meta.env.DEV` 三元内，
 * 使 Vite 生产构建通过 dead-code elimination 完整移除对应 chunk，
 * 而不是仅靠 `router/index.ts` 全局守卫拦截访问。
 *
 * 生产构建产物是否真的不含这些页面，由
 * `scripts/tests/dev-route-production-boundary.test.mjs`（源码契约层）
 * 与 `rg dist/assets`（构建产物层）共同验证。
 *
 * 新增开发专用路由时：
 * 1. 在 `devRoutes` 三元的 DEV 分支补 record；
 * 2. 同步把 `name` 加入下方 `DEV_ROUTE_NAMES` 字面量集合。
 * 边界测试会校验两者集合一致，防止漏配导致守卫纵深保护失效。
 */

// 组件 import 工厂必须内联在 DEV 分支内：生产构建 DEV 为 false，整个数组字面量
// 进入 dead 分支被 Rollup 删除，对应 chunk 不再生成。切勿抽到顶层 const 再引用——
// 那会让生产态仍持有 import 工厂引用而破坏 tree-shaking。
export const devRoutes: RouteRecordRaw[] = import.meta.env.DEV
  ? [
      {
        path: 'sql-test',
        name: 'SQLTest',
        component: () => import('@/views/SQLTest.vue'),
        meta: {
          title: 'SQL.js测试',
          hideInMenu: true,
        },
      },
      {
        path: 'weefim-test',
        name: 'WeeFIMTest',
        component: () => import('@/views/WeeFIMTest.vue'),
        meta: {
          title: 'WeeFIM数据测试',
          hideInMenu: true,
        },
      },
      {
        path: 'worker-test',
        name: 'WorkerTest',
        component: () => import('@/views/devtools/WorkerTest.vue'),
        meta: {
          title: 'Database Worker测试',
          hideInMenu: true,
        },
      },
      {
        path: 'schema-migration',
        name: 'SchemaMigration',
        component: () => import('@/views/devtools/SchemaMigration.vue'),
        meta: {
          title: 'Schema 2.0 迁移工具',
          hideInMenu: true,
        },
      },
      {
        path: 'migration-verification',
        name: 'MigrationVerification',
        component: () => import('@/views/devtools/MigrationVerification.vue'),
        meta: {
          title: 'Phase 1.5 迁移验证',
          hideInMenu: true,
        },
      },
      {
        path: 'module-devtools',
        name: 'ModuleDevTools',
        component: () => import('@/views/devtools/ModuleDevTools.vue'),
        meta: {
          title: '模块开发者工具',
          hideInMenu: true,
          roles: ['admin'],
        },
      },
      {
        path: 'benchmark-runner',
        name: 'BenchmarkRunner',
        component: () => import('@/views/devtools/BenchmarkRunner.vue'),
        meta: {
          title: '性能基准测试',
          hideInMenu: true,
          roles: ['admin'],
        },
      },
      {
        path: 'class-management-test',
        name: 'ClassManagementTest',
        component: () => import('@/views/devtools/ClassManagementTest.vue'),
        meta: {
          title: '班级管理测试',
          hideInMenu: true,
          roles: ['admin'],
        },
      },
      {
        path: 'class-snapshot-verification',
        name: 'ClassSnapshotVerification',
        component: () => import('@/views/devtools/ClassSnapshotVerification.vue'),
        meta: {
          title: '班级快照验证',
          hideInMenu: true,
          roles: ['admin'],
        },
      },
      {
        path: 'class-test-lite',
        name: 'ClassSnapshotTestLite',
        component: () => import('@/views/devtools/ClassSnapshotTestLite.vue'),
        meta: {
          title: '班级快照轻量测试',
          hideInMenu: true,
          roles: ['admin'],
        },
      },
      {
        path: 'activation-admin',
        name: 'ActivationAdmin',
        component: () => import('@/views/ActivationAdmin.vue'),
        meta: {
          title: '激活管理',
          icon: 'key',
          roles: ['admin'],
          hideInMenu: true, // 开发环境工具，默认隐藏
        },
      },
    ]
  : []

/**
 * 开发专用路由的 name 集合。
 *
 * 故意做成独立字符串字面量，不通过 `.map()` 从 `devRoutes` 派生——
 * 否则生产态（`devRoutes` 已折叠为 `[]`）下该映射仍会让组件 import 工厂可达，
 * 破坏 tree-shaking。本集合只含字符串、不引用组件，可安全常驻生产 bundle。
 *
 * 用途：`router/index.ts` 全局守卫的纵深保护（即便 route record 漏网到生产，
 * 也按 name 拦截），以及边界测试的事实源。
 */
export const DEV_ROUTE_NAMES: ReadonlySet<string> = new Set<string>([
  'SQLTest',
  'WeeFIMTest',
  'WorkerTest',
  'SchemaMigration',
  'MigrationVerification',
  'ModuleDevTools',
  'BenchmarkRunner',
  'ClassManagementTest',
  'ClassSnapshotVerification',
  'ClassSnapshotTestLite',
  'ActivationAdmin',
])
