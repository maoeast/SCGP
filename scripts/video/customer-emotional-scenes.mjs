/** 教程 13：情绪调节小游戏的真实操作和保存回查。 */
import fs from 'node:fs'
import path from 'node:path'

let baseline
let gameRecordId

export async function verifyEmotionalTraining(page, studentId, output) {
  const saved = await page.evaluate(({ studentId, gameRecordId }) => ({
    game: window.db.get('SELECT * FROM game_emotion_records WHERE id = ?', [gameRecordId]),
    gameCount: window.db.get('SELECT count(*) AS n FROM game_emotion_records WHERE student_id = ?', [studentId]).n,
    trainingCount: window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [studentId]).n,
  }), { studentId, gameRecordId })
  const performance = JSON.parse(saved.game?.performance_data || '{}')
  if (saved.gameCount !== baseline.games + 1 || saved.trainingCount !== baseline.training
    || saved.game?.student_id !== studentId || saved.game.game_code !== 'G01_BALLOON'
    || saved.game.completion_status !== 'completed' || saved.game.difficulty_level !== 1
    || performance.successful_cycles !== 1 || saved.game.duration_ms <= 0) throw new Error('情绪训练完成或原始表现验证失败')
  const evidence = { studentId, gameCode: 'G01_BALLOON', gameRecordId,
    completionStatus: saved.game.completion_status, difficulty: 1,
    durationMs: saved.game.duration_ms, successfulCycles: performance.successful_cycles,
    inhaleSamplesMs: performance.inhale_samples_ms, theme: performance.session_theme_title,
    objective: performance.session_objective_title, gameCountBefore: baseline.games, gameCountAfter: saved.gameCount,
    trainingCountBefore: baseline.training, trainingCountAfter: saved.trainingCount, verified: true }
  fs.writeFileSync(path.join(output, 'emotional-training-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildEmotionalScenes({ showCard, hideCard, sleep, studentId, output }) {
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第十三讲：情绪调节训练与记录回查。本节以深呼吸热气球为例，演示选择学生、设置难度、完成互动，以及查看保存结果。全部作答都是流程演示。',
      caption: '软件操作教程 13\n情绪调节训练与记录回查',
      async act(page) {
        baseline = await page.evaluate((id) => ({
          games: window.db.get('SELECT count(*) AS n FROM game_emotion_records WHERE student_id = ?', [id]).n,
          training: window.db.get('SELECT count(*) AS n FROM training_records WHERE student_id = ?', [id]).n,
        }), studentId)
        await showCard(page, '软件操作教程 13', '情绪调节 · 深呼吸热气球 · 保存回查')
        await sleep(4500)
      },
    },
    {
      id: '02-entry',
      narration: '从游戏训练进入情绪调节，再选择本次训练的学生。先核对姓名，确保记录写入正确档案。当前账号需要开通相应能力包。本例使用演示生甲，其他学生不参与本次操作。',
      caption: '游戏训练 → 情绪调节 → 选择学生\n核对演示生甲，确认训练归属',
      async act(page) {
        await hideCard(page)
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '游戏训练' }).click()
        await page.locator('.module-card').filter({ hasText: '情绪调节' }).click()
        await page.getByPlaceholder('搜索学生姓名或学号').fill('演示生甲')
        const row = page.locator('.el-table__row').filter({ hasText: '演示生甲' })
        await row.waitFor()
        await sleep(2500)
        await row.getByRole('button', { name: '选择', exact: true }).click()
        await page.locator('.game-card').filter({ hasText: '深呼吸热气球' }).waitFor()
        await sleep(1800)
      },
    },
    {
      id: '03-prepare',
      narration: '选择深呼吸热气球，阅读右侧任务说明，再设置开始前难度。本次选择简单。页面会介绍按住和松开的操作方式。难度和实际使用安排，应结合学生当下状态决定；本节只演示软件流程。',
      caption: '深呼吸热气球 → 阅读说明 → 简单难度\n准备完成后进入全屏训练',
      async act(page) {
        await page.locator('.game-card').filter({ hasText: '深呼吸热气球' }).click()
        await page.locator('.preview-section').waitFor()
        await page.locator('.el-radio-button').filter({ hasText: /^简单$/u }).click()
        await page.locator('.start-button').scrollIntoViewIfNeeded()
        await sleep(4500)
      },
    },
    {
      id: '04-game-view',
      narration: '进入训练后，先看右上方的学生信息，以及画面中的任务目标和操作提示。本次简单难度完成一次互动。不同轮次可能出现不同天空主题与目标，操作前应以当次画面提示为准。',
      caption: '核对右上方学生与当次任务提示\n不同轮次的主题和目标可能变化',
      async act(page) {
        await page.locator('.start-button').click()
        await page.locator('.balloon-game .breath-button').waitFor()
        await page.locator('.student-pill').filter({ hasText: '演示生甲' }).waitFor()
        await sleep(5000)
      },
    },
    {
      id: '05-play',
      narration: '按住主按钮，观察热气球和秒数变化；达到画面要求后松开。系统播放升空和完成反馈，并保存本次记录。这里展示的是鼠标操作，不是测量真实呼吸，也不用于判断训练效果。',
      caption: '按住主按钮 → 观察变化 → 松开 → 完成反馈\n鼠标交互不等于真实呼吸测量',
      async act(page) {
        await page.locator('.breath-button').hover()
        await sleep(1500)
        await page.mouse.down()
        await page.waitForFunction(() => parseFloat(document.querySelector('.hud-card:last-child strong')?.textContent || '0') > 0.2, undefined, { timeout: 15000 })
        await sleep(3500)
        await page.mouse.up()
        await page.waitForFunction(({ id, before }) => window.db.get('SELECT count(*) AS n FROM game_emotion_records WHERE student_id = ?', [id]).n === before + 1,
          { id: studentId, before: baseline.games }, { timeout: 30000 })
        gameRecordId = await page.evaluate((id) => window.db.get('SELECT max(id) AS id FROM game_emotion_records WHERE student_id = ?', [id]).id, studentId)
        await verifyEmotionalTraining(page, studentId, output)
        await sleep(2500)
      },
    },
    {
      id: '06-return',
      narration: '完成后，系统可以继续下一次练习。如果本次不再继续，点击安静退出，返回训练准备页。这类情绪调节游戏不会自动生成 IEP 报告。需要回顾时，请从训练记录查看本次完成状态与具体表现。',
      caption: '完成后可继续练习，或“安静退出”返回\n本入口不自动生成 IEP 报告，从训练记录查看表现',
      async act(page) {
        await page.getByRole('button', { name: '安静退出', exact: true }).click()
        await page.locator('.game-card').filter({ hasText: '深呼吸热气球' }).waitFor()
        await sleep(4000)
      },
    },
    {
      id: '07-recall',
      narration: '从左侧训练记录进入情绪调节，按学生筛选，再找到深呼吸热气球，点击查看详情。核对学生、完成状态和本次表现。重新载入后，详情仍然存在，说明本次操作已保存，可以供后续回顾。',
      caption: '训练记录 → 情绪调节 → 筛选学生 → 查看详情\n核对完成状态与表现，重载后再次回查',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: /^训练记录$/u }).click()
        await page.locator('.module-card').filter({ hasText: '情绪调节' }).click()
        await page.locator('.student-filter').click()
        await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^演示生甲$/u }).click()
        const row = page.locator('.records-table .el-table__row').filter({ hasText: '深呼吸热气球' }).first()
        await row.waitFor()
        await row.hover()
        await sleep(2700)
        await row.getByRole('button', { name: '查看详情', exact: true }).click()
        await page.locator('.emotional-game-record-page').waitFor()
        if (Number(new URL(page.url()).hash.match(/recordId=(\d+)/u)?.[1]) !== gameRecordId) throw new Error('回查的小游戏记录不是本次完成记录')
        await sleep(3200)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.locator('.emotional-game-record-page').getByText('演示生甲', { exact: true }).waitFor()
        await verifyEmotionalTraining(page, studentId, output)
        await sleep(3500)
        console.log('情绪调节闭环通过：完整互动、原始表现、详情与重载回查一致')
      },
    },
    {
      id: '08-end',
      narration: '本节完成。先确认学生和难度，再按当次提示操作，结束后核对保存结果。需要回顾时，从训练记录按入口和学生查找。感谢观看。',
      caption: '本节完成\n感谢观看',
      async act(page) {
        await showCard(page, '本节完成', '确认学生 · 完成互动 · 保存与回查')
        await sleep(4500)
      },
    },
  ]
}
