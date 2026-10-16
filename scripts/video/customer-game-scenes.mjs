/** 教程 05：真实游戏操作、自动保存与档案回查。 */
import fs from 'node:fs'
import path from 'node:path'
let recordedId
let baselineCount
let recordedDuration

export async function verifyGameRecording(page, studentId, output) {
  const result = await page.evaluate(({ studentId, id }) => ({
    record: window.db.get('SELECT * FROM training_records WHERE id = ?', [id]),
    count: window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [studentId]).n,
    report: window.db.get('SELECT * FROM report_record WHERE training_record_id = ?', [id]),
    session: window.db.get("SELECT duration_ms FROM training_session WHERE source_table = 'training_records' AND source_record_id = ?", [id]),
  }), { studentId, id: recordedId })
  const raw = JSON.parse(result.record?.raw_data || '{}')
  if (result.record?.student_id !== studentId || result.count !== baselineCount + 1
    || raw.totalTrials !== 5 || raw.correctTrials !== 4 || !result.report
    || raw.duration < 1 || raw.duration > 120 || result.record.duration !== raw.duration
    || result.session?.duration_ms !== raw.duration * 1000
    || Math.abs((raw.endTime - raw.startTime) / 1000 - raw.duration) > 1) {
    throw new Error('游戏训练记录、5 轮结果或关联报告回查不完整')
  }
  recordedDuration = raw.duration
  if (output) fs.writeFileSync(path.join(output, 'game-recording-verification.json'), JSON.stringify({
    studentId, recordId: recordedId, durationSeconds: recordedDuration,
    rawStartTime: raw.startTime, rawEndTime: raw.endTime,
    legacyDurationSeconds: result.record.duration,
    unifiedDurationMs: result.session.duration_ms,
    totalTrials: raw.totalTrials, correctTrials: raw.correctTrials,
    reportId: result.report.id, verified: true,
  }, null, 2), 'utf8')
  return result
}

