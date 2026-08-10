/**
 * SCGP 入门视频 — 录制引擎（record.mjs）
 *
 * 流程：隔离 userData（演示数据包）→ Vite + Electron dev → 登录 → 逐场景录屏
 * 录屏：ffmpeg gdigrab 按窗口标题抓取（真实像素，含光标与动画），每场景独立成片。
 *
 * 用法：
 *   node scripts/video/record.mjs --dry-run              # 只验证操作序列（有副作用，会写隔离库）
 *   node scripts/video/record.mjs                        # 正式录屏（每次先重置隔离库）
 *   node scripts/video/record.mjs --scenes 1-3           # 只录指定场景
 *
 * 产物：output/videos/raw/<scene-id>.mp4（无声底片）
 */

import { _electron as electron } from 'playwright';
import { spawn, exec, execSync } from 'child_process';
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
const STORYBOARD = JSON.parse(fs.readFileSync(path.join(__dirname, 'storyboard.json'), 'utf8'));

const VITE_PORT = Number(process.env.SCGP_VIDEO_PORT || 5174);
const DEV_CERT_PATH = path.join(ROOT_DIR, 'dev-cert.pem');
const DEV_KEY_PATH = path.join(ROOT_DIR, 'dev-key.pem');
const DEV_PROTOCOL = fs.existsSync(DEV_CERT_PATH) && fs.existsSync(DEV_KEY_PATH) ? 'https' : 'http';
const DEV_SERVER_URL = `${DEV_PROTOCOL}://localhost:${VITE_PORT}`;

const LOGIN_USERNAME = process.env.SCGP_VIDEO_USER || 'admin';
const LOGIN_PASSWORD = process.env.SCGP_VIDEO_PASSWORD || 'admin123';
const FFMPEG = process.env.SCGP_FFMPEG || STORYBOARD.project.ffmpeg;
const WINDOW_TITLE = '星愿能力发展训练系统';
const FPS = 15;

const DEMO_ZIP = path.join(ROOT_DIR, 'output', 'SCGP演示数据包-20260806.zip');
const WORK_DIR = path.join(ROOT_DIR, 'output', 'videos');
const RAW_DIR = path.join(WORK_DIR, 'raw');
const TTS_DIR = path.join(WORK_DIR, 'tts');
// 隔离 userData：每次运行用全新时间戳目录（放系统临时目录，避免 Vite 监视项目根 EBUSY；
// 新目录天然无锁冲突，也不影响用户自己打开的 Electron 应用）
const USER_DATA_DIR = process.env.SCGP_VIDEO_USER_DATA
  || path.join(os.tmpdir(), `scgp-video-${Date.now()}`);

let viteProcess = null;
let app = null;

