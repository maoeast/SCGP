/** 教程 11：新建班级、教师分配、学生调班与名单回查。 */
import fs from 'node:fs'
import path from 'node:path'

const className = '演示小班'
let baseline
let classId
let teacherId
let academicYear
let classNumber

export async function verifyClassManagement(page, studentId, output) {
  const saved = await page.evaluate(({ studentId, classId, teacherId, sourceClassId }) => ({
    student: window.db.get('SELECT current_class_id, current_class_name FROM student WHERE id = ?', [studentId]),
    target: window.db.get('SELECT * FROM sys_class WHERE id = ?', [classId]),
    source: window.db.get('SELECT current_enrollment FROM sys_class WHERE id = ?', [sourceClassId]),
    teacher: window.db.get('SELECT id FROM sys_class_teachers WHERE class_id = ? AND teacher_id = ?', [classId, teacherId]),
    history: window.db.get('SELECT * FROM student_class_history WHERE student_id = ? AND academic_year = (SELECT academic_year FROM sys_class WHERE id = ?)', [studentId, classId]),
    count: window.db.get('SELECT count(*) AS n FROM sys_class').n,
  }), { studentId, classId, teacherId, sourceClassId: baseline.source.id })
  if (saved.count !== baseline.count + 1 || saved.target.name !== className || saved.target.max_students !== 12
    || saved.target.current_enrollment !== 1 || saved.source.current_enrollment !== baseline.source.current_enrollment - 1
    || saved.student.current_class_id !== classId || saved.student.current_class_name !== className || !saved.teacher
    || saved.history.class_id !== classId || saved.history.is_current !== 1) throw new Error('班级、教师关联、调班或在籍人数核对失败')
  const evidence = { classId, className, academicYear, classNumber, maxStudents: 12, studentId, teacherId,
    sourceClassId: baseline.source.id, sourceEnrollmentBefore: baseline.source.current_enrollment,
    sourceEnrollmentAfter: saved.source.current_enrollment, targetEnrollment: 1,
    classCountBefore: baseline.count, classCountAfter: saved.count, historyId: saved.history.id,
    sameYearHistoryRowReused: saved.history.id === baseline.history.id, verified: true }
  fs.writeFileSync(path.join(output, 'class-management-verification.json'), JSON.stringify(evidence, null, 2), 'utf8')
  return evidence
}

