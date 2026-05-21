/**
 * SCGP 产品使用说明书 — Electron + Playwright 截图脚本
 *
 * 范围：只截取激活成功并可登录后的业务页面。
 * 登录页、未激活页、等待激活页、安装器页面由人工截图补充。
 *
 * 推荐环境：Deepin 25 / 1920x1080 / 系统缩放 100% / Electron 窗口最大化。
 *
 * 用法：
 *   node scripts/manual/capture-electron-screenshots.mjs
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

import { flattenScreenshotScenes, manualScreenshotFiles } from './screenshot-scenes.mjs';
import {
  captureRegion,
  detectBlockedPage,
  gotoAndAssert,
  hashFile,
  waitForAppIdle,
} from './screenshot-helpers.mjs';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..', '..');
const SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots');

const VITE_PORT = Number(process.env.SCGP_SCREENSHOT_PORT || 5173);
const DEV_CERT_PATH = path.join(ROOT_DIR, 'dev-cert.pem');
const DEV_KEY_PATH = path.join(ROOT_DIR, 'dev-key.pem');
const DEV_PROTOCOL =
  fs.existsSync(DEV_CERT_PATH) && fs.existsSync(DEV_KEY_PATH) ? 'https' : 'http';
const DEV_SERVER_URL = `${DEV_PROTOCOL}://localhost:${VITE_PORT}`;

const LOGIN_USERNAME = process.env.SCGP_SCREENSHOT_USER || 'admin';
const LOGIN_PASSWORD = process.env.SCGP_SCREENSHOT_PASSWORD || 'admin123';

let viteProcess = null;
let app = null;
let totalCaptured = 0;
let totalFailed = 0;

function log(message) {
  console.log(`  ${message}`);
}

function ok(message) {
  totalCaptured += 1;
  console.log(`  ✅ ${message}`);
}

function fail(message) {
  totalFailed += 1;
  console.log(`  ❌ ${message}`);
}

async function killPortProcess(port) {
  const platform = os.platform();
  const command = platform === 'win32'
    ? `netstat -ano | findstr ":${port} "`
    : `lsof -nP -iTCP:${port} -sTCP:LISTEN`;

  try {
    const { stdout } = await execAsync(command);
    const lines = stdout.trim().split('\n').filter(Boolean);
    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = platform === 'win32' ? parts[parts.length - 1] : parts[1];
      if (pid && !Number.isNaN(Number(pid))) pids.add(pid);
    }

    for (const pid of pids) {
      await execAsync(platform === 'win32' ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`);
    }

    if (pids.size > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
  } catch {
    // No listener on the port, or platform utility unavailable.
  }
}

function spawnVite() {
  return new Promise((resolve, reject) => {
    log(`启动 Vite: ${DEV_SERVER_URL}`);
    viteProcess = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(VITE_PORT)], {
      cwd: ROOT_DIR,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ELECTRON: 'true',
      },
    });

    viteProcess.stdout?.on('data', (data) => process.stdout.write(data));
    viteProcess.stderr?.on('data', (data) => process.stderr.write(data));
    viteProcess.on('error', reject);

    const startedAt = Date.now();
    const poll = () => {
      if (Date.now() - startedAt > 60_000) {
        reject(new Error('Vite 启动超时'));
        return;
      }

      const url = new URL(DEV_SERVER_URL);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: '/',
          method: 'GET',
          rejectUnauthorized: false,
        },
        (res) => {
          res.resume();
          if (res.statusCode && res.statusCode > 0 && res.statusCode < 500) resolve();
          else setTimeout(poll, 800);
        }
      );
      req.on('error', () => setTimeout(poll, 800));
      req.setTimeout(3000, () => req.destroy());
      req.end();
    };

    setTimeout(poll, 2000);
  });
}

async function maximizeWindow(page) {
  const browserWindow = await app.browserWindow(page);
  await browserWindow.maximize();
  await page.setViewportSize({ width: 1920, height: 1080 }).catch(() => {});
  await waitForAppIdle(page, 1000);

  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  })).catch(() => null);

  if (metrics) {
    log(`窗口视口: ${metrics.innerWidth}x${metrics.innerHeight}, DPR=${metrics.devicePixelRatio}`);
  }
}

async function login(page) {
  await waitForAppIdle(page, 2500);

  if (page.url().includes('/activation')) {
    throw new Error('当前仍在激活页。请先人工完成激活，再运行业务截图脚本。');
  }

  if (!page.url().includes('/login')) {
    log('已处于登录后页面，跳过登录表单');
    return;
  }

  log(`登录用户: ${LOGIN_USERNAME}`);
  await page.locator('input[autocomplete="username"], input[placeholder*="用户名"]').first().fill(LOGIN_USERNAME);
  await page.locator('input[type="password"]').first().fill(LOGIN_PASSWORD);
  await page.locator('button[type="submit"], button:has-text("登录")').first().click();
  await waitForAppIdle(page, 3000);
}

async function assertBusinessShell(page) {
  const blockedReason = await detectBlockedPage(page, { name: 'post-login-shell' });
  if (blockedReason) {
    throw new Error(`登录后未进入业务区：${blockedReason}`);
  }

  await page.getByText('系统首页', { exact: false }).first().waitFor({
    state: 'visible',
    timeout: 15_000,
  }).catch(async () => {
    await gotoAndAssert(page, DEV_SERVER_URL, {
      name: 'dashboard-start',
      route: '/dashboard',
      assertText: '系统首页',
    });
  });
}

async function captureScene(page, scene, seenHashes) {
  const outputPath = path.resolve(SCREENSHOTS_DIR, scene.name);

  if (scene.setup) {
    await scene.setup(page, DEV_SERVER_URL);
    await waitForAppIdle(page, scene.wait || 800);
  } else {
    await gotoAndAssert(page, DEV_SERVER_URL, scene);
  }

  const blockedReason = await detectBlockedPage(page, scene);
  if (blockedReason) throw new Error(blockedReason);

  await captureRegion(page, outputPath, scene);

  const hash = hashFile(outputPath);
  const duplicateOf = seenHashes.get(hash);
  if (duplicateOf) {
    fs.rmSync(outputPath, { force: true });
    throw new Error(`duplicate screenshot of ${duplicateOf}`);
  }
  seenHashes.set(hash, scene.name);
}

async function main() {
  const scenes = flattenScreenshotScenes();

  console.log('📸 SCGP 说明书业务截图工具\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`自动截图范围: 激活后业务页面 (${scenes.length} 张)`);
  console.log(`人工截图跳过: ${manualScreenshotFiles.length} 张`);
  console.log('推荐环境: Deepin 25 / 1920x1080 / 缩放 100% / 窗口最大化');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  log('清理开发端口残留进程...');
  await killPortProcess(VITE_PORT);

  await spawnVite();
  ok('Vite 就绪');

  log('启动 Electron...');
  app = await electron.launch({
    args: ['.'],
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      ELECTRON: 'true',
      SCGP_DEV_SERVER_URL: DEV_SERVER_URL,
    },
  });

  const page = await app.firstWindow();
  ok('Electron 窗口已就绪');

  await maximizeWindow(page);
  await login(page);
  await assertBusinessShell(page);
  ok('已进入激活后的业务区');

  log(`跳过人工截图: ${manualScreenshotFiles.join(', ')}`);

  const seenHashes = new Map();
  console.log(`\n━━ 截图开始 (${scenes.length} 张) ━━\n`);

  for (const scene of scenes) {
    try {
      await captureScene(page, scene, seenHashes);
      ok(`${scene.chapter} / ${scene.name}`);
    } catch (error) {
      fail(`${scene.chapter} / ${scene.name}: ${error.message.slice(0, 160)}`);
    }
  }

  await app.close();
  app = null;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 截图完成: ${totalCaptured} 成功, ${totalFailed} 失败`);
  console.log(`   保存目录: ${SCREENSHOTS_DIR}`);

  const files = fs.readdirSync(SCREENSHOTS_DIR)
    .filter((file) => file.endsWith('.png'))
    .sort();

  console.log(`   当前 PNG 文件总数: ${files.length}`);
}

function cleanup() {
  try { app?.close(); } catch {}
  try { viteProcess?.kill(); } catch {}
}

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

main().catch((error) => {
  cleanup();
  console.error('❌ 截图脚本失败:', error);
  process.exit(1);
});