function log(message) { console.log(`  ${message}`); }
function ok(message) { console.log(`  ✅ ${message}`); }
function fail(message) { console.log(`  ❌ ${message}`); }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function killPortProcess(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr ":${port} "`);
    const pids = new Set(
      stdout.trim().split('\n').map((l) => l.trim().split(/\s+/).pop()).filter((p) => p && !Number.isNaN(Number(p)))
    );
    for (const pid of pids) await execAsync(`taskkill /F /PID ${pid}`);
    if (pids.size > 0) await sleep(1500);
  } catch { /* no listener */ }
}

function spawnVite() {
  return new Promise((resolve, reject) => {
    viteProcess = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(VITE_PORT)], {
      cwd: ROOT_DIR,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ELECTRON: 'true' },
    });
    viteProcess.stderr?.on('data', (d) => process.stderr.write(d));
    viteProcess.on('error', reject);
    const startedAt = Date.now();
    const poll = () => {
      if (Date.now() - startedAt > 60_000) return reject(new Error('Vite 启动超时'));
      const url = new URL(DEV_SERVER_URL);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request({ hostname: url.hostname, port: url.port, path: '/', method: 'GET', rejectUnauthorized: false }, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode > 0 && res.statusCode < 500) resolve();
        else setTimeout(poll, 800);
      });
      req.on('error', () => setTimeout(poll, 800));
      req.setTimeout(3000, () => req.destroy());
      req.end();
    };
    setTimeout(poll, 2000);
  });
}

/** 重置隔离 userData：全新目录 → 从演示数据包解压 database.sqlite → 校验大小 */
function resetIsolatedUserData() {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  if (!fs.existsSync(DEMO_ZIP)) throw new Error(`演示数据包不存在: ${DEMO_ZIP}`);
  const sqlitePath = path.join(USER_DATA_DIR, 'database.sqlite');
  execSync(`tar -xf "${DEMO_ZIP}" -C "${USER_DATA_DIR}" database.sqlite`);
  if (!fs.existsSync(sqlitePath)) throw new Error('演示数据包中未找到 database.sqlite');
  // 校验：有效 SQLite 库（文件头 magic），防旧库/损坏库残留
  const magic = fs.readFileSync(sqlitePath).subarray(0, 16).toString('utf8');
  if (!magic.startsWith('SQLite format 3')) {
    throw new Error(`隔离库重置失败: 不是有效 SQLite 库（magic=${JSON.stringify(magic)}）`);
  }
  log(`隔离库就绪: ${sqlitePath}（${fs.statSync(sqlitePath).size} 字节）`);
}

/** 清理本运行留下的临时 userData（尽力而为；残留也无害，系统 temp 会自清） */
function cleanupUserData() {
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch { /* 被占用则留给系统清理 */ }
}

async function launchApp() {
  app = await electron.launch({
    args: ['.'],
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      ELECTRON: 'true',
      SCGP_DEV_SERVER_URL: DEV_SERVER_URL,
      SCGP_TEST_USER_DATA_DIR: USER_DATA_DIR,
    },
  });
  const page = await app.firstWindow();
  // dev 模式 main.mjs 会自动 openDevTools：挂监听，devtools 一打开就立即关闭（覆盖任意时机）
  await app.evaluate(({ BrowserWindow }) => {
    for (const win of BrowserWindow.getAllWindows()) {
      const wc = win.webContents;
      wc.on('devtools-opened', () => {
        if (wc.isDevToolsOpened()) wc.closeDevTools();
      });
      if (wc.isDevToolsOpened()) wc.closeDevTools();
    }
  }).catch(() => {});
  await maximizeWindow(page);
  return page;
}

async function maximizeWindow(page) {
  // main.mjs 强制 fullscreen:true；先退出全屏再设固定尺寸
  // （最大化/全屏会采集 3842x2402 物理像素，编码积压导致录屏失败）
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.setFullScreen(false);
      win.setBounds({ x: 0, y: 0, width: 1280, height: 800 });
    }
  });
  await page.waitForTimeout(1500);
}

/** 若停在激活页，注入完整激活缓存后重载（截图 fixture 同款机制 + 字段格式） */
const FULL_ALLOWED_MODULES = ['sensory', 'emotional', 'social', 'life_skills', 'cognitive'];

async function ensureActivated(page) {
  // 轮询等待真实路由就绪（hash 非空路径 #/xxx；#/ 空 hash 时重定向还没发生）
  let url = '';
  for (let i = 0; i < 30; i++) {
    url = page.url();
    if (/\/#\/[^/]/.test(url) || url.includes('/login')) break;
    await page.waitForTimeout(1000);
  }
  if (url.includes('/activation')) {
    log(`检测到激活页（url=${url}），注入演示激活缓存...`);
    await page.evaluate(async (allowedModules) => {
      const machineId = await window.electronAPI.getMachineId();
      const machineCode = String(machineId).slice(0, 16).toUpperCase();
      localStorage.setItem('sic_ads_activation_cache', JSON.stringify({
        version: '1.1',
        machineCode,
        activationCode: 'SPED-DEMO-MANUAL-CAPTURE',
        isActivated: true,
        isTrial: false,
        licenseType: 'full',
        allowedModules,
        cachedAt: new Date().toISOString(),
      }));
    }, FULL_ALLOWED_MODULES);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(3000);
    if (page.url().includes('/activation')) throw new Error('激活缓存注入后仍停在激活页');
  } else {
    log(`[ensureActivated] 轮询结束 url=${url}（未检测到激活页）`);
  }
}

async function login(page) {
  // 强制导航到登录页：激活通过则停留 /login，未激活会被守卫重定向回 activation
  await page.goto(`${DEV_SERVER_URL}/#/login`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2500);
  if (page.url().includes('/activation')) throw new Error('激活未通过（登录页被重定向回激活页）');
  if (!page.url().includes('/login')) { log('已登录，跳过登录'); return; }
  await page.locator('input[autocomplete="username"], input[placeholder*="用户名"]').first().fill(LOGIN_USERNAME);
  await page.locator('input[type="password"]').first().fill(LOGIN_PASSWORD);
  await page.locator('button[type="submit"], button:has-text("登录")').first().click();
  await page.waitForTimeout(3500);
  if (page.url().includes('/login')) throw new Error('登录失败（仍在登录页）');
}

