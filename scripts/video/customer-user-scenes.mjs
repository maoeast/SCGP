/** 教程 09：新增、角色编辑、密码重置、禁用启用与实际登录。仅操作新建演示账号。 */
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

const username = 'demo_staff09'
const initialPassword = `Demo!${randomBytes(12).toString('base64url')}`
const resetPassword = `Reset!${randomBytes(12).toString('base64url')}`
const finalName = '演示负责人'
let baselineCount
let createdAsTeacher = false
let disabledLoginRejected = false
let resetLoginSucceeded = false

async function readUser(page) {
  return page.evaluate((username) => window.db.get('SELECT id,username,name,role,email,is_active,last_login FROM user WHERE username = ?', [username]), username)
}

export async function verifyUserManagement(page, output) {
  const user = await readUser(page)
  const count = await page.evaluate(() => window.db.get('SELECT count(*) AS n FROM user').n)
  if (!createdAsTeacher || !disabledLoginRejected || !resetLoginSucceeded || count !== baselineCount + 1
    || user?.name !== finalName || user.role !== 'admin' || user.is_active !== 1 || !user.last_login
    || user.email !== 'staff09@example.invalid') throw new Error('演示账号角色、状态、密码登录或持久回查未完整通过')
  const evidence = { createdAsTeacher, disabledLoginRejected, resetPasswordLoginSucceeded: resetLoginSucceeded,
    user, beforeCount: baselineCount, afterCount: count, verified: true }
  fs.writeFileSync(path.join(output, 'user-management-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildUserScenes({ showCard, hideCard, sleep, output }) {
  const row = (page) => page.locator('.system-user-table .el-table__row').filter({ hasText: username })
  const dialog = (page, title) => page.locator('.el-dialog:visible').filter({ has: page.getByText(title, { exact: true }) })
  async function openUsers(page) {
    await page.locator('.sidebar-nav .nav-item').filter({ hasText: '系统管理' }).first().click()
    await page.getByRole('tab', { name: '用户管理', exact: true }).click()
    await page.locator('.system-user-management h2').waitFor()
    await sleep(1200)
  }
  async function chooseRole(page, box, role) {
    await box.locator('.el-form-item').filter({ hasText: '角色' }).locator('.el-select').click()
    await page.locator('.el-select-dropdown__item:visible').filter({ hasText: role }).hover()
    await sleep(1400)
    await page.locator('.el-select-dropdown__item:visible').filter({ hasText: role }).click()
    await sleep(900)
  }
  async function logout(page) {
    await page.getByRole('button', { name: '打开用户菜单', exact: true }).click()
    await page.locator('.user-menu-logout-item:visible').click()
    const confirm = page.locator('.el-message-box').filter({ hasText: '确定要退出系统吗？' })
    await confirm.waitFor()
    await sleep(1000)
    await confirm.getByRole('button', { name: '退出', exact: true }).click()
    await page.locator('input[autocomplete="username"]').waitFor()
  }
  async function login(page, name, password) {
    await page.locator('input[autocomplete="username"]').fill(name)
    await sleep(600)
    await page.locator('input[autocomplete="current-password"]').fill(password)
    await sleep(1400)
    await page.getByRole('button', { name: '登录系统', exact: true }).click()
  }
  async function toggle(page, enabled) {
    await row(page).scrollIntoViewIfNeeded()
    await row(page).locator('.system-user-actions__more').click()
    const label = enabled ? '启用账号' : '禁用账号'
    await page.getByRole('menuitem', { name: label, exact: true }).hover()
    await sleep(1000)
    await page.getByRole('menuitem', { name: label, exact: true }).click()
    const confirm = page.locator('.el-message-box').filter({ hasText: `${enabled ? '启用' : '禁用'}确认` })
    await confirm.waitFor()
    await sleep(2000)
    await confirm.getByRole('button', { name: '确定', exact: true }).click()
    await page.waitForFunction(({ username, active }) => window.db.get('SELECT is_active FROM user WHERE username = ?', [username])?.is_active === active,
      { username, active: enabled ? 1 : 0 })
    await sleep(1700)
  }
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。管理员操作教程：用户账号与角色管理。本节新建一个虚构账号，演示角色编辑、密码重置、禁用和启用，并实际验证登录结果。',
      caption: '软件操作教程 09\n用户账号与角色管理',
      async act(page) {
        await showCard(page, '软件操作教程 09', '新增账号 · 角色与密码 · 启用和禁用')
        await sleep(4500)
        await hideCard(page)
      },
    },
    {
      id: '02-user-list',
      narration: '使用管理员账号进入系统管理，打开用户管理。列表显示用户名、姓名、角色和状态。当前提供管理员与教师两种角色，应按实际岗位分配；角色与机构购买的功能授权是不同的设置。',
      caption: '系统管理 → 用户管理\n核对角色与状态，按实际岗位分配账号',
      async act(page) {
        await openUsers(page)
        baselineCount = await page.evaluate(() => window.db.get('SELECT count(*) AS n FROM user').n)
        if (await readUser(page)) throw new Error('源库已有同名账号，不能覆盖演示')
        await page.getByRole('button', { name: '新增用户', exact: true }).hover()
        await sleep(3000)
      },
    },
    {
      id: '03-add-user',
      narration: '点击新增用户，填写登录用户名、显示姓名和密码，再选择教师角色。邮箱为选填项。用户名和显示姓名用途不同，填写后请核对。确认无误后保存，并在列表中检查新账号。',
      caption: '新增用户：用户名、姓名、密码和角色\n示例用户名 demo_staff09，角色为教师',
      async act(page) {
        await page.getByRole('button', { name: '新增用户', exact: true }).click()
        const box = dialog(page, '新增用户')
        await box.waitFor()
        await box.getByPlaceholder('请输入用户名').fill(username)
        await sleep(1000)
        await box.getByPlaceholder('请输入姓名', { exact: true }).fill('演示工作人员')
        await sleep(1000)
        await box.getByPlaceholder('请输入密码', { exact: true }).fill(initialPassword)
        await sleep(1800)
        await chooseRole(page, box, '教师')
        await box.getByPlaceholder('请输入邮箱（可选）').fill('staff09@example.invalid')
        await sleep(1400)
        await box.getByRole('button', { name: '确定', exact: true }).click()
        await box.waitFor({ state: 'hidden' })
        await row(page).scrollIntoViewIfNeeded()
        const user = await readUser(page)
        if (user?.role !== 'teacher' || user.is_active !== 1) throw new Error('新增教师账号未保存')
        createdAsTeacher = true
        await row(page).hover()
        await sleep(2100)
      },
    },
    {
      id: '04-edit-role',
      narration: '需要调整资料或角色时，找到对应账号，点击编辑。用户名在这里不能修改。本次为演示角色变更，将姓名改为演示负责人，并选择管理员。实际分配管理员角色前，应先确认该人员承担相应管理职责。',
      caption: '编辑用户 → 更新姓名与角色 → 保存\n示例改为管理员，用户名保持不变',
      async act(page) {
        await row(page).getByRole('button', { name: '编辑', exact: true }).click()
        const box = dialog(page, '编辑用户')
        await box.waitFor()
        await box.getByPlaceholder('请输入用户名').hover()
        await sleep(1700)
        await box.getByPlaceholder('请输入姓名', { exact: true }).fill(finalName)
        await sleep(1100)
        await chooseRole(page, box, '管理员')
        await sleep(1400)
        await box.getByRole('button', { name: '确定', exact: true }).click()
        await box.waitFor({ state: 'hidden' })
        if ((await readUser(page))?.role !== 'admin') throw new Error('角色编辑未保存')
        await row(page).hover()
        await sleep(1800)
      },
    },
    {
      id: '05-reset-password',
      narration: '账号需要重新设置密码时，点击这一行的重置密码。输入新密码并再次确认，保存后使用新密码登录。这里的密码保持遮罩，实际使用时由机构按账号管理流程告知本人。',
      caption: '重置密码 → 输入新密码并再次确认\n保存后使用新密码登录',
      async act(page) {
        await row(page).getByRole('button', { name: '重置密码', exact: true }).click()
        const box = dialog(page, '重置密码')
        await box.waitFor()
        await sleep(1000)
        await box.getByPlaceholder('请输入新密码', { exact: true }).fill(resetPassword)
        await sleep(2200)
        await box.getByPlaceholder('请再次输入新密码').fill(resetPassword)
        await sleep(2200)
        await box.getByRole('button', { name: '确定', exact: true }).click()
        await box.waitFor({ state: 'hidden' })
        await sleep(1400)
      },
    },
    {
      id: '06-disable',
      narration: '需要暂停账号使用时，打开这一行的更多菜单，选择禁用账号，再确认。保存后状态变为禁用。这里操作的是新建演示账号，先核对用户名和姓名，再执行状态变更。',
      caption: '账号行的更多菜单 → 禁用账号 → 确认\n核对操作对象，检查状态变为禁用',
      async act(page) { await toggle(page, false) },
    },
    {
      id: '07-disabled-login',
      narration: '退出当前管理员账号，用演示账号和刚才设置的新密码尝试登录。禁用状态下，登录被拒绝，界面显示通用的用户名或密码错误提示。遇到这种情况，也应请管理员检查账号是否启用。',
      caption: '禁用账号尝试登录：被拒绝\n通用登录错误也可能与账号状态有关',
      async act(page) {
        await logout(page)
        await login(page, username, resetPassword)
        await page.getByText('用户名或密码错误，请检查后重试。', { exact: true }).waitFor()
        if (!page.url().includes('/login') || (await readUser(page)).is_active !== 0) throw new Error('禁用账号登录验证不符合预期')
        disabledLoginRejected = true
        await sleep(4000)
      },
    },
    {
      id: '08-enable',
      narration: '重新使用原管理员账号登录，回到用户管理。找到这名演示负责人，从更多菜单选择启用账号并确认。列表恢复启用状态后，再让使用者重新登录。',
      caption: '原管理员登录 → 用户管理 → 启用账号\n核对列表状态恢复为启用',
      async act(page) {
        await login(page, 'admin', 'admin123')
        await page.locator('.dashboard-hero').waitFor()
        await openUsers(page)
        await toggle(page, true)
      },
    },
    {
      id: '09-login-check',
      narration: '现在用演示账号和重置后的密码登录，已经可以进入首页。右上角显示演示负责人和管理员角色，也可以进入系统管理。这样就核对了账号、角色、密码和启用状态的实际结果。',
      caption: '演示账号使用新密码登录成功\n核对姓名、管理员角色与系统管理入口',
      async act(page) {
        await logout(page)
        await login(page, username, resetPassword)
        await page.locator('.dashboard-hero').waitFor()
        if ((await page.locator('.user-menu-trigger .user-name').innerText()) !== finalName
          || !(await page.locator('.user-menu-trigger .user-role').innerText()).includes('管理员')) throw new Error('登录后的账号身份或角色不匹配')
        await page.getByRole('button', { name: '打开用户菜单', exact: true }).hover()
        await sleep(2400)
        await openUsers(page)
        await row(page).scrollIntoViewIfNeeded()
        await row(page).hover()
        resetLoginSucceeded = true
        await verifyUserManagement(page, output)
        console.log('账号操作闭环通过：新增教师、改为管理员、重置密码、禁用拒绝登录、启用后新密码登录成功')
        await sleep(2500)
      },
    },
    {
      id: '10-end',
      narration: '本节完成。按岗位创建账号，核对角色，按需重置密码和调整启用状态，操作后验证登录。下一讲将介绍资源查找与管理。',
      caption: '本节完成\n下一讲：资源查找与管理',
      async act(page) {
        await showCard(page, '本节完成', '下一讲：资源查找与管理')
        await sleep(4500)
        await hideCard(page)
      },
    },
  ]
}
