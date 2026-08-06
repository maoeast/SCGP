// 构建演示数据分发包：生成纯净演示库（22 名学生）+ 导入说明 + zip
// 用法：node scripts/build-demo-dist.mjs
// 产物：output/demo-dist/SCGP演示数据包-YYYYMMDD.zip
//
// 底库来源：应用初始化 + 全量资源的 fixture 库（输出目录截图系统产物），
// 清理其中的 fixture 学生（id < 10001）后 seed 演示数据，得到纯演示库。
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const FIXTURE_DB = path.join(
  repoRoot,
  'output', 'manual-screenshot-capture', 'runs', 'live-resources-s149-s153-final-3-20260730',
  'user-data', 'resources', 'admin', 'database.sqlite',
)
const WORK_DIR = path.join(repoRoot, 'output', 'demo-dist')
const CLEAN_DB = path.join(WORK_DIR, 'database.sqlite')
const README_PATH = path.join(WORK_DIR, '导入说明.md')

function main() {
  if (!fs.existsSync(FIXTURE_DB)) {
    console.error(`底库不存在: ${FIXTURE_DB}`)
    process.exit(1)
  }
  fs.mkdirSync(WORK_DIR, { recursive: true })
  fs.copyFileSync(FIXTURE_DB, CLEAN_DB)

  // 1. 清理 fixture 学生（id < 10001，含其可能的班级历史）
  const cleanSql = `
    const fs = require('fs')
    const initSqlJs = require('sql.js')
    initSqlJs({ locateFile: (f) => path.join('node_modules/sql.js/dist', f) }).then((SQL) => {
      const db = new SQL.Database(fs.readFileSync(process.argv[1]))
      db.run('DELETE FROM student_class_history WHERE student_id < 10001')
      db.run('DELETE FROM student WHERE id < 10001')
      fs.writeFileSync(process.argv[1], Buffer.from(db.export()))
      console.log('fixture students removed')
    })
  `
  const res = spawnSync(process.execPath, ['-e', cleanSql, CLEAN_DB], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (res.status !== 0) {
    console.error('清理 fixture 学生失败:', res.stderr)
    process.exit(1)
  }
  console.log(res.stdout.trim())

  // 2. seed 演示数据
  const seed = spawnSync(process.execPath, ['scripts/seed-demo-data.mjs', 'seed', '--db', CLEAN_DB, '--summary'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (seed.status !== 0) {
    console.error('seed 失败:', seed.stderr)
    process.exit(1)
  }
  console.log(seed.stdout.trim())

  // 3. 校验：22 名学生、无 fixture 残留
  const verifySql = `
    const fs = require('fs')
    const path = require('path')
    const initSqlJs = require('sql.js')
    initSqlJs({ locateFile: (f) => path.join('node_modules/sql.js/dist', f) }).then((SQL) => {
      const db = new SQL.Database(fs.readFileSync(process.argv[1]))
      const q = (s) => (db.exec(s)[0] || { values: [] }).values
      const students = q('SELECT COUNT(*) FROM student')[0][0]
      const fixture = q('SELECT COUNT(*) FROM student WHERE id < 10001')[0][0]
      const trs = q("SELECT COUNT(*) FROM report_record WHERE report_type='conners-trs'")[0][0]
      const sensory = q("SELECT COUNT(*) FROM training_records WHERE entry_code='sensory-integration'")[0][0]
      const ok = students === 22 && fixture === 0 && trs > 0 && sensory > 0
      console.log(ok ? 'PASS 校验' : 'FAIL 校验', JSON.stringify({ students, fixture, trs, sensory }))
      process.exit(ok ? 0 : 1)
    })
  `
  const verify = spawnSync(process.execPath, ['-e', verifySql, CLEAN_DB], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (verify.status !== 0) {
    console.error('校验失败:', verify.stderr)
    process.exit(1)
  }
  console.log(verify.stdout.trim())

  // 4. 写导入说明
  fs.writeFileSync(README_PATH, README_CONTENT, 'utf8')

  // 5. 打包 zip（Windows PowerShell 内置 Compress-Archive，避免新增依赖）
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const zipPath = path.join(repoRoot, 'output', `SCGP演示数据包-${stamp}.zip`)
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
  const ps = `Compress-Archive -Path '${WORK_DIR}\\*' -DestinationPath '${zipPath}' -Force`
  const zip = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
  if (zip.status !== 0) {
    console.error('打包失败:', zip.stderr)
    process.exit(1)
  }
  console.log(`已打包: ${zipPath}`)
  console.log('包内容: database.sqlite + 导入说明.md')
}

const README_CONTENT = `# SCGP 星愿能力发展训练系统 · 演示数据包

本包包含一份**完整的演示数据库**（22 名学生、7 个班级、130 次评估、27 份训练计划、450+ 条训练记录），
安装应用后按以下步骤导入即可体验全部功能。

## 导入步骤

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

- 学生：22 人（学前大班 ~ 初三，覆盖言语障碍 / 学习障碍 / 孤独症谱系障碍 / 智力障碍 / 多重障碍）
- 评估：S-M、WeeFIM、CSIRS、儿心量表Ⅱ、CRT、SRS-2、Conners PSQ/TRS、SDQ、CBCL、BRIEF、FMDA，
  约一半量表含前测 + 后测（趋势页可见进步曲线）
- 训练计划：每生 1 份进行中计划 + 历史计划
- 训练记录：游戏 / 器材 / 情绪场景 / 生活自理，全部入口有数据，与训练记录页统计一致
- 报告：评估报告 + 情绪模块报告 + 训练干预报告

## 注意事项

- **仅用于体验/演示环境**：导入会覆盖当前数据库，请先备份自己的数据。
- 授权激活状态保存在本地（不随数据库替换），导入后仍需正常激活/登录。
- 若安装版本较旧（数据库结构不兼容），请升级到与应用配套的最新版本后再导入。
`

main()