export function buildClassScenes({ showCard, hideCard, sleep, studentId, output }) {
  const management = (page) => page.locator('.class-management-page')
  const assignment = (page) => page.locator('.student-class-page')
  const classCard = (page) => management(page).locator('.class-card').filter({ has: page.getByRole('heading', { name: className, exact: true }) })
  const studentRow = (page) => assignment(page).locator('.el-table__row').filter({ hasText: '演示生甲' })
  const dialog = (page, title) => page.locator('.el-dialog:visible').filter({ has: page.locator('.el-dialog__title').getByText(title, { exact: true }) })
  async function select(page, box, label, option) {
    await box.locator('.el-form-item').filter({ has: page.locator('.el-form-item__label').getByText(label, { exact: true }) }).locator('.el-select').click()
    await page.locator('.el-select-dropdown__item:visible').filter({ hasText: new RegExp(`^${option}$`, 'u') }).click()
    await sleep(1100)
  }
  async function filterClass(page, name) {
    await assignment(page).locator('.compact-select').first().click()
    await page.locator('.el-select-dropdown__item:visible').filter({ hasText: name }).filter({ hasText: new RegExp(`^${name}$`, 'u') }).click()
    await studentRow(page).waitFor()
    await sleep(1300)
  }
  async function classYear(page) {
    await management(page).locator('.filter-selects .el-select').last().click()
    await page.locator('.el-select-dropdown__item:visible').filter({ hasText: academicYear }).click()
    await sleep(1300)
  }
  return [
    {
      id: '01-title',
      narration: '星愿能力发展平台。软件操作教程第十一讲：班级与学生分班。本节面向使用班级流程的客户，演示新建班级、分配教师、学生调班和名单回查。全部操作使用演示数据。',
      caption: '软件操作教程 11\n班级与学生分班 · 按需选看',
      async act(page) {
        baseline = await page.evaluate((id) => {
          const db = window.db
          const student = db.get('SELECT * FROM student WHERE id = ?', [id])
          const source = db.get('SELECT * FROM sys_class WHERE id = ?', [student.current_class_id])
          return { source, history: db.get('SELECT * FROM student_class_history WHERE student_id = ? AND is_current = 1', [id]),
            count: db.get('SELECT count(*) AS n FROM sys_class').n,
            teachers: db.all("SELECT id FROM user WHERE role = 'teacher' AND is_active = 1 ORDER BY id"),
            classes: db.all('SELECT grade_level, class_number, academic_year FROM sys_class') }
        }, studentId)
        academicYear = baseline.history.academic_year
        if (baseline.source.grade_level !== 1) throw new Error('演示学生当前不是小班，需重新设计本讲示例')
        classNumber = Array.from({ length: 10 }, (_, i) => i + 1).find((n) => !baseline.classes.some((c) => c.grade_level === 1 && c.academic_year === academicYear && c.class_number === n))
        teacherId = baseline.teachers[0]?.id
        if (!classNumber || !teacherId) throw new Error('缺少可用班号或教师账号')
        await showCard(page, '软件操作教程 11', '新建班级 · 分配教师 · 调班与回查')
        await sleep(4500)
        await hideCard(page)
      },
    },
    {
      id: '02-class-center',
      narration: '从左侧进入班级管理，先核对学年，再按学段和年级查找。页面提供网格和表格两种视图。班级卡片显示在籍人数与最大人数，并提供学生、分配老师和编辑入口。本次使用管理员账号。',
      caption: '班级管理：先核对学年，再筛选学段和年级\n卡片可查看在籍人数与维护入口',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '班级管理' }).click()
        await management(page).waitFor()
        await management(page).getByRole('button', { name: '网格视图', exact: true }).click()
        await classYear(page)
        await management(page).getByRole('button', { name: '表格视图', exact: true }).click()
        await sleep(2800)
        await management(page).getByRole('button', { name: '网格视图', exact: true }).click()
        await sleep(2200)
      },
    },
    {
      id: '03-create-class',
      narration: '点击新建班级，核对学年，选择年级和班号，设置最大人数。这里新建一个演示小班，最多十二人，并使用自定义名称。同一学年、年级与班号不能重复。检查后点击确定，保存班级。',
      caption: '新建班级：学年、年级、班号、最大人数与名称\n本例：演示小班，最大 12 人',
      async act(page) {
        await management(page).getByRole('button', { name: '新建班级', exact: true }).click()
        const box = dialog(page, '新建班级')
        await select(page, box, '学年', academicYear)
        await select(page, box, '年级', '小班')
        await select(page, box, '班号', `${classNumber}班`)
        await box.getByRole('spinbutton').fill('12')
        await box.getByText('使用自定义名称', { exact: true }).click()
        await box.getByPlaceholder('请输入自定义班级名称').fill(className)
        await sleep(4200)
        await box.getByRole('button', { name: '确定', exact: true }).click()
        await box.waitFor({ state: 'hidden' })
        classId = await page.evaluate((name) => window.db.get('SELECT id FROM sys_class WHERE name = ?', [name])?.id, className)
        if (!classId) throw new Error('新建班级未保存')
        await classCard(page).scrollIntoViewIfNeeded()
        await sleep(2400)
      },
    },
    {
      id: '04-assign-teacher',
      narration: '在新班级卡片点击分配老师，从已有教师账号中选择负责教师。选中后，上方已分配老师会更新。这里关联的是系统中的教师账号。需要新增账号时，可参考用户账号与角色管理一讲。',
      caption: '分配老师：从已有教师账号中选择\n核对“已分配老师”后关闭',
      async act(page) {
        await classCard(page).getByRole('button', { name: '分配老师', exact: true }).click()
        const box = page.locator('.el-dialog:visible')
        await box.locator('.el-select').click()
        await page.locator('.el-select-dropdown__item:visible').first().click()
        await sleep(3500)
        const assigned = await page.evaluate((id) => window.db.get('SELECT teacher_id FROM sys_class_teachers WHERE class_id = ?', [id]), classId)
        if (!assigned) throw new Error('教师关联未保存')
        teacherId = assigned.teacher_id
        await box.getByRole('button', { name: '关闭', exact: true }).click()
        await sleep(1200)
      },
    },
    {
      id: '05-student-assignment',
      narration: '进入学生分班，按原班级筛选，找到演示生甲。已有班级的学生显示调班，未分班学生显示分班。点击调班，核对学年、目标班级和入班日期，再确定。本次把学生调入刚才新建的演示小班。',
      caption: '学生分班 → 按原班级筛选 → 调班\n核对学年、目标班级和入班日期后确定',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '学生分班' }).click()
        await assignment(page).waitFor()
        await filterClass(page, baseline.source.name)
        await studentRow(page).getByRole('button', { name: '调班', exact: true }).click()
        const box = dialog(page, '学生分班')
        await select(page, box, '选择学年', academicYear)
        await box.locator('.el-form-item').filter({ hasText: '选择班级' }).locator('.el-select').click()
        await page.locator('.el-select-dropdown__item:visible').filter({ hasText: className }).click()
        await sleep(4500)
        await box.getByRole('button', { name: '确定', exact: true }).click()
        await box.waitFor({ state: 'hidden' })
        await filterClass(page, className)
        await verifyClassManagement(page, studentId, output)
        await sleep(2500)
      },
    },
    {
      id: '06-history',
      narration: '分班后，按目标班级筛选，可以看到学生当前班级已更新。点击班级历史，核对学年、班级和入班日期。需要处理多名学生时，可勾选后使用批量分班；学年升级是另一项操作，应先核对新学年安排。',
      caption: '核对当前班级，再打开“班级历史”查看\n批量分班与学年升级需按实际工作安排操作',
      async act(page) {
        await studentRow(page).hover()
        await sleep(2300)
        await studentRow(page).getByRole('button', { name: '班级历史', exact: true }).click()
        const box = dialog(page, '班级变更历史')
        await box.getByRole('heading', { name: className, exact: true }).waitFor()
        await sleep(5200)
        await box.locator('.el-dialog__headerbtn').click()
        await sleep(1000)
      },
    },
    {
      id: '07-recall',
      narration: '最后回到班级管理，重新载入后，按学年找到演示小班。在籍人数为一人，打开学生名单，可以回查到演示生甲。再查看负责教师，关联仍然保留。完成后，班级、教师与学生归属应相互对应。',
      caption: '重载回查：班级在籍人数、学生名单与负责教师\n本例：演示小班 1 / 12 人',
      async act(page) {
        await page.locator('.sidebar-nav .nav-item').filter({ hasText: '班级管理' }).click()
        await management(page).waitFor()
        await page.reload({ waitUntil: 'domcontentloaded' })
        await management(page).waitFor()
        await classYear(page)
        await classCard(page).scrollIntoViewIfNeeded()
        await sleep(2500)
        await classCard(page).getByRole('button', { name: '学生', exact: true }).click()
        let box = page.locator('.el-dialog:visible')
        await box.getByText('演示生甲', { exact: true }).waitFor()
        await sleep(4000)
        await box.getByRole('button', { name: '关闭', exact: true }).click()
        await classCard(page).getByRole('button', { name: '分配老师', exact: true }).click()
        box = page.locator('.el-dialog:visible')
        await sleep(3000)
        await verifyClassManagement(page, studentId, output)
        await box.getByRole('button', { name: '关闭', exact: true }).click()
        console.log('班级闭环通过：新建、教师关联、调班、源班与新班人数和重载名单一致')
      },
    },
    {
      id: '08-end',
      narration: '本节完成。先核对学年并建立班级，再分配教师和学生，最后回查名单与在籍人数。班级流程可按机构需要使用。下一讲介绍授权信息与软件更新。',
      caption: '本节完成\n下一讲：授权信息与软件更新',
      async act(page) {
        await showCard(page, '本节完成', '下一讲：授权信息与软件更新')
        await sleep(4500)
        await hideCard(page)
      },
    },
  ]
}
