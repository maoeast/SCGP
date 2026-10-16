/** 教程 08：在隔离副本中实际备份、修改、恢复和回查。 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes, pbkdf2Sync, createDecipheriv, createHash } from 'node:crypto'
import JSZip from 'jszip'

const password = randomBytes(18).toString('base64url')
const changedName = '演示生甲（修改示例）'
let backupFile
let baseline
let archiveInfo
let isolatedDataPath
let resourceFiles
let sourceResources
let sourceResourceFiles

export async function prepareBackupDemo(page, output, app) {
  const dataPath = await app.evaluate(({ app }) => app.getPath('userData'))
  if (path.dirname(path.dirname(dataPath)) !== os.tmpdir() || !path.basename(path.dirname(dataPath)).startsWith('scgp-customer-video-')) throw new Error('演示准备未处于临时目录')
  const preparation = await page.evaluate(() => {
    const invalid = window.db.get('SELECT count(*) AS n FROM report_record WHERE plan_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM train_plan WHERE train_plan.id = report_record.plan_id)').n
    const orphanDetails = window.db.get('SELECT count(*) AS n FROM cpep3_assess_detail WHERE NOT EXISTS (SELECT 1 FROM cpep3_assess WHERE cpep3_assess.id = cpep3_assess_detail.assess_id)').n
    const archived = window.db.get('SELECT count(*) AS n FROM demo_legacy_relation_archive').n
    const remaining = window.db.all('PRAGMA foreign_key_check')
    return { invalidLegacyPlanLinks: invalid, orphanCpepDetails: orphanDetails, archivedOriginalRows: archived,
      remainingForeignKeyViolations: remaining.length, remainingGroups: [...new Set(remaining.map((row) => `${row.table}->${row.parent}`))] }
  })
  if (preparation.invalidLegacyPlanLinks !== 0 || preparation.orphanCpepDetails !== 0 || preparation.archivedOriginalRows !== 320
    || preparation.remainingGroups.some((group) => !['sm_assess_detail->sm_question', 'weefim_assess_detail->weefim_question'].includes(group))) {
    throw new Error(`备份演示来源关系未完成可审计迁移：${JSON.stringify(preparation)}`)
  }
  fs.writeFileSync(path.join(output, 'demo-preparation.json'), JSON.stringify(preparation, null, 2), 'utf8')
  console.log(`备份演示来源核验：320 条原始历史行已在迁移副本归档，录制期未清理数据；源库未改`)
}

function resourcesSnapshot(directory, prefix = '') {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    return entry.isDirectory() ? resourcesSnapshot(file, relative)
      : [{ file: relative, hash: createHash('sha256').update(fs.readFileSync(file)).digest('hex') }]
  }).sort((a, b) => a.file.localeCompare(b.file))
}

async function snapshot(page, studentId) {
  const data = await page.evaluate((id) => ({
    student: window.db.get('SELECT id,name,gender,birthday,student_no FROM student WHERE id = ?', [id]),
    counts: Object.fromEntries(['student', 'training_records', 'equipment_training_records', 'sys_training_plan', 'report_record', 'student_class_history'].map((table) =>
      [table, window.db.get(`SELECT count(*) AS n FROM ${table}`).n])),
    archiveRows: window.db.all('SELECT source_table, source_row_id, reason, original_row_json, source_db_sha256 FROM demo_legacy_relation_archive ORDER BY source_table, source_row_id'),
  }), studentId)
  return { student: data.student, counts: data.counts, legacyArchiveCount: data.archiveRows.length,
    legacyArchiveSha256: createHash('sha256').update(JSON.stringify(data.archiveRows)).digest('hex') }
}

export async function verifyBackupRestore(page, studentId, output) {
  const current = await snapshot(page, studentId)
  if (JSON.stringify(current) !== JSON.stringify(baseline)) throw new Error('恢复后学生资料或关键业务表记录数与备份前不一致')
  const currentFiles = resourcesSnapshot(path.join(isolatedDataPath, 'resources'))
  if (JSON.stringify(currentFiles) !== JSON.stringify(resourceFiles)) throw new Error('恢复后托管资源文件哈希不一致')
  if (JSON.stringify(resourcesSnapshot(sourceResources)) !== JSON.stringify(sourceResourceFiles)) throw new Error('源托管资源发生变化')
  const evidence = { backup: path.relative(output, backupFile).replaceAll('\\', '/'), ...archiveInfo,
    before: baseline, after: current, resourceFilesVerified: currentFiles.length, restoreVerified: true }
  fs.writeFileSync(path.join(output, 'backup-restore-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildBackupScenes({ showCard, hideCard, sleep, studentId, output, sourceDb }) {
  async function openBackup(page) {
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: '系统管理' }).first().click()
    await page.getByRole('tab', { name: '数据备份', exact: true }).click()
    await page.getByRole('heading', { name: '数据备份与恢复', exact: true }).waitFor()
    await sleep(1300)
  }
  async function enterPassword(page, title, before = 0, after = 1400) {
    const box = page.locator('.el-message-box').filter({ hasText: title })
    await box.waitFor()
    await sleep(before)
    await box.locator('input[type="password"]').fill(password)
    await sleep(after)
    await box.getByRole('button', { name: '确定', exact: true }).click()
    await sleep(500)
  }
  async function findStudent(page) {
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: '学生管理' }).first().click()
    await page.locator('input[placeholder*="搜索学生姓名"]').fill('演示生甲')
    const card = page.locator('.student-card').filter({ hasText: '演示生甲' }).first()
    await card.waitFor()
    await card.getByRole('link', { name: '查看详情' }).click()
    await page.getByRole('button', { name: /编辑信息/u }).waitFor()
    await sleep(1100)
  }
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。管理员操作教程：数据备份与恢复。本节在独立演示副本中，完成备份、修改资料、恢复和回查。正式使用时，请先确认备份文件及恢复范围。',
      caption: '软件操作教程 08\n数据备份与恢复',
      async act(page, app) {
        page.on('console', (message) => {
          const text = message.text()
          if (message.type() === 'error' && /恢复|备份|导入/u.test(text)) console.error(`恢复预演诊断：${text.slice(0, 1200)}`)
        })
        isolatedDataPath = await app.evaluate(({ app }) => app.getPath('userData'))
        const parent = path.dirname(isolatedDataPath)
        if (path.dirname(parent) !== os.tmpdir() || !path.basename(parent).startsWith('scgp-customer-video-')) throw new Error('恢复演示未处于隔离 userData，停止操作')
        baseline = await snapshot(page, studentId)
        resourceFiles = resourcesSnapshot(path.join(isolatedDataPath, 'resources'))
        sourceResources = path.join(path.dirname(sourceDb), 'resources')
        sourceResourceFiles = resourcesSnapshot(sourceResources)
        if (JSON.stringify(sourceResourceFiles) !== JSON.stringify(resourceFiles)) throw new Error('资源副本与源文件不一致')
        await showCard(page, '软件操作教程 08', '数据备份 · 文件核对 · 恢复与回查')
        await sleep(4500)
        await hideCard(page)
      },
    },
    {
      id: '02-backup-page',
      narration: '使用管理员账号，进入系统管理，切换到数据备份。左侧用于生成备份，右侧用于选择文件和恢复。恢复会覆盖当前数据，因此在恢复前，应先备份当前状态，再确认所选文件。',
      caption: '系统管理 → 数据备份\n恢复会覆盖当前数据，恢复前先备份当前状态',
      async act(page) {
        await openBackup(page)
        await page.getByRole('button', { name: '立即备份', exact: true }).hover()
        await sleep(2400)
      },
    },
    {
      id: '03-create-backup',
      narration: '点击立即备份。设置至少十二个字符的备份口令，再输入一次确认。请妥善保管口令，后续读取和恢复都需要它。口令不会在本视频中展示。确认后，等待备份文件生成。',
      caption: '立即备份 → 设置口令 → 再次确认\n口令至少 12 个字符，读取和恢复时需要使用',
      async act(page, app) {
        const directory = fs.mkdtempSync(path.join(output, 'backup-'))
        fs.writeFileSync(path.join(directory, '演示备份口令.txt'), `仅用于本讲虚构演示备份，不是任何用户账号的密码。\n${password}\n`, 'utf8')
        await app.evaluate(({ BrowserWindow }, directory) => {
          globalThis.__scgpBackupDownload = { state: 'waiting' }
          BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
            const name = item.getFilename().replace(/[<>:"/\\|?*]/gu, '_')
            item.setSavePath(`${directory}/${name}`)
            globalThis.__scgpBackupDownload = { state: 'progressing', file: `${directory}/${name}`, name }
            item.once('done', (_event, state) => { globalThis.__scgpBackupDownload.state = state })
          })
        }, directory)
        await page.getByRole('button', { name: '立即备份', exact: true }).hover()
        await sleep(1200)
        await page.getByRole('button', { name: '立即备份', exact: true }).click()
        await enterPassword(page, '请设置本次备份口令', 1500, 3000)
        await enterPassword(page, '请再次输入备份口令', 1000, 2500)
        let downloaded
        for (let i = 0; i < 160; i++) {
          downloaded = await app.evaluate(() => globalThis.__scgpBackupDownload)
          if (['completed', 'cancelled', 'interrupted'].includes(downloaded.state)) break
          await sleep(250)
        }
        if (downloaded.state !== 'completed' || !downloaded.file.endsWith('.dat')) throw new Error(`备份实际下载未完成：${downloaded.state}`)
        backupFile = downloaded.file
        const envelope = JSON.parse(fs.readFileSync(backupFile, 'utf8'))
        const cipher = Buffer.from(envelope.ciphertext, 'base64')
        const key = pbkdf2Sync(password, Buffer.from(envelope.salt, 'base64'), envelope.iterations, 32, 'sha256')
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'))
        decipher.setAuthTag(cipher.subarray(-16))
        const data = JSON.parse(Buffer.concat([decipher.update(cipher.subarray(0, -16)), decipher.final()]).toString('utf8'))
        const archive = await JSZip.loadAsync(Buffer.from(data.resourceArchive.payload, 'base64'))
        for (const entry of resourceFiles) {
          const bytes = await archive.file(entry.file)?.async('nodebuffer')
          if (!bytes || createHash('sha256').update(bytes).digest('hex') !== entry.hash) throw new Error('备份归档资源字节不一致')
        }
        archiveInfo = { version: data.version, tableCount: Object.keys(data.tables).length,
          totalRecords: data.metadata.totalRecords, resourceFiles: data.resourceArchive.fileCount,
          bytes: fs.statSync(backupFile).size, encrypted: envelope.format === 'scgp-backup' }
        if (data.version !== '4.0' || data.tables.student.length !== baseline.counts.student || !archiveInfo.encrypted
          || data.tables.demo_legacy_relation_archive?.length !== baseline.legacyArchiveCount) throw new Error('备份版本、学生或历史归档数据不完整')
        console.log(`备份下载并解密核对通过：${archiveInfo.tableCount} 张表，${archiveInfo.resourceFiles} 个资源文件，${archiveInfo.bytes} 字节`)
        await sleep(1400)
      },
    },
    {
      id: '04-file-location',
      narration: '本次已经生成后缀为 dat 的备份文件，并保存到教程输出目录。实际使用时，要确认下载位置、文件名和备份日期。建议按机构流程保留多个日期的副本，并将口令与备份文件分开保管。',
      caption: '确认 .dat 文件、保存位置及备份日期\n按机构流程保留副本，口令与文件分开保管',
      async act(page) {
        await showCard(page, '备份文件已生成', `${path.basename(backupFile)} · ${(archiveInfo.bytes / 1024 / 1024).toFixed(1)} MB`)
        await sleep(5000)
        await hideCard(page)
      },
    },
    {
      id: '05-change-example',
      narration: '为了看清恢复效果，现在只在演示副本中，将学生姓名加上修改示例并保存。这项修改发生在备份之后。接下来恢复刚才的文件，检查资料是否回到备份时的状态。实际恢复前，也应确认备份日期之后新增的数据是否仍需保留。',
      caption: '仅在演示副本修改学生姓名，验证恢复效果\n恢复前确认备份之后新增的数据是否需要保留',
      async act(page) {
        await findStudent(page)
        await page.getByRole('button', { name: /编辑信息/u }).click()
        const dialog = page.locator('.dialog-content').filter({ hasText: '编辑学生' })
        await dialog.getByPlaceholder('请输入学生姓名').fill(changedName)
        await sleep(1700)
        await dialog.getByRole('button', { name: '保存', exact: true }).click()
        await dialog.waitFor({ state: 'hidden' })
        await page.getByText(changedName, { exact: true }).first().waitFor()
        const modified = await snapshot(page, studentId)
        if (modified.student.name !== changedName) throw new Error('演示修改未保存')
        await sleep(2400)
      },
    },
    {
      id: '06-select-backup',
      narration: '返回数据备份，点击选择备份文件，选中刚才生成的 dat 文件。输入对应口令后，系统显示备份版本、记录数和表数量。核对文件来源和备份信息。注意，AI 模型服务的 API Key 不包含在这份备份中。',
      caption: '选择备份文件 → 输入口令 → 核对文件信息\nAI 模型服务 API Key 不随备份恢复',
      async act(page) {
        await openBackup(page)
        const chooserPromise = page.waitForEvent('filechooser')
        await page.getByRole('button', { name: '选择备份文件', exact: true }).click()
        const chooser = await chooserPromise
        await chooser.setFiles(backupFile)
        await enterPassword(page, '请输入备份口令以读取文件信息')
        await page.locator('.system-backup-info').waitFor()
        await page.locator('.system-backup-info').scrollIntoViewIfNeeded()
        await sleep(3300)
      },
    },
    {
      id: '07-restore',
      narration: '确认要覆盖当前数据后，点击恢复数据，并确认覆盖提示。等待恢复完成，查看结果提示，尤其注意资源文件是否恢复成功。若提示资源缺失或部分失败，应继续检查。不要在恢复过程中关闭软件。',
      caption: '恢复数据 → 确认覆盖 → 等待完成\n核对恢复结果，留意资源文件提示',
      async act(page) {
        const button = page.getByRole('button', { name: '恢复数据', exact: true })
        await button.hover()
        await sleep(3000)
        const confirmation = new Promise((resolve, reject) => page.once('dialog', async (dialog) => {
          try {
            if (dialog.type() !== 'confirm' || !dialog.message().includes('覆盖当前所有数据')) throw new Error('未出现预期的恢复覆盖确认')
            await dialog.accept()
            resolve()
          } catch (error) { reject(error) }
        }))
        await button.click()
        await confirmation
        await Promise.race([
          page.waitForFunction(({ id, name }) => window.db?.get('SELECT name FROM student WHERE id = ?', [id])?.name === name,
            { id: studentId, name: baseline.student.name }, { timeout: 45000 }),
          page.locator('.el-message--error').waitFor({ timeout: 45000 }).then(async () => {
            const error = await page.locator('.el-message--error').innerText()
            await page.screenshot({ path: path.join(output, '07-restore-error.png') })
            throw new Error(error)
          }),
        ])
        await page.getByRole('button', { name: '恢复数据', exact: true }).waitFor({ state: 'hidden', timeout: 45000 })
        await verifyBackupRestore(page, studentId, output)
        console.log('恢复完成：姓名已回退，关键业务表数量与备份前一致，托管资源哈希一致')
        await sleep(2500)
      },
    },
    {
      id: '08-check-restored',
      narration: '最后从学生管理重新查找，姓名已经恢复为演示生甲。打开详情，再查看评估和训练记录是否在。恢复后的核对不能省略；需要使用 AI 功能时，还应重新配置模型服务密钥。',
      caption: '重新查找学生，确认资料回到备份时的状态\n检查评估和训练记录，按需重新配置 AI 密钥',
      async act(page) {
        await findStudent(page)
        await page.getByRole('tab', { name: /器材训练/u }).click()
        await page.locator('.el-tab-pane:visible .records-table').scrollIntoViewIfNeeded()
        await sleep(3500)
        await page.getByRole('tab', { name: /游戏训练/u }).click()
        await sleep(2700)
      },
    },
    {
      id: '09-end',
      narration: '本节完成。定期备份，保管好文件与口令；恢复前核对，恢复后回查。下一讲将介绍用户账号与角色管理。',
      caption: '本节完成\n下一讲：用户账号与角色管理',
      async act(page) {
        await showCard(page, '本节完成', '下一讲：用户账号与角色管理')
        await sleep(4500)
        await hideCard(page)
      },
    },
  ]
}
