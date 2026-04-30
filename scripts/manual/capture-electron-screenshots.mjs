/**
 * SCGP 产品使用说明书 — Electron + Playwright 全量截图脚本
 *
 * 使用 Playwright 内置 _electron.launch() 原生管理 Electron 进程，
 * 自动登录后逐模块截取界面截图。
 *
 * 用法：node scripts/manual/capture-electron-screenshots.mjs
 */

import { _electron as electron } from 'playwright';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import os from 'os';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..', '..');
const SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots');

const VITE_PORT = 5173;

const DEV_CERT_PATH = path.join(ROOT_DIR, 'dev-cert.pem');
const DEV_KEY_PATH = path.join(ROOT_DIR, 'dev-key.pem');
const DEV_PROTOCOL =
  fs.existsSync(DEV_CERT_PATH) && fs.existsSync(DEV_KEY_PATH) ? 'https' : 'http';
const DEV_SERVER_URL = `${DEV_PROTOCOL}://localhost:${VITE_PORT}`;

const LOGIN_USERNAME = 'admin';
const LOGIN_PASSWORD = 'admin123';

let viteProcess = null;
let app = null;

// ─── 日志 ─────────────────────────────────────────────

let totalCaptured = 0;
let totalFailed = 0;

function log(msg) { console.log(`  ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); totalCaptured++; }
function warn(msg) { console.log(`  ⚠️  ${msg}`); totalCaptured++; }
function fail(msg) { console.log(`  ❌ ${msg}`); totalFailed++; }

// ─── 端口管理 ─────────────────────────────────────────

async function killPortProcess(port) {
  const platform = os.platform();
  const command = platform === 'win32'
    ? `netstat -ano | findstr ":${port} "`
    : `lsof -nP -iTCP:${port} -sTCP:LISTEN`;
  try {
    const { stdout } = await execAsync(command);
    const lines = stdout.trim().split('\n').filter(l => l);
    if (!lines.length) return;
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = platform === 'win32' ? parts[parts.length - 1] : parts[1];
      if (pid && !Number.isNaN(Number(pid))) pids.add(pid);
    }
    for (const pid of pids) {
      await execAsync(platform === 'win32' ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  } catch {}
}

// ─── Vite 启动 ────────────────────────────────────────

function spawnVite() {
  return new Promise((resolve, reject) => {
    log(`启动 Vite: ${DEV_SERVER_URL}`);
    viteProcess = spawn('npx', ['vite'], {
      cwd: ROOT_DIR, shell: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    viteProcess.stdout?.on('data', d => process.stdout.write(d));
    viteProcess.stderr?.on('data', d => process.stderr.write(d));
    viteProcess.on('error', reject);

    const startedAt = Date.now();
    const poll = () => {
      if (Date.now() - startedAt > 60_000) { reject(new Error('Vite 超时')); return; }
      const url = new URL(DEV_SERVER_URL);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(
        { hostname: url.hostname, port: url.port, path: '/', method: 'GET', rejectUnauthorized: false },
        res => { res.resume(); res.statusCode > 0 && res.statusCode < 500 ? resolve() : setTimeout(poll, 800); }
      );
      req.on('error', () => setTimeout(poll, 800));
      req.setTimeout(3000, () => req.destroy());
      req.end();
    };
    setTimeout(poll, 2000);
  });
}

// ─── 截图辅助 ─────────────────────────────────────────

async function shot(page, name) {
  const filePath = path.resolve(SCREENSHOTS_DIR, name);
  try {
    await page.screenshot({ path: filePath });
    ok(name);
  } catch (err) {
    fail(`${name}: ${err.message.slice(0, 80)}`);
  }
}

async function goto(page, route, waitMs = 3000) {
  try {
    await page.goto(`${DEV_SERVER_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
  } catch {
    // fallback: page.goto 可能在 Electron 中偶尔超时，忽略继续
  }
  await page.waitForTimeout(waitMs);
}

// ─── 全量截图场景 ─────────────────────────────────────

const scenes = [

  // ================================================================
  //  Part 1: 登录与激活
  // ================================================================
  { name: 'login-page.png', route: '/login' },
  { name: 'login-form-filled.png', setup: async (page) => {
    await goto(page, '/login');
    await page.locator('input[autocomplete="username"], input[placeholder*="用户名"]').first().fill('admin');
    await page.locator('input[type="password"]').first().fill('admin123');
    await shot(page, 'login-form-filled.png');
  }},
  { name: 'activation-page.png', route: '/activation' },
  { name: 'dashboard-overview.png', route: '/dashboard', wait: 5000 },
  { name: 'sidebar-menu.png', setup: async (page) => {
    await goto(page, '/dashboard', 3000);
    const sidebar = await page.$('.sidebar, .app-sidebar, nav.sidebar, .el-menu, aside');
    if (sidebar) {
      const filePath = path.resolve(SCREENSHOTS_DIR, 'sidebar-menu.png');
      await sidebar.screenshot({ path: filePath }).then(() => ok('sidebar-menu.png')).catch(() => shot(page, 'sidebar-menu.png'));
    } else {
      await shot(page, 'sidebar-menu.png');
    }
  }},

  // ================================================================
  //  Ch3 系统首页
  // ================================================================
  { name: 'dashboard-kpi.png', route: '/dashboard' },
  { name: 'dashboard-refresh.png', route: '/dashboard' },
  { name: 'dashboard-unauthorized.png', route: '/dashboard' },
  { name: 'dashboard-unauthorized-tooltip.png', route: '/dashboard' },

  // ================================================================
  //  Ch4 学生管理
  // ================================================================
  { name: 'student-sidebar.png', route: '/students' },
  { name: 'student-list.png', route: '/students', wait: 4000 },
  { name: 'student-filters.png', route: '/students' },
  { name: 'student-stats-cards.png', route: '/students' },
  { name: 'student-card.png', route: '/students' },
  { name: 'student-add-button.png', route: '/students' },
  { name: 'student-add-dialog.png', setup: async (page) => {
    await goto(page, '/students', 3000);
    const btn = page.locator('button:has-text("添加"), button:has-text("新增")').first();
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(1000); }
    await shot(page, 'student-add-dialog.png');
  }},
  { name: 'student-import-button.png', route: '/students' },
  { name: 'student-import-dialog.png', setup: async (page) => {
    await goto(page, '/students', 3000);
    const btn = page.locator('button:has-text("导入"), button:has-text("批量")').first();
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(1000); }
    await shot(page, 'student-import-dialog.png');
  }},
  { name: 'student-detail-button.png', route: '/students' },
  { name: 'student-detail-page.png', setup: async (page) => {
    await goto(page, '/students', 4000);
    const card = page.locator('.student-card, .student-item, [class*="student-card"]').first();
    if (await card.isVisible().catch(() => false)) { await card.click(); await page.waitForTimeout(2000); }
    await shot(page, 'student-detail-page.png');
  }},
  { name: 'student-card-menu.png', route: '/students' },
  { name: 'student-edit-dialog.png', route: '/students' },

  // ================================================================
  //  Ch5 能力评估
  // ================================================================
  { name: 'assessment-flow.png', route: '/assessment' },
  { name: 'assessment-category-tags.png', route: '/assessment' },
  { name: 'assessment-sidebar.png', route: '/assessment' },
  { name: 'assessment-center.png', route: '/assessment', wait: 4000 },
  { name: 'assessment-category-select.png', route: '/assessment' },
  { name: 'assessment-start.png', route: '/assessment' },
  { name: 'assessment-select-student.png', route: '/assessment/select-student', wait: 4000 },
  { name: 'assessment-testing.png', route: '/assessment' },
  { name: 'assessment-authorized-filter.png', route: '/assessment' },
  { name: 'assessment-report.png', route: '/assessment' },
  { name: 'assessment-report-chart.png', route: '/assessment' },
  { name: 'assessment-csirs-comparison.png', route: '/assessment' },
  { name: 'assessment-report-export.png', route: '/assessment' },
  { name: 'assessment-export-format.png', route: '/assessment' },

  // ================================================================
  //  Ch6 训练计划
  // ================================================================
  { name: 'plan-concept.png', route: '/training-plan' },
  { name: 'plan-sidebar.png', route: '/training-plan' },
  { name: 'plan-list.png', route: '/training-plan', wait: 4000 },
  { name: 'plan-create-button.png', setup: async (page) => {
    await goto(page, '/training-plan', 3000);
    const btn = page.locator('button:has-text("新建"), button:has-text("创建"), button:has-text("新增")').first();
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(500); }
    await shot(page, 'plan-create-button.png');
  }},
  { name: 'plan-basic-info.png', route: '/training-plan' },
  { name: 'plan-goals.png', route: '/training-plan' },
  { name: 'plan-filters.png', route: '/training-plan' },
  { name: 'plan-stats-cards.png', route: '/training-plan' },
  { name: 'plan-card.png', route: '/training-plan' },
  { name: 'plan-daily-recommendation.png', route: '/training-plan' },
  { name: 'plan-resource-detail.png', route: '/training-plan' },
  { name: 'plan-start-training.png', route: '/training-plan' },
  { name: 'plan-activate.png', route: '/training-plan' },

  // ================================================================
  //  Ch7 情绪行为模块
  // ================================================================
  { name: 'emotional-sidebar.png', route: '/emotional' },
  { name: 'emotional-home.png', route: '/emotional', wait: 4000 },
  { name: 'emotional-directions.png', route: '/emotional' },
  { name: 'emotional-scene-entry.png', route: '/emotional/emotion-scene/select', wait: 4000 },
  { name: 'emotional-scene-select.png', route: '/emotional/emotion-scene/select', wait: 4000 },
  { name: 'emotional-scene-session.png', route: '/emotional/emotion-scene' },
  { name: 'emotional-scene-steps.png', route: '/emotional/emotion-scene' },
  { name: 'emotional-scene-summary.png', route: '/emotional/session-summary' },
  { name: 'emotional-care-entry.png', route: '/emotional/care-expression/select', wait: 4000 },
  { name: 'emotional-care-scene-select.png', route: '/emotional/care-expression/select', wait: 4000 },
  { name: 'emotional-care-session.png', route: '/emotional/care-expression' },
  { name: 'emotional-care-guide.png', route: '/emotional/care-expression' },
  { name: 'emotional-care-expression.png', route: '/emotional/care-expression' },
  { name: 'emotional-games-list.png', route: '/emotional/menu', wait: 4000 },
  { name: 'emotional-game-fullscreen.png', route: '/emotional/games/balloon', wait: 3000 },
  { name: 'emotional-games-entry.png', route: '/emotional/menu', wait: 4000 },
  { name: 'emotional-report.png', route: '/emotional/report', wait: 4000 },
  { name: 'emotional-report-accuracy.png', route: '/emotional/report' },
  { name: 'emotional-report-radar.png', route: '/emotional/report' },
  { name: 'emotional-report-export.png', route: '/emotional/report' },

  // ================================================================
  //  Ch8 游戏训练
  // ================================================================
  { name: 'game-training-flow.png', route: '/games', wait: 4000 },
  { name: 'game-module-menu.png', route: '/games/menu', wait: 4000 },
  { name: 'game-select-student.png', route: '/games/select-student', wait: 4000 },
  { name: 'game-lobby.png', route: '/games', wait: 4000 },
  { name: 'emotional-game-lobby.png', route: '/emotional/menu', wait: 4000 },
  { name: 'game-playing.png', route: '/games/play', wait: 4000 },
  { name: 'iep-report.png', route: '/games/report', wait: 4000 },

  // ================================================================
  //  Ch9 器材训练
  // ================================================================
  { name: 'equipment-training-flow.png', route: '/equipment', wait: 4000 },
  { name: 'equipment-module-menu.png', route: '/equipment/menu', wait: 4000 },
  { name: 'equipment-select-student.png', route: '/equipment/select-student', wait: 4000 },
  { name: 'equipment-quick-entry.png', route: '/equipment', wait: 4000 },

  // ================================================================
  //  Ch10 训练记录
  // ================================================================
  { name: 'training-records-menu.png', route: '/training-records/menu', wait: 4000 },
  { name: 'module-training-records.png', route: '/training-records', wait: 4000 },
  { name: 'game-records-panel.png', route: '/games/records/sensory', wait: 4000 },
  { name: 'equipment-records-panel.png', route: '/training-records/equipment', wait: 4000 },

  // ================================================================
  //  Ch11 报告中心
  // ================================================================
  { name: 'report-center-overview.png', route: '/reports', wait: 4000 },
  { name: 'report-filters.png', route: '/reports' },
  { name: 'report-distribution.png', route: '/reports' },
  { name: 'report-list.png', route: '/reports' },
  { name: 'report-migration.png', route: '/reports' },

  // ================================================================
  //  Ch12 资源中心
  // ================================================================
  { name: 'resource-center-overview.png', route: '/resource-center', wait: 4000 },
  { name: 'training-resources.png', route: '/resource-center' },
  { name: 'resource-table.png', route: '/resource-center' },
  { name: 'resource-edit-dialog.png', route: '/resource-center' },
  { name: 'emotion-scene-editor.png', route: '/resource-center' },
  { name: 'resource-import-export.png', route: '/resource-center' },
  { name: 'resource-pack-import.png', route: '/resource-center' },
  { name: 'teaching-materials.png', route: '/resource-center' },
  { name: 'teaching-material-upload.png', route: '/resource-center' },
  { name: 'teaching-material-batch-import.png', route: '/resource-center' },

  // ================================================================
  //  Ch13 班级管理
  // ================================================================
  { name: 'ch13-class-list.png', route: '/class-management', wait: 4000 },
  { name: 'ch13-class-card.png', route: '/class-management' },
  { name: 'ch13-create-class.png', setup: async (page) => {
    await goto(page, '/class-management', 3000);
    const btn = page.locator('button:has-text("新建"), button:has-text("创建"), button:has-text("添加")').first();
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(1000); }
    await shot(page, 'ch13-create-class.png');
  }},
  { name: 'ch13-batch-create.png', setup: async (page) => {
    await goto(page, '/class-management', 3000);
    const btn = page.locator('button:has-text("批量")').first();
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(1000); }
    await shot(page, 'ch13-batch-create.png');
  }},
  { name: 'ch13-class-actions.png', route: '/class-management' },
  { name: 'ch13-academic-year.png', setup: async (page) => {
    await goto(page, '/class-management', 3000);
    const btn = page.locator('button:has-text("学年"), [class*="academic-year"]').first();
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(1000); }
    await shot(page, 'ch13-academic-year.png');
  }},

  // ================================================================
  //  Ch14 学生分班
  // ================================================================
  { name: 'ch14-student-assignment.png', route: '/student-class-assignment', wait: 4000 },
  { name: 'ch14-batch-assign.png', route: '/student-class-assignment' },
  { name: 'ch14-year-upgrade.png', route: '/student-class-assignment' },
  { name: 'ch14-remove-student.png', route: '/student-class-assignment' },

  // ================================================================
  //  Ch15 系统管理
  // ================================================================
  { name: 'ch15-system-main.png', route: '/system', wait: 4000 },
  { name: 'ch15-user-management.png', route: '/system' },
  { name: 'ch15-create-user.png', setup: async (page) => {
    await goto(page, '/system', 3000);
    const btn = page.locator('button:has-text("添加"), button:has-text("创建"), button:has-text("新增")').first();
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(1000); }
    await shot(page, 'ch15-create-user.png');
  }},
  { name: 'ch15-backup.png', setup: async (page) => {
    await goto(page, '/system', 3000);
    const tab = page.locator('[role="tab"]:has-text("备份"), [class*="tab"]:has-text("备份")').first();
    if (await tab.isVisible().catch(() => false)) { await tab.click(); await page.waitForTimeout(1000); }
    await shot(page, 'ch15-backup.png');
  }},
  { name: 'ch15-restore.png', route: '/system' },
  { name: 'ch15-settings.png', setup: async (page) => {
    await goto(page, '/system', 3000);
    const tab = page.locator('[role="tab"]:has-text("设置")').first();
    if (await tab.isVisible().catch(() => false)) { await tab.click(); await page.waitForTimeout(1000); }
    await shot(page, 'ch15-settings.png');
  }},
  { name: 'ch15-about.png', setup: async (page) => {
    await goto(page, '/system', 3000);
    const tab = page.locator('[role="tab"]:has-text("关于")').first();
    if (await tab.isVisible().catch(() => false)) { await tab.click(); await page.waitForTimeout(1000); }
    await shot(page, 'ch15-about.png');
  }},
  { name: 'ch15-activate.png', setup: async (page) => {
    await goto(page, '/system', 3000);
    const tab = page.locator('[role="tab"]:has-text("授权"), [role="tab"]:has-text("激活")').first();
    if (await tab.isVisible().catch(() => false)) { await tab.click(); await page.waitForTimeout(1000); }
    await shot(page, 'ch15-activate.png');
  }},
  { name: 'ch15-update.png', route: '/system' },
];

