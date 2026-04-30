/**
 * SCGP 产品使用说明书 — 自动截图脚本
 *
 * 使用 Playwright 访问开发服务器，截取各模块界面截图。
 * 注意：Web 模式下部分页面（需要 SQL.js 数据库）可能无法正常渲染，
 *       截图结果可能为空或错误状态，需人工筛选。
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:5173';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const screenshots = [
  // 登录与激活
  { name: 'login-page.png', path: '/login', selector: '.login-card, .login-container, form', wait: 2000 },
  { name: 'activation-page.png', path: '/activation', selector: '.activation-container, .activation-page', wait: 2000 },

  // 系统首页（需登录，可能失败）
  { name: 'dashboard.png', path: '/dashboard', selector: '.dashboard, main', wait: 3000 },

  // 学生管理
  { name: 'students-list.png', path: '/students', selector: '.students-page, main', wait: 2000 },

  // 班级管理
  { name: 'class-management.png', path: '/class-management', selector: '.class-management, main', wait: 2000 },

  // 能力评估
  { name: 'assessment-select.png', path: '/assessment', selector: '.assessment-select, main', wait: 2000 },

  // 训练计划
  { name: 'training-plan.png', path: '/training-plan', selector: '.plan-list, main', wait: 2000 },

  // 情绪行为
  { name: 'emotional-menu.png', path: '/emotional', selector: '.emotional-menu, main', wait: 2000 },

  // 游戏训练
  { name: 'game-module-menu.png', path: '/games', selector: '.game-module-menu, main', wait: 2000 },

  // 器材训练
  { name: 'equipment-menu.png', path: '/equipment', selector: '.equipment-menu, main', wait: 2000 },

  // 训练记录
  { name: 'training-records-menu.png', path: '/training-records', selector: '.training-records-menu, main', wait: 2000 },

  // 报告中心
  { name: 'reports-center.png', path: '/reports', selector: '.reports-page, main', wait: 2000 },

  // 资源中心
  { name: 'resource-center.png', path: '/resource-center', selector: '.resource-center, main', wait: 2000 },

  // 系统管理
  { name: 'system-management.png', path: '/system', selector: '.system-page, main', wait: 2000 },
];

async function main() {
  console.log('📸 启动截图工具...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  });

  const page = await context.newPage();
  let captured = 0;
  let failed = 0;

  for (const shot of screenshots) {
    const filePath = path.resolve(SCREENSHOTS_DIR, shot.name);
    try {
      console.log(`  截取: ${shot.name} (${shot.path})`);

      await page.goto(`${BASE_URL}${shot.path}`, {
        waitUntil: 'networkidle',
        timeout: 10000,
      });

      // Wait for content to render
      await page.waitForTimeout(shot.wait);

      // Try to find the selector, or fall back to full page
      try {
        if (shot.selector) {
          const el = await page.$(shot.selector);
          if (el) {
            await el.screenshot({ path: filePath });
          } else {
            await page.screenshot({ path: filePath, fullPage: false });
          }
        } else {
          await page.screenshot({ path: filePath, fullPage: false });
        }
      } catch {
        await page.screenshot({ path: filePath, fullPage: false });
      }

      captured++;
      console.log(`    ✅ 已保存`);
    } catch (err) {
      // Still try to screenshot even if page load had issues
      try {
        await page.screenshot({ path: filePath, fullPage: false });
        captured++;
        console.log(`    ⚠️  页面加载异常但已截图`);
      } catch {
        failed++;
        console.log(`    ❌ 失败: ${err.message.slice(0, 60)}`);
      }
    }
  }

  await browser.close();

  console.log(`\n📊 截图完成: ${captured} 成功, ${failed} 失败`);
  console.log(`   保存目录: ${SCREENSHOTS_DIR}`);
}

main().catch(err => {
  console.error('❌ 截图失败:', err);
  process.exit(1);
});