/** 在应用页面注入教程聚焦框与虚拟光标；pointer-events:none，不影响真实操作 */
async function installTutorialOverlay(page) {
  await page.evaluate(() => {
    document.getElementById('scgp-video-overlay-style')?.remove();
    document.getElementById('scgp-video-highlight')?.remove();
    document.getElementById('scgp-video-cursor')?.remove();

    const style = document.createElement('style');
    style.id = 'scgp-video-overlay-style';
    style.textContent = `
      @keyframes scgp-video-pulse {
        0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 0 0 2px rgba(76, 132, 255, .95), 0 0 0 8px rgba(76, 132, 255, .16); background: rgba(76, 132, 255, .05); opacity: .95; }
        50% { transform: translateY(-7px) scale(1.06); box-shadow: 0 0 0 3px rgba(76, 132, 255, 1), 0 0 0 18px rgba(76, 132, 255, .05); background: rgba(76, 132, 255, .12); opacity: 1; }
      }
      @keyframes scgp-video-scan {
        0% { left: -50%; }
        100% { left: 115%; }
      }
      @keyframes scgp-video-cursor-pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(.88); box-shadow: 0 0 0 3px rgba(255,255,255,.9), 0 2px 10px rgba(25,55,120,.35); }
        50% { transform: translate(-50%, -50%) scale(1.12); box-shadow: 0 0 0 5px rgba(255,255,255,.72), 0 2px 15px rgba(25,55,120,.5); }
      }
    `;
    document.head.appendChild(style);

    const highlight = document.createElement('div');
    highlight.id = 'scgp-video-highlight';
    Object.assign(highlight.style, {
      position: 'fixed', zIndex: '2147483645', pointerEvents: 'none',
      border: '2px solid rgba(76, 132, 255, .95)', borderRadius: '10px', opacity: '0',
      overflow: 'hidden',
      transition: 'left .38s ease, top .38s ease, width .38s ease, height .38s ease, opacity .2s ease',
      animation: 'scgp-video-pulse 1.25s ease-in-out infinite',
    });
    document.body.appendChild(highlight);

    // 框内扫光条：持续移动，让等待/讲解阶段画面不静止（也引导观看位置）
    const scan = document.createElement('div');
    scan.className = 'scgp-video-scan';
    Object.assign(scan.style, {
      position: 'absolute', top: '0', bottom: '0', width: '45%', left: '-50%',
      background: 'linear-gradient(90deg, transparent, rgba(76,132,255,.30), transparent)',
      animation: 'scgp-video-scan 1.15s linear infinite',
    });
    highlight.appendChild(scan);

    const cursor = document.createElement('div');
    cursor.id = 'scgp-video-cursor';
    Object.assign(cursor.style, {
      position: 'fixed', zIndex: '2147483646', pointerEvents: 'none',
      width: '14px', height: '14px', borderRadius: '999px', background: '#4c84ff',
      left: '72%', top: '70%', opacity: '0',
      transition: 'left .42s cubic-bezier(.2,.8,.2,1), top .42s cubic-bezier(.2,.8,.2,1), opacity .2s ease',
      animation: 'scgp-video-cursor-pulse 1.25s ease-in-out infinite',
    });
    document.body.appendChild(cursor);
  });
}

/** 聚焦目标控件并把虚拟光标移动到目标中心 */
async function moveTutorialHighlight(page, selector) {
  if (!selector) return;
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return;
  await page.evaluate(({ x, y, width, height }) => {
    const highlight = document.getElementById('scgp-video-highlight');
    const cursor = document.getElementById('scgp-video-cursor');
    if (!highlight || !cursor) return;
    const pad = 5;
    Object.assign(highlight.style, {
      left: `${Math.max(2, x - pad)}px`, top: `${Math.max(2, y - pad)}px`,
      width: `${Math.max(24, width + pad * 2)}px`, height: `${Math.max(24, height + pad * 2)}px`, opacity: '1',
    });
    cursor.style.left = `${x + width * .76}px`;
    cursor.style.top = `${y + height * .55}px`;
    cursor.style.opacity = '1';
  }, box);
  await page.waitForTimeout(260);
}

