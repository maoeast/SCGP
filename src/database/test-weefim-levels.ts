// 测试WeeFIM水平等级显示修复
import { getWeeFIMLevelAndDescription, weefimLevels } from './weefim-data';

// 模拟不同分数的评估结果
const testScores = [
  { total: 126, expected: '极强' },
  { total: 108, expected: '极强' },
  { total: 107, expected: '良好' },
  { total: 90, expected: '良好' },
  { total: 89, expected: '中等' },
  { total: 72, expected: '中等' },
  { total: 71, expected: '较弱' },
  { total: 54, expected: '较弱' },
  { total: 53, expected: '非常弱' },
  { total: 36, expected: '非常弱' },
  { total: 35, expected: '极度弱' },
  { total: 18, expected: '极度弱' }
];

// 测试函数
export function testWeeFIMLevels() {
  console.log('=== WeeFIM水平等级测试 ===\n');

  testScores.forEach(test => {
    const levelInfo = getWeeFIMLevelAndDescription(test.total);
    const passed = levelInfo.level === test.expected;

    console.log(`分数: ${test.total}`);
    console.log(`期望水平: ${test.expected}`);
    console.log(`实际水平: ${levelInfo.level}`);
    console.log(`分数范围: ${levelInfo.range}`);
    console.log(`结果: ${passed ? '✓ 通过' : '✗ 失败'}`);
    console.log('---');
  });

  // 测试边界情况
  console.log('\n=== 边界测试 ===');

  // 测试超出范围的分数
  const edgeCases = [
    { score: 200, desc: '超高分' },
    { score: 0, desc: '0分' },
    { score: -10, desc: '负数' }
  ];

  edgeCases.forEach(test => {
    const levelInfo = getWeeFIMLevelAndDescription(test.score);
    console.log(`\n${test.desc} (分数: ${test.score}):`);
    console.log(`  返回水平: ${levelInfo.level}`);
    console.log(`  分数范围: ${levelInfo.range}`);
  });
}

// 测试Report.vue中的函数逻辑
export function testReportFunctions() {
  console.log('\n=== Report.vue函数测试 ===\n');

  // 模拟getIndependenceLevelText函数的逻辑
  function getIndependenceLevelText(level: string | number): string {
    if (typeof level === 'string') {
      const levelTextMap: Record<string, string> = {
        '完全独立': '完全独立',
        '基本独立': '基本独立',
        '轻度依赖': '轻度依赖',
        '中度依赖': '中度依赖',
        '重度依赖': '重度依赖',
        '极重度依赖': '极重度依赖',
        '完全依赖': '完全依赖',
        '极强': '功能独立性极强',
        '良好': '功能独立性良好',
        '中等': '功能独立性中等',
        '较弱': '功能独立性较弱',
        '非常弱': '功能独立性非常弱',
        '极度弱': '功能独立性极度弱'
      };
      return levelTextMap[level] || level;
    }
    return level.toString();
  }

  // 测试所有WeeFIM水平
  const testLevels = ['极强', '良好', '中等', '较弱', '非常弱', '极度弱'];

  testLevels.forEach(level => {
    const result = getIndependenceLevelText(level);
    console.log(`水平: ${level} -> 显示文本: ${result}`);
  });

  // 测试数字级别
  console.log('\n数字级别测试:');
  for (let i = 1; i <= 7; i++) {
    const result = getIndependenceLevelText(i);
    console.log(`级别: ${i} -> 显示文本: ${result}`);
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testWeeFIMLevels();
  testReportFunctions();
}