// 安装截图（无法自动捕获）
const INSTALLER_SHOTS = [
  'win-install-path.png', 'win-install-finish.png', 'mac-install-drag.png',
  'first-launch-activation.png', 'copy-machine-code.png', 'activation-success.png',
];

// ─── 登录 ─────────────────────────────────────────────

async function login(page) {
  await page.waitForTimeout(3000);
  const url = page.url();
  if (!url.includes('login')) {
    log('已处于登录状态，跳过登录');
    return;
  }
  log(`登录: ${LOGIN_USERNAME}`);
  await page.locator('input[autocomplete="username"], input[placeholder*="用户名"]').first().fill(LOGIN_USERNAME);
  await page.locator('input[type="password"]').first().fill(LOGIN_PASSWORD);
  await page.locator('button[type="submit"], button:has-text("登录")').first().click();
  await page.waitForTimeout(4000);
  ok(`登录完成，当前: ${page.url()}`);
}

// ─── 主流程 ─────────────────────────────────────────────

async function main() {
  console.log('📸 SCGP 全量截图工具 (125 处截图引用)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  // 清理残留进程
  log('清理残留进程...');
  await killPortProcess(VITE_PORT);
  try { await execAsync('taskkill /F /IM electron.exe 2>nul'); } catch {}

  // 启动 Vite
  await spawnVite();
  ok('Vite 就绪');

  // 使用 Playwright _electron.launch() 原生启动 Electron
  log('启动 Electron (Playwright 原生模式)...');
  app = await electron.launch({
    args: ['.'],
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      SCGP_DEV_SERVER_URL: DEV_SERVER_URL,
    },
  });

  // 获取第一个窗口
  const page = await app.firstWindow();
  ok('Electron 窗口已就绪');

  // 等待页面完全加载
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(5000);

  // 登录
  await login(page);

  // 开始截图
  console.log(`\n━━ 截图开始 (${scenes.length} 张) ━━\n`);
  log(`跳过 ${INSTALLER_SHOTS.length} 张安装截图（需手动补充）`);

  for (const scene of scenes) {
    try {
      if (scene.setup) {
        await scene.setup(page);
      } else {
        await goto(page, scene.route || '/', scene.wait || 3000);
        await shot(page, scene.name);
      }
    } catch (err) {
      fail(`${scene.name}: ${err.message.slice(0, 80)}`);
    }
  }

  // 关闭 Electron
  await app.close();

  // 结果汇总
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 截图完成: ${totalCaptured} 成功, ${totalFailed} 失败`);
  console.log(`   跳过安装截图: ${INSTALLER_SHOTS.length} 张（需手动补充）`);
  console.log(`   保存目录: ${SCREENSHOTS_DIR}\n`);

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png')).sort();
  for (const f of files) {
    const stat = fs.statSync(path.join(SCREENSHOTS_DIR, f));
    console.log(`   ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
  console.log(`\n   总计: ${files.length} 个文件`);
}

// ─── 清理 ─────────────────────────────────────────────

function cleanup() {
  try { app?.close(); } catch {}
  try { viteProcess?.kill(); } catch {}
}

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

main().catch(err => {
  fail(`截图失败: ${err.message}`);
  cleanup();
  process.exit(1);
});
