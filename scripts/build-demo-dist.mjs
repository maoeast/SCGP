// 构建演示数据分发包：生成纯净演示库（42 名学生 / 12 班 / 17 量表 / AI 数据）+ 导入说明 + zip
// 用法：node scripts/build-demo-dist.mjs
// 产物：output/demo-dist/SCGP演示数据包-YYYYMMDD.zip
//
// 底库来源（2026-09-20 起改为应用自建库）：
//   用 SCGP_TEST_USER_DATA_DIR 隔离启动 Electron dev（截图系统同款机制，main.mjs L127），
//   应用初始化最新 schema + 全量预置资源，退出后取其 database.sqlite 作为底库。
//   （旧 fixture 库 output/manual-screenshot-capture/runs/... 已被冗余清理删除）
//   注：库随包分发，资源文件本体不入包（应用启动后 resource:// 按包内 assets/resources 读取预置资源）
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const WORK_DIR = path.join(repoRoot, 'output', 'demo-dist')
const CLEAN_DB = path.join(WORK_DIR, 'database.sqlite')
const README_PATH = path.join(WORK_DIR, '导入说明.md')
// ⚠️ 底库 userData 必须放在 vite watch 范围外（repoRoot 之外）：
// vite dev 的 chokidar 会监听整个项目目录，Electron userData 下的高频小文件
// （Cookies-journal 等）会让 watcher 抛 EBUSY 直接崩溃（2026-09-20 实测）。
const BASE_USER_DATA = path.join(os.tmpdir(), 'scgp-demo-dist-base-user-data')

async function buildBaseDatabase() {
  fs.rmSync(BASE_USER_DATA, { recursive: true, force: true })
  fs.mkdirSync(BASE_USER_DATA, { recursive: true })

  // 底库生成走截图系统同款链路：playwright _electron.launch（隔离 userData）
  // + 渲染端初始化最新 schema + 一次显式写库触发 SQLWrapper.saveNow 落盘。
  // 注意：应用只建内存库，无写操作不落盘——必须执行一次写。
  console.log('[1/5] 启动 Electron（playwright）生成最新 schema 底库 ...')
  const { _electron: electron } = await import('playwright')
  const port = await findAvailablePort(5180, 5280)
  const vite = spawnVite(port)
  const viteUrl = await waitForVite(vite, port)

  const app = await electron.launch({
    args: ['.'],
    cwd: repoRoot,
    env: {
      ...process.env,
      ELECTRON: 'true',
      SCGP_DEV_SERVER_URL: viteUrl,
      SCGP_TEST_USER_DATA_DIR: BASE_USER_DATA,
    },
  })
  try {
    const page = await app.firstWindow()
    await page.waitForFunction(() => Boolean(window.electronAPI && window.db), undefined, { timeout: 120_000 })
    await page.waitForTimeout(3000) // 等应用级种子（资源/AI 表）完成
    // 直写落盘：export 当前内存库 + electronAPI 原子写（能拿到 success 返回值）。
    // 不用 db.saveNow()——SQLWrapper 防抖队列可能在种子早期 export 的旧快照上再落盘一次，
    // 把刚写的完整库覆盖回小文件（2026-09-20 实测 2.4MB → 16KB 回退）。
    const saveResult = await page.evaluate(async () => {
      window.db.run(
        "INSERT OR REPLACE INTO system_config (key, value, description) VALUES ('demo_dist_bootstrap', ?, '演示包底库生成标记')",
        [new Date().toISOString()],
      )
      const data = window.db.export()
      const result = await window.electronAPI.saveDatabaseAtomic(data, 'database.sqlite')
      return { success: result?.success === true, size: data.byteLength }
    })
    if (!saveResult.success) throw new Error(`底库直写失败: ${JSON.stringify(saveResult)}`)
    // 等文件大小稳定在合理值（≥1MB），确认没有更晚的旧快照覆盖
    const dbPath = path.join(BASE_USER_DATA, 'database.sqlite')
    const started = Date.now()
    let lastSize = -1
    while (Date.now() - started < 30_000) {
      const size = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0
      if (size === lastSize && size >= 1_000_000) break
      lastSize = size
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    if (lastSize < 1_000_000) throw new Error(`底库体积异常（${lastSize} bytes），可能被旧快照覆盖`)
  } finally {
    await app.close().catch(() => {})
    vite.kill()
  }

  const dbPath = path.join(BASE_USER_DATA, 'database.sqlite')
  if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size < 200_000) {
    throw new Error(`底库未生成或体积异常: ${dbPath}`)
  }
  fs.copyFileSync(dbPath, CLEAN_DB)
  console.log(`[1/5] 底库已生成: ${CLEAN_DB}（${(fs.statSync(CLEAN_DB).size / 1024 / 1024).toFixed(1)} MB）`)
}