export function buildGameScenes({ showCard, hideCard, sleep, studentId, output }) {
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第五讲：游戏训练与记录回查。本节使用颜色配对，演示准备、训练、完成和查找记录。画面中的学生和作答均为演示数据。',
      caption: '软件操作教程 05\n游戏训练与记录回查',
      async act(page) {
        await showCard(page, '软件操作教程 05', '游戏训练 · 自动保存 · 记录回查')
        await sleep(5000)
        await hideCard(page)
      },
    },
    {
      id: '02-entry',
      narration: '从左侧进入游戏训练，再选择感官统合训练。系统会先让我们选择学生，确保本次训练记录保存到正确的档案中。其他训练入口按账号已授权的能力包显示。',
      caption: '游戏训练 → 感官统合训练\n先选择学生，再进入训练准备页',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '游戏训练' }).first().click()
        await page.locator('.module-card').filter({ hasText: '感官统合训练' }).hover()
        await sleep(2300)
        await page.locator('.module-card').filter({ hasText: '感官统合训练' }).click()
        await page.getByPlaceholder('搜索学生姓名或学号').waitFor()
        await sleep(2000)
      },
    },
    {
      id: '03-student-game',
      narration: '搜索演示生甲，核对姓名后点击选择。进入准备页后，点击颜色配对，右侧会显示任务说明和训练设置。开始之前，先确认学生和任务都正确。',
      caption: '选择演示生甲 → 颜色配对\n核对学生、任务说明和训练设置',
      async act(page) {
        await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
        const row = page.locator('.el-table__row').filter({ hasText: '演示生甲' })
        await row.waitFor()
        await sleep(1700)
        await row.getByRole('button', { name: '选择', exact: true }).click()
        await page.locator('.game-card').filter({ hasText: '颜色配对' }).click()
        await page.locator('.preview-section').waitFor()
        baselineCount = await page.evaluate((id) => window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [id]).n, studentId)
        await sleep(3200)
      },
    },
    {
      id: '04-config',
      narration: '这里可以调整网格大小、时间限制和训练轮次。本次示例使用二乘二网格、一百二十秒、五轮。参数仅用于演示操作，实际训练时应根据学生的表现进行选择。准备好后，点击进入全屏训练。',
      caption: '示例：2×2 网格、120 秒、5 轮\n准备完成后点击“进入全屏训练”',
      async act(page) {
        for (const label of ['2×2', '120秒', '5轮']) {
          const option = page.locator('.el-radio-button').filter({ hasText: label })
          await option.hover()
          await sleep(700)
          await option.click()
          await sleep(900)
        }
        await page.locator('.start-button').hover()
        await sleep(1800)
      },
    },
    {
      id: '05-play',
      narration: '观察上方的目标颜色，再点击下方相同颜色的方块。系统会给出反馈，并进入下一轮。这里特意选错一次，展示错误反馈。上方可以查看轮次、得分和剩余时间。完成设定的五轮后，系统自动结束训练、保存记录，并打开本次报告。',
      caption: '观察目标颜色，点击相同颜色的方块\n本次特意答错 1 轮，演示反馈与自动结束',
      async act(page) {
        await page.locator('.start-button').click()
        for (let round = 1; round <= 5; round++) {
          await page.locator('.color-progress-strip__value').filter({ hasText: `${round} / 5` }).waitFor({ timeout: 20000 })
          await sleep(round === 1 ? 2500 : 1300)
          const correctIndex = await page.evaluate(() => {
            const target = document.querySelector('.color-target-jelly').style.getPropertyValue('--jelly-base')
            return [...document.querySelectorAll('.color-candy-button')].findIndex((button) => button.querySelector('.color-candy').style.getPropertyValue('--jelly-base') === target)
          })
          if (correctIndex < 0) throw new Error('未找到与可见目标颜色匹配的方块')
          const index = round === 3 ? (correctIndex + 1) % 4 : correctIndex
          await page.locator('.color-candy-button').nth(index).hover()
          await sleep(800)
          await page.locator('.color-candy-button').nth(index).click()
          if (round === 3) await page.screenshot({ path: 'output/videos/customer-guide-05/05-game-feedback.png' })
          await sleep(2800)
        }
        await page.waitForURL(/#\/games\/report\?/u, { timeout: 20000 })
        recordedId = Number(new URL(page.url().split('#')[1], 'http://demo').searchParams.get('recordId'))
        await verifyGameRecording(page, studentId, output)
        console.log(`游戏完成：本次记录 ID ${recordedId}，5 轮、4 次正确，新增记录及报告通过`)
        await sleep(1500)
      },
    },
    {
      id: '06-report',
      narration: '完成后进入本次报告。先核对学生和训练任务，再查看表现摘要和系统生成的建议。向下滚动到训练数据，可以查看实际训练时长、正确率、平均反应时间和正确次数。本次演示五轮中答对四轮，正确率为百分之八十。',
      caption: '本次 4/5，正确率 80%\n训练时长按实际开始到结束计，不按设置上限累乘',
      async act(page) {
        await page.locator('.student-info').hover()
        await sleep(5000)
        await page.locator('.stats-section').scrollIntoViewIfNeeded()
        if (!(await page.locator('.stats-section').innerText()).includes(`${recordedDuration}s`)) throw new Error('报告未显示本次实际训练时长')
        await sleep(6000)
      },
    },
    {
      id: '07-find-record',
      narration: '后续需要回看时，从学生管理找到这名学生，打开详情，切换到游戏训练。在记录列表中核对训练任务和时间，找到刚才的颜色配对记录，点击查看详情。',
      caption: '学生管理 → 学生详情 → 游戏训练\n按任务和时间找到本次记录，点击查看详情',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '学生管理' }).first().click()
        await page.locator('input[placeholder*="搜索学生姓名"]').fill('演示生甲')
        await page.locator('.student-card').filter({ hasText: '演示生甲' }).getByRole('link', { name: '查看详情' }).click()
        await page.getByRole('tab', { name: /游戏训练/u }).click()
        const row = page.locator('.el-tab-pane:visible .records-table .el-table__row').filter({ hasText: '颜色配对' }).first()
        await row.scrollIntoViewIfNeeded()
        await row.hover()
        const durationLabel = recordedDuration >= 60
          ? `${Math.floor(recordedDuration / 60)}分 ${recordedDuration % 60}秒`
          : `${recordedDuration}秒`
        if (!(await row.innerText()).includes(durationLabel)) throw new Error('列表时长与本次实际训练时长不一致')
        await sleep(4000)
        await row.getByRole('button', { name: '查看详情', exact: true }).click()
        await page.waitForURL(/#\/games\/report\?/u)
        const reopened = Number(new URL(page.url().split('#')[1], 'http://demo').searchParams.get('recordId'))
        if (reopened !== recordedId) throw new Error('档案回查未打开本次训练记录')
        await sleep(2800)
      },
    },
    {
      id: '08-check',
      narration: '再次打开的是同一条训练报告，次数、正确率和实际时长与刚才一致，说明本次结果已经进入学生档案。以后可以从这里逐次回查。训练完成后记得核对记录，避免把切换页面当作已经完成和保存。',
      caption: '回查同一条报告，确认次数、正确率和实际时长已保存',
      async act(page) {
        await page.locator('.stats-section').scrollIntoViewIfNeeded()
        await sleep(6000)
      },
    },
    {
      id: '09-end',
      narration: '本节完成。我们已经走完游戏准备、实际训练、自动保存和档案回查。下一讲将演示器材训练的软件操作与快速录入。',
      caption: '本节完成\n下一讲：器材训练与快速录入',
      async act(page) {
        await showCard(page, '本节完成', '下一讲：器材训练与快速录入')
        await sleep(4500)
        await hideCard(page)
      },
    },
  ]
}