/** 执行场景操作序列；waitScale 用于把操作节奏铺满旁白，避免动作结束后长时间静止 */
async function runActions(page, actions, waitScale = 1) {
  for (const action of actions || []) {
    if (action.selector && !action.type.startsWith('dump')) {
      await moveTutorialHighlight(page, action.selector);
    }
    switch (action.type) {
      case 'click': {
        const locator = page.locator(action.selector).first();
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        await locator.click({ timeout: 15_000 });
        break;
      }
      case 'fill': {
        const locator = page.locator(action.selector).first();
        await locator.fill(action.value, { timeout: 15_000 });
        break;
      }
      case 'select': {
        await page.locator(action.selector).first().selectOption(action.value, { timeout: 15_000 });
        break;
      }
      case 'pickDate': {
        await pickElementPlusDate(page, action.selector, action.value);
        break;
      }
      case 'focus': {
        await page.locator(action.selector).first().focus({ timeout: 10_000 });
        break;
      }
      case 'hover': {
        await page.locator(action.selector).first().hover({ timeout: 10_000 });
        break;
      }
      case 'scroll': {
        await page.mouse.wheel(0, action.value || 300);
        break;
      }
      case 'dump': {
        const items = await page.locator('.el-select-dropdown__item:visible').allInnerTexts().catch(() => ['(无下拉项)']);
        log(`  [dump] 下拉选项: ${JSON.stringify(items)}`);
        break;
      }
      case 'dumpTable': {
        const rows = await page.locator('.el-table__row, .class-item, .class-card').allInnerTexts().catch(() => []);
        log(`  [dumpTable] 表格/卡片: ${JSON.stringify(rows.slice(0, 12))}`);
        break;
      }
      case 'dumpDialog': {
        const text = await page.locator('.el-dialog:visible').last().innerText().catch(() => '(无可见对话框)');
        log(`  [dumpDialog] ${text.replace(/\s+/g, ' ').slice(0, 400)}`);
        break;
      }
      case 'dumpMessage': {
        const text = await page.locator('.el-message, .el-message-box').allInnerTexts().catch(() => []);
        log(`  [dumpMessage] ${JSON.stringify(text)}`);
        break;
      }
      default:
        throw new Error(`未知动作类型: ${action.type}`);
    }
    await page.waitForTimeout(Math.round((action.wait || 600) * waitScale));
  }
}

/**
 * Element Plus date-picker 面板选日期（editable:false 不能 fill）
 * 路径：点击输入框 → 点击年份 label → 年份表格翻页到目标年 → 选年 → 选月 → 选日
 */