async function findAvailablePort(start, end) {
  const net = await import('node:net')
  for (let p = start; p <= end; p += 1) {
    const free = await new Promise((resolve) => {
      const server = net.createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => server.close(() => resolve(true)))
      server.listen(p, '127.0.0.1')
    })
    if (free) return p
  }
  throw new Error(`No available port in ${start}-${end}`)
}

function spawnVite(port) {
  return spawn(process.execPath, [
    path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
    '--host', '127.0.0.1', '--port', String(port), '--strictPort',
  ], { cwd: repoRoot, stdio: 'ignore' })
}

async function waitForVite(viteProcess, port) {
  const https = await import('node:https')
  const http = await import('node:http')
  const useHttps = fs.existsSync(path.join(repoRoot, 'dev-cert.pem')) && fs.existsSync(path.join(repoRoot, 'dev-key.pem'))
  const url = `${useHttps ? 'https' : 'http'}://127.0.0.1:${port}`
  const client = useHttps ? https : http
  const started = Date.now()
  while (Date.now() - started < 60_000) {
    if (viteProcess.exitCode !== null) throw new Error(`Vite exited early: ${viteProcess.exitCode}`)
    const ok = await new Promise((resolve) => {
      const req = client.request({ hostname: '127.0.0.1', port, path: '/', rejectUnauthorized: false, timeout: 3000 }, (res) => {
        res.resume()
        resolve(res.statusCode > 0 && res.statusCode < 500)
      })
      req.on('error', () => resolve(false))
      req.end()
    })
    if (ok) return url
    await new Promise((resolve) => setTimeout(resolve, 800))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function inspectBaseDb() {
  console.log('[2/5] 底库盘点 + 清除构建标记行 ...')
  const inspectSql = `
    const fs = require('fs')
    const path = require('path')
    const initSqlJs = require('sql.js')
    initSqlJs({ locateFile: (f) => path.join(${JSON.stringify(path.join(repoRoot, 'node_modules', 'sql.js', 'dist'))}, f) }).then((SQL) => {
      const db = new SQL.Database(fs.readFileSync(process.argv[1]))
      const q = (s) => { try { return db.exec(s)[0]?.values ?? [] } catch { return [] } }
      console.log('BASE users:', q('SELECT COUNT(*) FROM user')[0][0])
      console.log('BASE classes:', q('SELECT COUNT(*) FROM sys_class')[0][0])
      console.log('BASE students:', q('SELECT COUNT(*) FROM student')[0][0])
      console.log('BASE resources:', q('SELECT COUNT(*) FROM sys_training_resource')[0][0])
      // 清除底库生成阶段的标记行，不随分发包发给客户
      db.run("DELETE FROM system_config WHERE key = 'demo_dist_bootstrap'")
      fs.writeFileSync(process.argv[1], Buffer.from(db.export()))
    })
  `
  const res = spawnSync(process.execPath, ['-e', inspectSql, CLEAN_DB], { cwd: repoRoot, encoding: 'utf8' })
  if (res.status !== 0) {
    console.error('底库盘点失败:', res.stderr)
    process.exit(1)
  }
  console.log(res.stdout.trim())
}

function seedDemoData() {
  console.log('[3/5] seed 演示数据 ...')
  const seed = spawnSync(process.execPath, ['scripts/seed-demo-data.mjs', 'seed', '--db', CLEAN_DB, '--summary'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (seed.status !== 0) {
    console.error('seed 失败:', seed.stderr)
    process.exit(1)
  }
  console.log(seed.stdout.trim())
}

function verifyCleanDb() {
  console.log('[4/5] 校验 ...')
  const verifySql2 = `
    const fs = require('fs')
    const path = require('path')
    const initSqlJs = require('sql.js')
    initSqlJs({ locateFile: (f) => path.join(${JSON.stringify(path.join(repoRoot, 'node_modules', 'sql.js', 'dist'))}, f) }).then((SQL) => {
      const db = new SQL.Database(fs.readFileSync(process.argv[1]))
      const q = (s) => (db.exec(s)[0] || { values: [] }).values
      const students = q('SELECT COUNT(*) FROM student')[0][0]
      const demoStudents = q('SELECT COUNT(*) FROM student WHERE id BETWEEN 10001 AND 10042')[0][0]
      const fixture = q('SELECT COUNT(*) FROM student WHERE id < 10001')[0][0]
      const classes = q("SELECT COUNT(*) FROM sys_class WHERE academic_year='2026-2027'")[0][0]
      const histories = q('SELECT COUNT(*) FROM student_class_history WHERE is_current = 0')[0][0]
      // 每个量表在 report_record 都有记录
      const covered = q("SELECT COUNT(*) FROM (" +
        "SELECT 'sm' t UNION SELECT 'weefim' UNION SELECT 'csirs' UNION SELECT 'cnbsr2016' UNION SELECT 'fine_motor' UNION SELECT 'crt' UNION SELECT 'srs2' UNION SELECT 'conners-psq' UNION SELECT 'conners-trs' UNION SELECT 'sdq' UNION SELECT 'cbcl' UNION SELECT 'brief' UNION SELECT 'abc' UNION SELECT 'atec' UNION SELECT 'cpep_3' UNION SELECT 'gmfm_88' UNION SELECT 'tgmd_3'" +
        ") scales WHERE EXISTS (SELECT 1 FROM report_record r WHERE r.report_type = scales.t)")[0][0]
      const enrollOk = q('SELECT COUNT(*) FROM sys_class c WHERE c.current_enrollment != (SELECT COUNT(*) FROM student_class_history h WHERE h.class_id = c.id AND h.is_current = 1)')[0][0]
      const septTraining = q("SELECT COUNT(*) FROM training_records WHERE timestamp >= strftime('%s','2026-09-01') * 1000")[0][0]
      const aiSessions = q('SELECT COUNT(*) FROM ai_chat_session')[0][0]
      const aiMemories = q('SELECT COUNT(*) FROM ai_student_memory')[0][0]
      const memConfirmed = q("SELECT COUNT(*) FROM ai_student_memory WHERE status='confirmed'")[0][0]
      const ok = students === demoStudents && fixture === 0 && classes === 12 && histories > 0
        && covered === 17 && enrollOk === 0 && septTraining > 0 && aiSessions > 0 && memConfirmed > 0
      console.log(JSON.stringify({ students, demoStudents, fixture, classes, histories, covered, enrollOk, septTraining, aiSessions, aiMemories, memConfirmed }))
      console.log(ok ? 'PASS 校验' : 'FAIL 校验')
      process.exit(ok ? 0 : 1)
    })
  `
  const verify = spawnSync(process.execPath, ['-e', verifySql2, CLEAN_DB], { cwd: repoRoot, encoding: 'utf8' })
  if (verify.status !== 0) {
    console.error('校验失败:', verify.stderr)
    process.exit(1)
  }
  console.log(verify.stdout.trim())
}

function writeReadme() {
  fs.writeFileSync(README_PATH, README_CONTENT, 'utf8')
}

function packZip() {
  console.log('[5/5] 打包 zip ...')
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const zipPath = path.join(repoRoot, 'output', `SCGP演示数据包-${stamp}.zip`)
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
  const ps = `Compress-Archive -Path '${WORK_DIR}\\database.sqlite','${WORK_DIR}\\一键导入演示数据.bat','${WORK_DIR}\\导入说明.md' -DestinationPath '${zipPath}' -Force`
  const zip = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
  if (zip.status !== 0) {
    console.error('打包失败:', zip.stderr)
    process.exit(1)
  }
  console.log(`已打包: ${zipPath}`)
  return zipPath
}

function main() {
  fs.mkdirSync(WORK_DIR, { recursive: true })
  // 一键导入脚本存放在 scripts/demo-dist-assets/（GBK 编码二进制，入库存源）
  const batSource = path.join(repoRoot, 'scripts', 'demo-dist-assets', '一键导入演示数据.bat')
  if (!fs.existsSync(batSource)) {
    console.error(`缺少一键导入脚本: ${batSource}`)
    process.exit(1)
  }
  buildBaseDatabase()
    .then(() => {
      inspectBaseDb()
      seedDemoData()
      verifyCleanDb()
      writeReadme()
      fs.copyFileSync(batSource, path.join(WORK_DIR, '一键导入演示数据.bat'))
      packZip()
      fs.rmSync(BASE_USER_DATA, { recursive: true, force: true })
      console.log('完成。包内容: database.sqlite + 一键导入演示数据.bat + 导入说明.md')
    })
    .catch((error) => {
      console.error('[build-demo-dist] 失败:', error.message)
      process.exit(1)
    })
}

const README_CONTENT = `# SCGP 星愿能力发展平台 · 演示数据包

本包包含一份**完整的演示数据库**（42 名学生、12 个班级、17 个评估量表全覆盖、AI 助手对话与学生记忆、上学期+本学期训练记录），
安装应用后按以下步骤导入即可体验全部功能。

## 一键导入（推荐，Windows）

1. 解压本包，得到 \`database.sqlite\` 与 \`一键导入演示数据.bat\`（两文件需在同一文件夹）。
2. 安装 SCGP 应用并启动一次后**完全退出**（若未退出，脚本会自动检测并关闭）。
3. 双击 \`一键导入演示数据.bat\` —— 脚本自动完成：检测/关闭 SCGP → **自动备份原库**（到 \`%APPDATA%\\scgp\\backups\\\`）→ 替换为演示库。
4. 重新启动应用，使用下方演示账号登录。

恢复学校真实数据：退出 SCGP，把 \`%APPDATA%\\scgp\\backups\\\` 里的备份文件复制回 \`%APPDATA%\\scgp\\database.sqlite\`。

## 手动导入（备用 / macOS·Linux）

1. **安装并启动一次应用**，进入登录页后退出（首次启动会创建数据目录）。
2. 按系统类型找到数据库文件，**先备份原文件**（复制一份改名保存）：
   - Windows：\`C:\\Users\\<你的用户名>\\AppData\\Roaming\\scgp\\database.sqlite\`
   - macOS：\`~/Library/Application Support/scgp/database.sqlite\`
   - Linux：\`~/.config/scgp/database.sqlite\`
3. **完全退出应用**（确认托盘/后台没有残留进程）。
4. 用本包中的 \`database.sqlite\` **覆盖**上述文件。
5. 重新启动应用，使用演示账号登录：

| 账号 | 密码 | 角色 |
|---|---|---|
| admin | admin123 | 系统管理员 |
| teacher01 ~ teacher05 | admin123 | 特教教师 |

## 演示数据内容

- 学生：42 人（幼儿园小班 ~ 初三 12 个班，每班 3-4 人，头像/诊断类型齐备）
- 班级：当前学年 12 班 + 上一学年 7 个历史班（可演示学年升级与调班历史）
- 评估：17 个量表全覆盖（S-M / WeeFIM / CSIRS / 儿心Ⅱ / FMDA / CRT / SRS-2 / Conners PSQ·TRS / SDQ / CBCL / BRIEF / ABC / ATEC / PEP-3 / GMFM-88 / TGMD-3），约一半量表含前测+后测（趋势页可见进步曲线）
- 训练计划：每生 1 份进行中计划（本学期）+ 部分学生另有上学期完成计划
- 训练记录：感官游戏 / 器材 / 情绪场景 / 情绪游戏 / 生活自理任务 / 认知游戏，全部入口有数据，含 9 月开学两周的新鲜记录
- AI 助手：4 条真实感对话会话（内置智能体 × 专业特教问答）+ 8 条已确认学生 AI 记忆（含置顶与安全级）
- 演示彩蛋：2 名跳级 + 1 名留级学生（触发「月龄-年级核对」软提示）+ 跨学年调班历史

## 注意事项

- **仅用于体验/演示环境**：导入会覆盖当前数据库，请先备份自己的数据。
- 授权激活状态保存在本地（不随数据库替换），导入后仍需正常激活/登录。
- 若安装版本较旧（数据库结构不兼容），请升级到与应用配套的最新版本后再导入。
`

main()
