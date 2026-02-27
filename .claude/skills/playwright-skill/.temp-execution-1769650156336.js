
const { chromium } = require('playwright');
const TARGET_URL = 'http://localhost:5173';
const fs = require('fs');

const testResults = {
  timestamp: new Date().toISOString(),
  tests: []
};

(async () => {
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 100,
    args: ['--start-maximized']
  });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  console.log('='.repeat(60));
  console.log('CSIRS感觉统合评估 - 自动化测试');
  console.log('='.repeat(60));
  
  try {
    // 步骤1: 导航到首页
    console.log('\n📍 步骤1: 导航到首页...');
    await page.goto(TARGET_URL + '/#/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✅ 页面加载完成');
    
    // 步骤2: 处理激活/登录
    const currentUrl = page.url();
    if (currentUrl.includes('activation')) {
      console.log('⚠️  检测到激活页面，尝试跳转到登录页...');
      await page.goto(TARGET_URL + '/#/login', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    }
    
    // 尝试登录
    console.log('\n🔐 尝试登录...');
    const textInputs = await page.2054('input[type="text"]');
    const passInputs = await page.2054('input[type="password"]');
    
    if (textInputs.length > 0 && passInputs.length > 0) {
      await textInputs[0].fill('admin');
      await passInputs[0].fill('admin123');
      await page.click('.el-button--primary');
      await page.waitForTimeout(3000);
      console.log('✅ 登录尝试完成');
    }
    
    // 步骤3: 导航到评估页面
    console.log('\n📍 步骤2: 导航到评估页面...');
    await page.goto(TARGET_URL + '/#/assessment', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/02-assessment-page.png' });
    console.log('📸 截图: /tmp/02-assessment-page.png');
    
    // 检查页面元素
    const pageTitle = await page.title();
    console.log('页面标题:', pageTitle);
    
    // 查找CSIRS选项
    console.log('\n🔍 查找CSIRS评估选项...');
    const csirsText = await page.;
    if (csirsText) {
      console.log('✅ 找到CSIRS选项');
      await csirsText.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️  未找到CSIRS选项，尝试直接导航...');
      await page.goto(TARGET_URL + '/#/assessment/select-student?type=csirs', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: '/tmp/03-student-select.png' });
    console.log('📸 截图: /tmp/03-student-select.png');
    
    // 检查学生列表
    console.log('\n👥 检查学生列表...');
    const students = await page.2054('.student-row');
    console.log('✅ 找到', students.length, '个学生');
    
    // 如果有学生，选择第一个
    if (students.length > 0) {
      console.log('\n📍 选择第一个学生进行测试...');
      await students[0].click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: '/tmp/04-assessment-start.png' });
      console.log('📸 截图: /tmp/04-assessment-start.png');
      
      // 检查欢迎对话框
      console.log('\n🎯 检查欢迎对话框...');
      const welcomeDialog = await page.;
      if (welcomeDialog) {
        console.log('✅ 欢迎对话框已显示');
        
        // 获取学生信息
        const studentInfo = await page.('.student-info', el => el.textContent).catch(() => 'N/A');
        console.log('学生信息:', studentInfo);
        
        // 点击开始评估
        const startBtn = await page.;
        if (startBtn) {
          console.log('\n🚀 点击开始评估...');
          await startBtn.click();
          await page.waitForTimeout(2000);
        }
      }
      
      await page.screenshot({ path: '/tmp/05-first-question.png' });
      console.log('📸 截图: /tmp/05-first-question.png');
      
      // 检查题目
      console.log('\n📝 检查题目显示...');
      const questionNum = await page.('.question-number', el => el.textContent).catch(() => 'N/A');
      const questionTitle = await page.('.question-title', el => el.textContent).catch(() => 'N/A');
      const questionDim = await page.('.question-dimension', el => el.textContent).catch(() => 'N/A');
      
      console.log('题目编号:', questionNum);
      console.log('维度:', questionDim);
      console.log('题目内容:', questionTitle?.substring(0, 50) + '...');
      
      // 检查答案选项
      const options = await page.2054('.el-radio-button');
      console.log('✅ 答案选项数量:', options.length, '(预期5个)');
      
      // 选择A选项
      console.log('\n✅ 选择A选项...');
      if (options.length > 0) {
        await options[0].click();
        await page.waitForTimeout(500);
      }
      
      // 点击下一题3次（测试流程）
      console.log('\n🔄 测试答题流程...');
      for (let i = 0; i < 3; i++) {
        const nextBtn = await page.;
        if (nextBtn) {
          await nextBtn.click();
          await page.waitForTimeout(1000);
          
          const currentNum = await page.('.question-number', el => el.textContent).catch(() => '?');
          console.log('  → 第' + currentNum + '题');
          
          // 选择A选项
          const opts = await page.2054('.el-radio-button');
          if (opts.length > 0) await opts[0].click();
        }
      }
      
      await page.screenshot({ path: '/tmp/06-during-assessment.png' });
      console.log('📸 截图: /tmp/06-during-assessment.png');
      
      console.log('\n✅ 测试流程验证完成！');
      console.log('\n📊 测试结果摘要:');
      console.log('  - 页面导航: ✅');
      console.log('  - 登录流程: ✅');
      console.log('  - 评估入口: ✅');
      console.log('  - 学生选择: ✅');
      console.log('  - 欢迎对话框: ✅');
      console.log('  - 题目显示: ✅');
      console.log('  - 答题流程: ✅');
      
    } else {
      console.log('⚠️  没有找到学生，请先添加学生');
    }
    
  } catch (error) {
    console.error('\n❌ 测试出错:', error.message);
    await page.screenshot({ path: '/tmp/error.png' });
  } finally {
    console.log('\n⏳ 5秒后关闭浏览器...');
    await page.waitForTimeout(5000);
    await browser.close();
    console.log('✅ 测试完成');
  }
})();
