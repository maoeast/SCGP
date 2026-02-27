// /tmp/playwright-test-csirs-full.js
// CSIRS感觉统合评估完整流程测试
const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5173';

// 测试配置
const testCases = [
  {
    name: 'Test Case 1: 4岁儿童 - 全部A选项（高分）',
    studentName: '测试儿童-4岁',
    studentNo: 'TEST004',
    gender: '男',
    birthday: '2021-01-15', // 4岁
    disorder: '自闭症谱系障碍',
    answerValue: 5, // A选项 - 5分
    expectedLevel: '优秀',
    description: '4岁儿童，50题，无executive维度，预期高分无flags'
  },
  {
    name: 'Test Case 2: 9岁儿童 - 全部E选项（低分-Learning风险）',
    studentName: '测试儿童-9岁',
    studentNo: 'TEST009',
    gender: '女',
    birthday: '2016-06-20', // 9岁
    disorder: '注意力缺陷多动障碍',
    answerValue: 1, // E选项 - 1分
    expectedLevel: '需要支持',
    expectedFlags: ['LD_RISK'],
    description: '9岁儿童，55题，无executive维度，预期LD_RISK flag'
  },
  {
    name: 'Test Case 3: 10岁儿童 - Learning低分触发LD_RISK',
    studentName: '测试儿童-10岁',
    studentNo: 'TEST010',
    gender: '男',
    birthday: '2015-08-10', // 10岁
    disorder: '发育协调障碍',
    customAnswers: { learning: 1 }, // Learning维度选E（1分）
    defaultAnswer: 5,
    expectedLevel: '需要支持',
    expectedFlags: ['LD_RISK'],
    description: '10岁儿童，58题含executive，预期LD_RISK flag'
  },
  {
    name: 'Test Case 4: 11岁儿童 - Executive低分触发EXECUTIVE_DEFICIT',
    studentName: '测试儿童-11岁',
    studentNo: 'TEST011',
    gender: '女',
    birthday: '2014-03-25', // 11岁
    disorder: '学习障碍',
    customAnswers: { executive: 1 }, // Executive维度选E（1分，百分制<40）
    defaultAnswer: 5,
    expectedLevel: '良好',
    expectedFlags: ['EXECUTIVE_DEFICIT'],
    description: '11岁儿童，58题，预期EXECUTIVE_DEFICIT flag'
  }
];

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('='.repeat(80));
  console.log('CSIRS感觉统合评估 - 完整流程测试');
  console.log('='.repeat(80));

  try {
    // ============ 步骤1: 导航到首页 ============
    console.log('\n📍 步骤1: 导航到首页...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✅ 页面加载完成:', await page.title());

    // ============ 步骤2: 登录（如果需要）============
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/activation')) {
      console.log('\n📍 步骤2: 需要登录/激活...');

      // 检查是否在激活页面
      if (currentUrl.includes('/activation')) {
        console.log('⚠️  检测到激活页面，尝试跳过...');
        // 尝试直接导航到登录页
        await page.goto(`${TARGET_URL}/login`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
      }

      // 在登录页尝试登录
      console.log('🔐 尝试登录...');
      const loginInput = await page.$('input[type="text"], input[placeholder*="用户"], input[placeholder*="账号"]');
      const passwordInput = await page.$('input[type="password"]');

      if (loginInput && passwordInput) {
        await loginInput.fill('admin');
        await passwordInput.fill('admin123');
        await page.click('button[type="submit"], .el-button--primary');
        await page.waitForTimeout(2000);
        console.log('✅ 登录成功');
      } else {
        console.log('⚠️  未找到登录表单，可能已登录或页面结构不同');
      }
    } else {
      console.log('\n✅ 已处于登录状态或无需登录');
    }

    // ============ 步骤3: 导航到评估页面 ============
    console.log('\n📍 步骤3: 导航到评估选择页面...');
    await page.goto(`${TARGET_URL}/#/assessment`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✅ 到达评估选择页面');

    // 截图保存评估选择页面
    await page.screenshot({ path: '/tmp/01-assessment-select.png' });
    console.log('📸 截图: /tmp/01-assessment-select.png');

    // ============ 步骤4: 选择CSIRS评估 ============
    console.log('\n📍 步骤4: 选择CSIRS感觉统合评估...');

    // 查找CSIRS卡片/按钮
    const csirsSelectors = [
      'text=CSIRS',
      'text=感觉统合',
      '.csirs-card',
      '[data-testid="csirs-assessment"]'
    ];

    let csirsFound = false;
    for (const selector of csirsSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          csirsFound = true;
          console.log('✅ 点击CSIRS评估选项');
          break;
        }
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }

    if (!csirsFound) {
      console.log('⚠️  未找到CSIRS选项，尝试直接导航...');
      await page.goto(`${TARGET_URL}/#/assessment/select-student?type=csirs`, { waitUntil: 'networkidle' });
    }

    await page.waitForTimeout(2000);

    // ============ 步骤5: 执行测试用例 ============
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log('\n' + '='.repeat(80));
      console.log(`📝 测试用例 ${i + 1}/${testCases.length}: ${testCase.name}`);
      console.log(`   ${testCase.description}`);
      console.log('='.repeat(80));

      // ============ 5.1 选择/添加学生 ============
      console.log('\n   📍 5.1 选择学生...');
      await page.waitForTimeout(1000);

      // 查找现有学生
      const existingStudent = await page.$(`text="${testCase.studentName}"`);
      if (existingStudent) {
        await existingStudent.click();
        console.log(`   ✅ 选择现有学生: ${testCase.studentName}`);
      } else {
        // 添加新学生
        console.log(`   ➕ 添加新学生: ${testCase.studentName}`);
        const addBtn = await page.$('text=添加新学生');
        if (addBtn) {
          await addBtn.click();
          await page.waitForTimeout(1000);

          // 填写学生信息
          await page.fill('input[name="name"], input[placeholder*="姓名"]', testCase.studentName);
          await page.fill('input[name="student_no"], input[placeholder*="学号"]', testCase.studentNo);

          // 选择性别
          const genderRadio = await page.$(`.el-radio:has-text("${testCase.gender}")`);
          if (genderRadio) await genderRadio.click();

          // 填写生日
          await page.fill('input[type="date"]', testCase.birthday);

          // 填写诊断类型
          await page.fill('input[name="disorder"], input[placeholder*="诊断"]', testCase.disorder);

          // 保存
          await page.click('text=保存, text=提交');
          await page.waitForTimeout(2000);
          console.log('   ✅ 学生添加成功');
        }
      }

      await page.waitForTimeout(2000);

      // ============ 5.2 开始评估 ============
      console.log('\n   📍 5.2 开始CSIRS评估...');

      // 等待欢迎对话框
      await page.waitForSelector('.welcome-dialog, .el-dialog', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // 点击"开始评估"按钮
      const startBtn = await page.$('text=开始评估, text=我已了解');
      if (startBtn) {
        await startBtn.click();
        console.log('   ✅ 开始评估');
        await page.waitForTimeout(1000);
      }

      // ============ 5.3 回答问题 ============
      console.log('\n   📍 5.3 回答问题...');

      let questionCount = 0;
      let maxQuestions = 60; // 防止无限循环

      while (questionCount < maxQuestions) {
        // 检查是否完成
        const confirmDialog = await page.$('text=确认完成, text=提交评估');
        if (confirmDialog) {
          console.log(`   ✅ 完成 ${questionCount} 题`);
          break;
        }

        // 检查是否还有题目
        const questionTitle = await page.$('.question-title');
        if (!questionTitle) {
          console.log('   ✅ 无更多题目');
          break;
        }

        // 获取当前题号
        const questionNum = await page.$eval('.question-number', el => el.textContent).catch(() => '?');

        // 获取当前维度
        const currentDimension = await page.$eval('.question-dimension', el => el.textContent).catch(() => 'unknown');

        // 根据配置选择答案
        let answerValue = testCase.defaultAnswer;
        if (testCase.customAnswers) {
          for (const [dim, value] of Object.entries(testCase.customAnswers)) {
            if (currentDimension.toLowerCase().includes(dim.toLowerCase())) {
              answerValue = value;
              break;
            }
          }
        }

        // 选择答案 (A=5, B=4, C=3, D=2, E=1)
        const answerMap = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
        const answerLabel = answerMap[answerValue] || 'C';

        const answerOption = await page.$(`.el-radio-button:has-text("${answerLabel}")`);
        if (answerOption) {
          await answerOption.click();
          await page.waitForTimeout(200);
        }

        questionCount++;

        // 点击下一题
        const nextBtn = await page.$('text=下一题, text=完成评估');
        if (nextBtn) {
          await nextBtn.click();
          await page.waitForTimeout(300);
        } else {
          break;
        }
      }

      console.log(`   ✅ 共完成 ${questionCount} 题`);

      // ============ 5.4 提交评估 ============
      console.log('\n   📍 5.4 提交评估...');

      // 检查确认对话框
      const confirmSubmitBtn = await page.$('text=提交评估');
      if (confirmSubmitBtn) {
        await confirmSubmitBtn.click();
        console.log('   ✅ 已提交评估');
      }

      await page.waitForTimeout(3000);

      // ============ 5.5 验证报告页面 ============
      console.log('\n   📍 5.6 验证报告页面...');

      const reportUrl = page.url();
      console.log(`   📊 报告URL: ${reportUrl}`);

      // 截图报告
      await page.screenshot({
        path: `/tmp/test-case-${i + 1}-report.png`,
        fullPage: true
      });
      console.log('   📸 截图: /tmp/test-case-' + (i + 1) + '-report.png');

      // 验证关键元素
      const checks = {
        '总分T分': '.total-score, .t-score, text=T分',
        '评定等级': '.level, .evaluation-level, text=优秀|text=良好|text=需要支持',
        '维度得分': '.dimension-score, .dimension-card',
        '反馈内容': '.feedback, .advice, .evaluation-content'
      };

      for (const [name, selector] of Object.entries(checks)) {
        const element = await page.$(selector);
        console.log(`   ${element ? '✅' : '⚠️ '} ${name}: ${element ? '已显示' : '未找到'}`);
      }

      // 验证 Flags
      if (testCase.expectedFlags && testCase.expectedFlags.length > 0) {
        console.log('\n   🚩 验证 Flags 预警...');
        for (const flag of testCase.expectedFlags) {
          const flagElement = await page.$(`text=${flag}, .flag, .warning`);
          console.log(`   ${flagElement ? '✅' : '❌'} ${flag}: ${flagElement ? '已触发' : '未触发'}`);
        }
      }

      // 返回进行下一个测试
      console.log('\n   📍 返回重新测试...');
      await page.goto(`${TARGET_URL}/#/assessment`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // 点击CSIRS
      const csirsLink = await page.$('text=CSIRS, text=感觉统合');
      if (csirsLink) await csirsLink.click();
      await page.waitForTimeout(2000);
    }

    // ============ 测试完成 ============
    console.log('\n' + '='.repeat(80));
    console.log('✅ 所有测试用例完成！');
    console.log('='.repeat(80));
    console.log('\n📸 截图文件位于 /tmp/ 目录');
    console.log('\n请检查以下内容：');
    console.log('  1. 各年龄组题目数量是否正确（4岁=50题，9岁=55题，10-12岁=58题）');
    console.log('  2. T分计算是否正确');
    console.log('  3. Flags 预警是否正确触发');
    console.log('  4. 报告页面反馈内容是否完整显示');
    console.log('  5. Executive 维度是否只在10岁及以上显示');

  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png' });
    console.log('📸 错误截图: /tmp/error-screenshot.png');
  } finally {
    console.log('\n⏳ 10秒后关闭浏览器...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();