async function pickElementPlusDate(page, selector, value) {
  const [y, m, d] = value.split('-').map(Number);
  const picker = page.locator(selector).first();
  await moveTutorialHighlight(page, selector);
  await picker.click({ timeout: 15_000 });

  // 打开年份视图：点击 header 的年 label（形如 "2026 年"）
  await moveTutorialHighlight(page, '.el-date-picker__header-label');
  await page.locator('.el-date-picker__header-label').first().click({ timeout: 8000 }).catch(() => {
    // 部分版本面板直接点 input 后需再点一次年 label 区域
  });

  // 年份表格翻页直到目标年出现（当前 decade 若已包含目标年则直接选）
  let yearFound = false;
  for (let i = 0; i < 10; i++) {
    const cell = page.locator('.el-year-table td:visible').filter({ hasText: String(y) }).first();
    if (await cell.isVisible().catch(() => false)) {
      await moveTutorialHighlight(page, `.el-year-table td:visible:has-text("${y}")`);
      await cell.click();
      yearFound = true;
      break;
    }
    const prev = page.locator('.el-picker-panel__icon-btn[aria-label="前一年"], .el-picker-panel__icon-btn.d-arrow-left').first();
    await moveTutorialHighlight(page, '.el-picker-panel__icon-btn.d-arrow-left');
    await prev.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  if (!yearFound) {
    const panelHtml = await page
      .evaluate(() => {
        const panel = document.querySelector('.el-picker-panel');
        return panel ? panel.innerHTML : '(无面板)';
      })
      .catch(() => '(无法读取面板 HTML)');
    fs.mkdirSync(RAW_DIR, { recursive: true });
    const debugPath = path.join(RAW_DIR, 'debug-panel.html');
    fs.writeFileSync(debugPath, panelHtml);
    throw new Error(`pickDate: 无法在年份表格找到 ${y} 年（面板 HTML 已写入 ${debugPath}）`);
  }

  // 月份表格（EP 中文 locale 月份名为 "一月"~"十二月"）
  const CN_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const monthCell = page.locator('.el-month-table td:visible').filter({ hasText: CN_MONTHS[m - 1] }).first();
  if (!(await monthCell.isVisible().catch(() => false))) {
    throw new Error(`pickDate: 月份表格找不到 ${CN_MONTHS[m - 1]}（当前面板: ${await page.evaluate(() => document.querySelector('.el-picker-panel')?.innerHTML.slice(0, 500))}）`);
  }
  await moveTutorialHighlight(page, `.el-month-table td:visible:has-text("${CN_MONTHS[m - 1]}")`);
  await monthCell.click({ timeout: 8000 });
  // 日期表格
  await moveTutorialHighlight(page, `.el-date-table td:visible:has-text("${d}")`);
  await page.locator('.el-date-table td:visible').filter({ hasText: String(d) }).first().click({ timeout: 8000 });
}

/** 读旁白 mp3 时长（秒）；旁白必须先于录屏生成 */
function probeNarrationDuration(sceneId) {
  const mp3 = path.join(TTS_DIR, `${sceneId}.mp3`);
  if (!fs.existsSync(mp3)) throw new Error(`${sceneId}: 旁白不存在（${mp3}），请先运行 node scripts/video/narrate.mjs`);
  const out = execSync(
    `"${FFMPEG.replace('ffmpeg.exe', 'ffprobe.exe')}" -v error -show_entries format=duration -of csv=p=0 "${mp3}"`,
    { encoding: 'utf8' }
  );
  return Number(out.trim());
}

/** 录单场景：准备页面 → 起 ffmpeg（按窗口实际区域）→ 表演 → 按旁白时长留足画面 → 停 ffmpeg */
async function recordScene(page, scene) {
  const outPath = path.join(RAW_DIR, `${scene.id}.mp4`);
  fs.mkdirSync(RAW_DIR, { recursive: true });

  const narrationDuration = probeNarrationDuration(scene.id);
  const targetDuration = narrationDuration + 2.6; // 0.6s 前导 + 2s 尾留
  log(`旁白 ${narrationDuration.toFixed(1)}s → 场景目标录制 ${targetDuration.toFixed(1)}s`);

  log(`准备场景 ${scene.id} (${scene.name}): ${DEV_SERVER_URL}/#${scene.route}`);
  await page.goto(`${DEV_SERVER_URL}/#${scene.route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(scene.wait || 1500);
  await installTutorialOverlay(page);

  // 窗口物理坐标（DIP × scaleFactor），gdigrab 区域录制比按标题匹配更可靠
  const bounds = await app.evaluate(({ BrowserWindow, screen }) => {
    const win = BrowserWindow.getAllWindows()[0];
    const b = win.getBounds();
    const d = screen.getDisplayMatching(b);
    return { x: b.x, y: b.y, width: b.width, height: b.height, scale: d.scaleFactor || 1 };
  });
  const phys = {
    x: Math.round(bounds.x * bounds.scale),
    y: Math.round(bounds.y * bounds.scale),
    w: Math.round(bounds.width * bounds.scale),
    h: Math.round(bounds.height * bounds.scale),
  };
  log(`  窗口区域: ${phys.w}x${phys.h} @(${phys.x},${phys.y}) scale=${bounds.scale}`);

  log(`开始录屏 ${scene.id}...`);
  const ffmpeg = spawn(FFMPEG, [
    '-y', '-f', 'gdigrab', '-framerate', '12',
    '-video_size', `${phys.w}x${phys.h}`,
    '-offset_x', String(phys.x), '-offset_y', String(phys.y),
    '-i', 'desktop',
    '-vf', 'scale=1280:800',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
    outPath,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let ffmpegFailed = null;
  ffmpeg.stderr?.on('data', (d) => {
    const s = String(d);
    if (s.includes('I/O error') || s.includes('aborting') || s.includes('Error')) {
      ffmpegFailed = (ffmpegFailed || '') + s;
    }
  });
  await sleep(1000);
  const recordStartedAt = Date.now();
  const configuredWaitS = (scene.actions || []).reduce((sum, action) => sum + (action.wait || 600), 0) / 1000;
  // 录制在动作前已有约 1s 前导，旁白从 0.6s 开始；让动作基本贯穿到旁白结束
  // 最终成片会在旁白后保留约 1.4s 收尾，不再长时间静止
  const targetActionS = Math.max(configuredWaitS, narrationDuration - 0.2);
  const waitScale = configuredWaitS > 0 ? Math.max(1, targetActionS / configuredWaitS) : 1;
  log(`  动作节奏倍率: ${waitScale.toFixed(2)}x（目标贯穿旁白）`);

  try {
    await runActions(page, scene.actions, waitScale);
    // 画面停留到旁白讲完：不足目标时长则继续静态展示（讲解当前页面的节奏）
    const elapsed = (Date.now() - recordStartedAt) / 1000;
    const remaining = targetDuration - elapsed;
    if (remaining > 0) {
      log(`  画面停留 ${remaining.toFixed(1)}s（等旁白节奏）`);
      await page.waitForTimeout(remaining * 1000);
    }
    await page.waitForTimeout(1400); // 尾留：让结果动画/提示完整呈现
  } finally {
    // ffmpeg 优雅停止：stdin 写 'q'（标准做法；SIGINT 在 Windows 上是强杀，会丢 moov 损坏 mp4）
    try { ffmpeg.stdin.write('q'); } catch { /* 已退出 */ }
  }
  await new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // 兜底强杀，避免残留进程
      try { execSync(`taskkill /F /PID ${ffmpeg.pid} /T`, { stdio: 'ignore' }); } catch {}
      reject(new Error('ffmpeg 录屏优雅停止超时，已强制结束'));
    }, 60_000);
    ffmpeg.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0 || ffmpegFailed) reject(new Error(`ffmpeg 录屏失败 (exit=${code}): ${(ffmpegFailed || '').slice(0, 300)}`));
      else resolve();
    });
  });
  const outStat = fs.statSync(outPath);
  if (outStat.size === 0) throw new Error(`ffmpeg 未产出有效视频: ${outPath}`);
  ok(`场景 ${scene.id} 已录: ${outPath}（${(outStat.size / 1024 / 1024).toFixed(1)} MB）`);
  return outPath;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const scenesArg = args.find((a) => a.startsWith('--scenes='));
  const allScenes = STORYBOARD.scenes;
  let scenes = allScenes;
  if (scenesArg) {
    const [from, to] = scenesArg.split('=')[1].split('-').map(Number);
    scenes = allScenes.slice(from - 1, to);
  }

  console.log('🎬 SCGP 入门视频录制引擎');
  console.log(`  模式: ${dryRun ? 'DRY-RUN（验证操作，不录屏）' : '正式录屏'}`);
  console.log(`  场景: ${scenes.map((s) => s.id).join(', ')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!dryRun) resetIsolatedUserData();
  else { fs.mkdirSync(USER_DATA_DIR, { recursive: true }); if (!fs.existsSync(path.join(USER_DATA_DIR, 'database.sqlite'))) resetIsolatedUserData(); }

  await killPortProcess(VITE_PORT);
  await spawnVite();
  ok('Vite 就绪');

  const page = await launchApp();
  ok('Electron 窗口就绪');
  await ensureActivated(page);
  await login(page);
  ok(`已登录: ${LOGIN_USERNAME}`);

  const failures = [];
  for (const scene of scenes) {
    try {
      if (dryRun) {
        log(`校验场景 ${scene.id}: ${scene.name}`);
        await page.goto(`${DEV_SERVER_URL}/#${scene.route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(scene.wait || 1500);
        const url = page.url();
        const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '(无法读取 body)');
        log(`  [debug] url=${url}`);
        log(`  [debug] body=${bodyText.replace(/\s+/g, ' ').slice(0, 180)}`);
        await runActions(page, scene.actions);
        ok(`场景 ${scene.id} 操作序列通过`);
      } else {
        await recordScene(page, scene);
      }
    } catch (error) {
      failures.push({ id: scene.id, error: error.message });
      fail(`场景 ${scene.id}: ${error.message.slice(0, 200)}`);
      if (dryRun) break; // dry-run 失败即停，避免后续场景连锁失败
    }
  }

  await app.close().catch(() => {});
  app = null;
  viteProcess?.kill();
  cleanupUserData();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (failures.length === 0) console.log(`📊 ${dryRun ? '操作校验' : '录屏'}完成: ${scenes.length} 场景全部通过`);
  else console.log(`📊 完成，${failures.length} 个失败: ${failures.map((f) => f.id).join(', ')}`);
  if (failures.length > 0) process.exitCode = 1;
}

function cleanup() {
  try { app?.close(); } catch {}
  try { viteProcess?.kill(); } catch {}
  cleanupUserData();
}
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

main().catch((error) => { cleanup(); console.error('❌ 录制失败:', error); process.exit(1); });
