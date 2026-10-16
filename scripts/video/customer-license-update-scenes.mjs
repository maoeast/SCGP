/** 教程 12：授权信息、机器码、授权入口和真实软件更新检查。 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

let runtime
let copied = false
let activationHash
let entitlementLabels
let checkResult

async function state(page) {
  const panel = page.locator('.update-panel')
  const versions = await panel.locator('.version-info .el-descriptions__content').allTextContents()
  return { currentVersion: versions[0]?.trim(), latestVersion: versions[1]?.trim(),
    error: await panel.locator('.error-message').count() ? (await panel.locator('.error-message').innerText()).trim() : null,
    isChecking: await panel.getByRole('button', { name: '检查更新', exact: true }).evaluate((el) => el.classList.contains('is-loading')),
    updateAvailable: await panel.locator('.update-status').count() > 0,
    autoUpdate: await panel.getByRole('switch').isChecked() }
}

async function preparePresentation(page) {
  // 录制使用开发渲染器。仅隐藏发布界面没有的诊断区域，并模糊本机标识，不改业务状态。
  await page.locator('.system-about-list__row').filter({ has: page.getByText('原始授权 code', { exact: true }) }).evaluateAll((items) => items.forEach((el) => { el.style.display = 'none' }))
  await page.locator('.system-license-panel').filter({ has: page.getByRole('heading', { name: '授权诊断', exact: true }) }).evaluateAll((items) => items.forEach((el) => { el.style.display = 'none' }))
  await page.addStyleTag({ content: ".system-about-list__value { filter: blur(5px); user-select: none; } html, body, #app { font-family: 'Microsoft YaHei', sans-serif !important; }" })
}

export async function verifyLicenseUpdate(page, app, output) {
  const config = JSON.parse(fs.readFileSync(path.join(runtime.userData, 'update-config.json'), 'utf8'))
  const hash = createHash('sha256').update(await page.evaluate(() => localStorage.getItem('sic_ads_activation_cache') || '')).digest('hex')
  const current = await state(page)
  const labels = await page.locator('.system-about-list__row').filter({ has: page.getByText('能力包授权', { exact: true }) }).locator('.el-tag').allTextContents()
  if (!runtime.packaged || !copied || hash !== activationHash || JSON.stringify(labels) !== JSON.stringify(entitlementLabels)
    || config.autoUpdate !== true || current.autoUpdate !== true || !checkResult || checkResult.isChecking
    || (process.argv.includes('--packaged-check') && runtime.ignoresCertificateErrors)) throw new Error('授权、机器码复制或更新设置验证未通过')
  const evidence = { version: runtime.version, packagedMainProcess: runtime.packaged,
    renderer: process.argv.includes('--packaged-check') ? 'bundled production renderer' : 'current Vite development renderer',
    ignoresCertificateErrors: runtime.ignoresCertificateErrors, isolatedUserData: true,
    activationSource: 'fictional tutorial activation cache, unchanged; no license submitted',
    entitlementLabels, clipboardMatchedMachineCode: copied, clipboardRestored: true,
    checkResult, autoUpdatePersisted: config.autoUpdate, updateFeed: config.url,
    downloadPerformed: false, installationPerformed: false, verified: true }
  fs.writeFileSync(path.join(output, 'license-update-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildLicenseUpdateScenes({ showCard, hideCard, sleep, output }) {
  const about = (page) => page.locator('.system-about-card')
  const update = (page) => page.locator('.update-panel')
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第十二讲：授权信息与软件更新。本节演示核对授权、复制机器码、查看授权更新入口，以及检查软件更新和保存自动检查设置。',
      caption: '软件操作教程 12\n授权信息与软件更新',
      async act(page, app) {
        await preparePresentation(page)
        runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), userData: app.getPath('userData'), packaged: app.isPackaged,
          ignoresCertificateErrors: app.commandLine.hasSwitch('ignore-certificate-errors') }))
        activationHash = createHash('sha256').update(await page.evaluate(() => localStorage.getItem('sic_ads_activation_cache') || '')).digest('hex')
        await showCard(page, '软件操作教程 12', '核对授权 · 复制机器码 · 检查更新')
        await sleep(4500)
      },
    },
    {
      id: '02-about',
      narration: '使用管理员账号进入系统管理，打开关于。这里可以查看当前版本、激活状态和能力包授权。演示环境已配置示例授权。实际交付时，请核对本机构购买的能力包，菜单和可用功能还会受到账号角色影响。',
      caption: '系统管理 → 关于\n核对版本、激活状态和能力包授权',
      async act(page) {
        await hideCard(page)
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '系统管理' }).click()
        await page.getByRole('tab', { name: '关于', exact: true }).click()
        await about(page).waitFor()
        await preparePresentation(page)
        entitlementLabels = await about(page).locator('.system-about-list__row').filter({ has: page.getByText('能力包授权', { exact: true }) }).locator('.el-tag').allTextContents()
        if (!entitlementLabels.length) throw new Error('示例授权未显示能力包')
        await about(page).scrollIntoViewIfNeeded()
        await sleep(5000)
      },
    },
    {
      id: '03-machine-code',
      narration: '办理授权或联系交付支持时，可以点击复制机器码，再发送给负责人员。机器码用于识别当前设备。教程画面已模糊本机标识，实际操作时复制的是完整机器码。更换设备后，应重新核对授权安排。',
      caption: '点击“复制机器码”，用于办理授权或联系支持\n教程模糊设备标识，复制内容仍为完整机器码',
      async act(page, app) {
        const previous = await app.evaluate(({ clipboard }) => clipboard.readText())
        try {
          const code = (await about(page).locator('.system-about-list__value').innerText()).trim()
          await about(page).getByRole('button', { name: '复制机器码', exact: true }).click()
          await sleep(2000)
          copied = Boolean(code) && (await app.evaluate(({ clipboard }) => clipboard.readText())) === code
          if (!copied) throw new Error('复制机器码未与页面真实值一致')
          await sleep(2500)
        } finally { await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), previous) }
      },
    },
    {
      id: '04-license-entry',
      narration: '需要续期或调整授权时，点击重新激活、更新授权。可以输入激活码，也可以导入激活文件，再提交并刷新授权。本次只介绍入口，未提交新许可证。获得有效授权后，应返回这里核对激活状态与能力包。',
      caption: '重新激活 / 更新授权：输入激活码或导入文件\n本次只查看入口，未提交新许可证',
      async act(page) {
        await about(page).getByRole('button', { name: '重新激活 / 更新授权', exact: true }).click()
        const input = about(page).getByPlaceholder('请输入新的激活码，例如 SPED-XXXX-XXXX...')
        await input.scrollIntoViewIfNeeded()
        await input.click()
        await sleep(2600)
        await about(page).getByRole('button', { name: '导入激活文件', exact: true }).hover()
        await sleep(2200)
        if (!(await about(page).getByRole('button', { name: '提交并刷新授权', exact: true }).isDisabled())) throw new Error('空激活码不应可提交')
        await about(page).getByRole('button', { name: '取消', exact: true }).click()
        await sleep(1200)
      },
    },
    {
      id: '05-check-update',
      narration: '向下找到软件更新，点击检查更新，等待页面返回结果。可以展开操作日志了解本次检查情况。如果检查失败，请保留提示并联系交付支持。检查失败不能据此判断软件已是最新版本。本次没有下载或安装更新。',
      caption: '软件更新 → 检查更新 → 查看提示和操作日志\n检查失败不代表已是最新版本，本次未下载安装',
      async act(page) {
        await update(page).scrollIntoViewIfNeeded()
        await update(page).getByRole('button', { name: '检查更新', exact: true }).click()
        await sleep(900)
        await page.waitForFunction(() => !document.querySelector('.update-panel .actions > button')?.classList.contains('is-loading'), undefined, { timeout: 90000 })
        await sleep(600)
        checkResult = await state(page)
        await update(page).getByText('操作日志', { exact: true }).click()
        await update(page).locator('.operation-log').scrollIntoViewIfNeeded()
        const operationLog = await update(page).locator('.operation-log').innerText()
        if ((checkResult.error && (!operationLog.includes('检查更新失败') || await update(page).locator('.up-to-date').count()))
          || (!checkResult.error && checkResult.updateAvailable && !operationLog.includes('发现新版本'))
          || (!checkResult.error && !checkResult.updateAvailable && (!operationLog.includes('当前已是最新版本') || await update(page).locator('.update-status').count()))) {
          throw new Error('更新面板提示与本次检查结果不一致')
        }
        await sleep(5500)
        console.log(`真实更新检查结束：${checkResult.error ? '服务返回错误，已记录' : checkResult.updateAvailable ? '发现可用更新' : '未发现可用更新'}`)
      },
    },
    {
      id: '06-auto-check',
      narration: '自动检查更新开关控制启动时是否检查。本次先关闭，再开启，重新载入后核对设置仍然保留。它控制的是检查动作。若发现新版本，后续下载和重启安装仍需按页面提示操作。更新前可先参考数据备份一讲。',
      caption: '开启“自动检查更新”，重载后核对设置\n更新前先完成备份，按页面提示处理下载与重启',
      async act(page, app) {
        const toggle = update(page).locator('.el-switch')
        await toggle.scrollIntoViewIfNeeded()
        if (!(await update(page).getByRole('switch').isChecked())) throw new Error('隔离演示应从开启自动检查开始')
        await toggle.click()
        await sleep(1800)
        if (JSON.parse(fs.readFileSync(path.join(runtime.userData, 'update-config.json'), 'utf8')).autoUpdate !== false) throw new Error('自动检查关闭未保存')
        await toggle.click()
        await sleep(2300)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await preparePresentation(page)
        await page.getByRole('tab', { name: '关于', exact: true }).click()
        await about(page).waitFor()
        await preparePresentation(page)
        await update(page).locator('.el-switch').scrollIntoViewIfNeeded()
        if (!(await update(page).getByRole('switch').isChecked())) throw new Error('重载后自动检查开关未保持')
        await sleep(4000)
        await verifyLicenseUpdate(page, app, output)
        console.log('重载回查通过：授权未变，自动检查设置已持久保存')
      },
    },
    {
      id: '07-end',
      narration: '本节完成。遇到授权或更新问题，先核对当前版本、激活状态和能力包，复制机器码，并记录页面提示。本系列通用操作与管理员专题演示到这里，感谢观看。',
      caption: '本节完成\n感谢观看',
      async act(page) {
        await showCard(page, '感谢观看', '核对授权 · 及时备份 · 按需更新')
        await sleep(4500)
      },
    },
  ]
}
