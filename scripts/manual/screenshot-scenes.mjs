import { clickFirstVisible, gotoAndAssert, waitForAppIdle } from './screenshot-helpers.mjs';

export const manualScreenshotFiles = [
  'win-install-path.png',
  'win-install-finish.png',
  'first-launch-activation.png',
  'copy-machine-code.png',
  'activation-success.png',
  'login-page.png',
  'login-form-filled.png',
];

const pageShot = (name, route, assertText, cropSelector = '.page-container, main') => ({
  name,
  route,
  assertText,
  cropSelector,
  wait: 1200,
});

export const screenshotScenes = [
  {
    chapter: 'Ch3 系统首页',
    shots: [
      pageShot('dashboard-overview.png', '/dashboard', '系统首页'),
      pageShot('dashboard-kpi.png', '/dashboard', '系统首页'),
      pageShot('dashboard-refresh.png', '/dashboard', '系统首页'),
      pageShot('dashboard-unauthorized.png', '/dashboard', '系统首页'),
      pageShot('dashboard-unauthorized-tooltip.png', '/dashboard', '系统首页'),
      {
        name: 'sidebar-menu.png',
        route: '/dashboard',
        assertText: '系统首页',
        cropSelector: '.sidebar, .app-sidebar, aside, .el-menu',
      },
    ],
  },
  {
    chapter: 'Ch4 学生管理',
    shots: [
      pageShot('student-sidebar.png', '/students', '学生管理'),
      pageShot('student-list.png', '/students', '学生管理'),
      pageShot('student-filters.png', '/students', '学生管理'),
      pageShot('student-stats-cards.png', '/students', '学生管理'),
      pageShot('student-card.png', '/students', '学生管理'),
      pageShot('student-add-button.png', '/students', '学生管理'),
      {
        name: 'student-add-dialog.png',
        route: '/students',
        assertText: '学生管理',
        cropSelector: '.el-dialog',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('student-add-dialog.png', '/students', '学生管理'));
          await clickFirstVisible(page, ['button:has-text("添加")', 'button:has-text("新增")', 'button:has-text("新建")']);
        },
      },
      pageShot('student-import-button.png', '/students', '学生管理'),
      {
        name: 'student-import-dialog.png',
        route: '/students',
        assertText: '学生管理',
        cropSelector: '.el-dialog',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('student-import-dialog.png', '/students', '学生管理'));
          await clickFirstVisible(page, ['button:has-text("导入")', 'button:has-text("批量")']);
        },
      },
      pageShot('student-detail-button.png', '/students', '学生管理'),
      pageShot('student-detail-page.png', '/students', '学生管理'),
      pageShot('student-card-menu.png', '/students', '学生管理'),
      pageShot('student-edit-dialog.png', '/students', '学生管理'),
    ],
  },
  {
    chapter: 'Ch5 能力评估',
    shots: [
      pageShot('assessment-flow.png', '/assessment', '评估'),
      pageShot('assessment-category-tags.png', '/assessment', '评估'),
      pageShot('assessment-sidebar.png', '/assessment', '评估'),
      pageShot('assessment-center.png', '/assessment', '评估'),
      pageShot('assessment-category-select.png', '/assessment', '评估'),
      pageShot('assessment-start.png', '/assessment', '评估'),
      pageShot('assessment-select-student.png', '/assessment/select-student', '选择学生'),
      pageShot('assessment-testing.png', '/assessment', '评估'),
      pageShot('assessment-authorized-filter.png', '/assessment', '评估'),
      pageShot('assessment-report.png', '/reports', '报告'),
      pageShot('assessment-report-chart.png', '/reports', '报告'),
      pageShot('assessment-csirs-comparison.png', '/assessment', '评估'),
      pageShot('assessment-report-export.png', '/reports', '报告'),
      pageShot('assessment-export-format.png', '/reports', '报告'),
    ],
  },
  {
    chapter: 'Ch6 训练计划',
    shots: [
      pageShot('plan-concept.png', '/training-plan', '训练计划'),
      pageShot('plan-sidebar.png', '/training-plan', '训练计划'),
      pageShot('plan-list.png', '/training-plan', '训练计划'),
      {
        name: 'plan-create-button.png',
        route: '/training-plan',
        assertText: '训练计划',
        cropSelector: '.el-dialog, .page-container, main',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('plan-create-button.png', '/training-plan', '训练计划'));
          await clickFirstVisible(page, ['button:has-text("新建")', 'button:has-text("创建"), button:has-text("新增")']);
        },
      },
      pageShot('plan-basic-info.png', '/training-plan', '训练计划'),
      pageShot('plan-goals.png', '/training-plan', '训练计划'),
      pageShot('plan-filters.png', '/training-plan', '训练计划'),
      pageShot('plan-stats-cards.png', '/training-plan', '训练计划'),
      pageShot('plan-card.png', '/training-plan', '训练计划'),
      pageShot('plan-daily-recommendation.png', '/training-plan', '训练计划'),
      pageShot('plan-resource-detail.png', '/training-plan', '训练计划'),
      pageShot('plan-start-training.png', '/training-plan', '训练计划'),
      pageShot('plan-activate.png', '/training-plan', '训练计划'),
    ],
  },
  {
    chapter: 'Ch7 情绪行为',
    shots: [
      pageShot('emotional-sidebar.png', '/emotional/menu', '情绪行为'),
      pageShot('emotional-home.png', '/emotional/menu', '情绪行为'),
      pageShot('emotional-directions.png', '/emotional/menu', '情绪行为'),
      pageShot('emotional-scene-entry.png', '/emotional/emotion-scene/select', '情绪'),
      pageShot('emotional-scene-select.png', '/emotional/emotion-scene/select', '情绪'),
      pageShot('emotional-scene-session.png', '/emotional/emotion-scene', '情绪'),
      pageShot('emotional-scene-steps.png', '/emotional/emotion-scene', '情绪'),
      pageShot('emotional-scene-summary.png', '/emotional/session-summary', '情绪'),
      pageShot('emotional-care-entry.png', '/emotional/care-expression/select', '关心'),
      pageShot('emotional-care-scene-select.png', '/emotional/care-expression/select', '关心'),
      pageShot('emotional-care-session.png', '/emotional/care-expression', '关心'),
      pageShot('emotional-care-guide.png', '/emotional/care-expression', '关心'),
      pageShot('emotional-care-expression.png', '/emotional/care-expression', '关心'),
      pageShot('emotional-games-list.png', '/emotional/menu', '情绪行为'),
      pageShot('emotional-game-fullscreen.png', '/emotional/games/balloon', '深呼吸'),
      pageShot('emotional-games-entry.png', '/emotional/menu', '情绪行为'),
      pageShot('emotional-report.png', '/emotional/report', '报告'),
      pageShot('emotional-report-accuracy.png', '/emotional/report', '报告'),
      pageShot('emotional-report-radar.png', '/emotional/report', '报告'),
      pageShot('emotional-report-export.png', '/emotional/report', '报告'),
    ],
  },
  {
    chapter: 'Ch8 游戏训练',
    shots: [
      pageShot('game-training-flow.png', '/games/menu', '游戏训练'),
      pageShot('game-module-menu.png', '/games/menu', '游戏训练'),
      pageShot('game-select-student.png', '/games/select-student', '选择学生'),
      pageShot('game-lobby.png', '/games/menu', '游戏训练'),
      pageShot('emotional-game-lobby.png', '/emotional/menu', '情绪行为'),
      pageShot('game-playing.png', '/games/play', '训练'),
      pageShot('iep-report.png', '/games/report', '报告'),
    ],
  },
  {
    chapter: 'Ch9 器材训练',
    shots: [
      pageShot('equipment-training-flow.png', '/equipment/menu', '器材训练'),
      pageShot('equipment-module-menu.png', '/equipment/menu', '器材训练'),
      pageShot('equipment-select-student.png', '/equipment/select-student', '选择学生'),
      pageShot('equipment-quick-entry.png', '/equipment/menu', '器材训练'),
    ],
  },
  {
    chapter: 'Ch10 训练记录',
    shots: [
      pageShot('training-records-menu.png', '/training-records/menu', '训练记录'),
      pageShot('module-training-records.png', '/training-records/life-skills', '训练记录'),
      pageShot('game-records-panel.png', '/training-records/sensory-integration', '训练记录'),
      {
        ...pageShot('equipment-records-panel.png', '/training-records/sensory-integration?type=equipment', '训练记录'),
        assertText: '器材训练记录',
      },
    ],
  },
  {
    chapter: 'Ch11 报告中心',
    shots: [
      pageShot('report-center-overview.png', '/reports', '报告'),
      pageShot('report-filters.png', '/reports', '报告'),
      pageShot('report-distribution.png', '/reports', '报告'),
      pageShot('report-list.png', '/reports', '报告'),
      pageShot('report-migration.png', '/reports', '报告'),
    ],
  },
  {
    chapter: 'Ch12 资源中心',
    shots: [
      pageShot('resource-center-overview.png', '/resource-center', '资源中心'),
      pageShot('training-resources.png', '/resource-center', '资源中心'),
      pageShot('resource-table.png', '/resource-center', '资源中心'),
      {
        name: 'resource-edit-dialog.png',
        route: '/resource-center',
        assertText: '资源中心',
        cropSelector: '.el-dialog, .resource-center, main',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('resource-edit-dialog.png', '/resource-center', '资源中心'));
          await clickFirstVisible(page, ['button:has-text("新建资源")', 'button:has-text("新建")', 'text=编辑']);
        },
      },
      pageShot('emotion-scene-editor.png', '/resource-center', '资源中心'),
      pageShot('self-care-task-editor.png', '/resource-center', '资源中心'),
      pageShot('resource-import-export.png', '/resource-center', '资源中心'),
      pageShot('resource-pack-import.png', '/resource-center', '资源中心'),
      pageShot('teaching-materials.png', '/resource-center', '资源中心'),
      pageShot('teaching-material-upload.png', '/resource-center', '资源中心'),
      pageShot('teaching-material-batch-import.png', '/resource-center', '资源中心'),
    ],
  },
  {
    chapter: 'Ch13 自理训练',
    shots: [
      pageShot('self-care-task-list.png', '/self-care/tasks', '自理训练', '.self-care-task-list-page, main'),
      pageShot('self-care-task-create.png', '/self-care/tasks/new', '新建自理任务', '.self-care-task-editor-page, main'),
      pageShot('self-care-select-student.png', '/self-care/tasks/1/select-student', '选择学生'),
      pageShot('self-care-task-execution.png', '/self-care/execute/1/1', '执行概览', '.task-execution-page, main'),
      pageShot('self-care-training-records.png', '/training-records/life-skills', '训练记录'),
    ],
  },
  {
    chapter: 'Ch14 班级管理',
    shots: [
      pageShot('ch13-class-list.png', '/class-management', '班级管理'),
      pageShot('ch13-class-card.png', '/class-management', '班级管理'),
      {
        name: 'ch13-create-class.png',
        route: '/class-management',
        assertText: '班级管理',
        cropSelector: '.el-dialog, .page-container, main',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('ch13-create-class.png', '/class-management', '班级管理'));
          await clickFirstVisible(page, ['button:has-text("新建")', 'button:has-text("创建")']);
        },
      },
      {
        name: 'ch13-batch-create.png',
        route: '/class-management',
        assertText: '班级管理',
        cropSelector: '.el-dialog, .page-container, main',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('ch13-batch-create.png', '/class-management', '班级管理'));
          await clickFirstVisible(page, ['button:has-text("批量")']);
        },
      },
      pageShot('ch13-class-actions.png', '/class-management', '班级管理'),
      {
        name: 'ch13-academic-year.png',
        route: '/class-management',
        assertText: '班级管理',
        cropSelector: '.el-dialog, .page-container, main',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('ch13-academic-year.png', '/class-management', '班级管理'));
          await clickFirstVisible(page, ['button:has-text("学年")']);
        },
      },
    ],
  },
  {
    chapter: 'Ch15 学生分班',
    shots: [
      pageShot('ch14-student-assignment.png', '/student-class-assignment', '学生分班'),
      pageShot('ch14-batch-assign.png', '/student-class-assignment', '学生分班'),
      pageShot('ch14-year-upgrade.png', '/student-class-assignment', '学生分班'),
      pageShot('ch14-remove-student.png', '/student-class-assignment', '学生分班'),
    ],
  },
  {
    chapter: 'Ch16 系统管理',
    shots: [
      pageShot('ch15-system-main.png', '/system', '系统管理'),
      pageShot('ch15-user-management.png', '/system', '系统管理'),
      {
        name: 'ch15-create-user.png',
        route: '/system',
        assertText: '系统管理',
        cropSelector: '.el-dialog, .system-page, main',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('ch15-create-user.png', '/system', '系统管理'));
          await clickFirstVisible(page, ['button:has-text("新建")', 'button:has-text("添加")', 'button:has-text("创建")']);
        },
      },
      {
        name: 'ch15-backup.png',
        route: '/system',
        assertText: '系统管理',
        cropSelector: '.system-page, main',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('ch15-backup.png', '/system', '系统管理'));
          await clickFirstVisible(page, ['[role="tab"]:has-text("备份")', 'text=数据备份']);
        },
      },
      pageShot('ch15-restore.png', '/system', '系统管理'),
      {
        name: 'ch15-settings.png',
        route: '/system',
        assertText: '系统管理',
        cropSelector: '.system-page, main',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('ch15-settings.png', '/system', '系统管理'));
          await clickFirstVisible(page, ['[role="tab"]:has-text("设置")', 'text=系统设置']);
        },
      },
      {
        name: 'ch15-about.png',
        route: '/system',
        assertText: '系统管理',
        cropSelector: '.system-page, main',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('ch15-about.png', '/system', '系统管理'));
          await clickFirstVisible(page, ['[role="tab"]:has-text("关于")', 'text=关于']);
        },
      },
      {
        name: 'ch15-activate.png',
        route: '/system',
        assertText: '系统管理',
        cropSelector: '.system-page, main',
        setup: async (page, baseUrl) => {
          await gotoAndAssert(page, baseUrl, pageShot('ch15-activate.png', '/system', '系统管理'));
          await clickFirstVisible(page, ['[role="tab"]:has-text("关于")', 'text=重新激活', 'text=更新授权']);
        },
      },
      pageShot('ch15-update.png', '/system', '系统管理'),
    ],
  },
];

export function flattenScreenshotScenes() {
  return screenshotScenes.flatMap((group) =>
    group.shots.map((shot) => ({ ...shot, chapter: group.chapter }))
  );
}
