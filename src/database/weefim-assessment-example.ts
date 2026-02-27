// WeeFIM评估解析使用示例
import { parseWeeFIMAssessment } from './weefim-assessment-parser';
import { generateAssessmentFromRecommendations, weefimQuestions } from './weefim-data';

// 示例评估文本（来自weefim_content.txt）
const exampleAssessmentTexts = [
  // 示例1：功能独立性中等
  `儿童功能独立性中等，在日常生活和认知功能上既有一定的自主能力，又在多个方面需要不同程度的协助。
   在自理能力方面，进食时能独立完成大部分动作，但偶尔需要他人提醒；梳洗修饰时需要中度协助，
   洗澡时需要他人帮忙调节水温。穿衣方面，穿上衣需要他人帮忙撑开袖口，穿裤子基本能独立完成。
   如厕时能表达需求，但擦拭需要帮助。

   在括约肌控制方面，白天基本能控制排尿，但偶尔会有尿失禁情况，晚上尿床较频繁。
   排便基本能控制，但需要他人提醒。

   在转移方面，床椅转移需要中度协助，轮椅转移需要大量协助，进出浴盆时需要他人扶持。

   在行走方面，能在平地上短距离行走，但需要他人密切监护，上下楼梯困难。

   在认知功能方面，能理解简单的日常指令，但对于稍复杂的指令需要重复讲解。
   能用简单的词语表达基本需求，但表达不够清晰。社会交往方面，需要他人引导才能参与互动，
   解决问题时需要他人较多指导。记忆方面，能记住日常活动，但经常需要他人提醒。`,

  // 示例2：功能独立性良好
  `儿童功能独立性良好，能独立完成大部分日常活动和认知任务，但在某些较为复杂的项目上可能需要一些轻微协助或提示。

   在进食方面，能独立进食各种食物，包括使用餐具。梳洗修饰时能独立完成大部分动作，但在准备用品方面需要较小协助。
   洗澡时能独立完成大部分动作，仅需偶尔提醒。穿衣方面，能独立穿上大部分衣服，但在扣较难的扣子时需要帮助。

   在括约肌控制方面，白天能自主控制，偶尔晚上尿床。能表达排尿需求但有时来不及。

   在转移方面，床椅转移基本独立，仅需轻扶。轮椅转移能完成大部分动作。

   在认知功能方面，能理解大部分日常语言指令，但对于非常复杂的信息理解稍有困难。
   能表达大部分想法和需求，语言表达基本流畅。社会交往能力良好，能主动与他人互动。`,

  // 示例3：功能独立性较弱
  `儿童功能独立性较弱，在日常生活活动和认知功能方面存在明显的功能障碍，需要较多的协助才能完成基本任务。

   在自理能力方面，进食需要中度协助，他人需要将食物送到嘴边。梳洗修饰需要大量协助，
   洗澡完全依赖他人。穿衣需要他人完成大部分动作。如厕时需要大量协助。

   在括约肌控制方面，经常出现失禁情况，不能很好地表达需求，需要使用尿布。

   在转移方面，几乎完全依赖他人完成，自己只能配合少量简单动作。

   在行走方面，只能进行极少量的自主行走动作，大部分依赖他人抱或使用轮椅。

   在认知功能方面，只能理解基本的简单指令，对稍微复杂的内容理解困难。
   只能用简单的词语或短语表达需求，表达不够清晰。社会交往困难，很少主动参与互动。`
];

// 运行示例分析
export function runAssessmentExamples() {
  console.log('=== WeeFIM评估解析示例 ===\n');

  exampleAssessmentTexts.forEach((text, index) => {
    console.log(`\n--- 示例 ${index + 1} ---`);
    console.log('评估文本摘要:', text.substring(0, 100) + '...');

    // 解析评估文本
    const result = parseWeeFIMAssessment(text);
    console.log('\n解析结果:');
    console.log('总体水平:', result.report.summary);
    console.log('\n各领域评分:');

    // 显示各领域平均分
    Object.entries(result.report.domainScores).forEach(([domain, scores]) => {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      console.log(`  ${domain}: 平均分 ${avgScore.toFixed(1)}`);
    });

    // 显示具体项目评分
    console.log('\n具体项目评分:');
    weefimQuestions.forEach((question, index) => {
      const score = result.scores[question.id];
      const level = getScoreLevel(score);
      console.log(`  ${question.id}. ${question.title}: ${score}分 (${level})`);
    });

    console.log('\n推荐建议:');
    result.report.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });

    // 使用generateAssessmentFromRecommendations函数
    const assessmentResult = generateAssessmentFromRecommendations(text);
    console.log('\n计算结果:');
    console.log(`  总分: ${assessmentResult.total_score}`);
    console.log(`  运动功能分: ${assessmentResult.motor_score}`);
    console.log(`  认知功能分: ${assessmentResult.cognitive_score}`);
    console.log(`  功能等级: ${assessmentResult.level.level} (${assessmentResult.level.range}分)`);
  });
}

// 辅助函数：根据分数获取水平描述
function getScoreLevel(score: number): string {
  const levels = ['完全依赖', '极重度帮助', '重度帮助', '中度帮助', '监护或准备', '基本独立', '完全独立'];
  return levels[score - 1] || '未知';
}

// 测试单个评估文本
export function testSingleAssessment(assessmentText: string) {
  console.log('\n=== 单个评估测试 ===');
  console.log('评估文本:', assessmentText);

  const result = parseWeeFIMAssessment(assessmentText);
  const assessment = generateAssessmentFromRecommendations(assessmentText);

  return {
    parsedData: result,
    calculation: assessment
  };
}

// 验证评估解析的准确性
export function validateAssessmentParsing() {
  console.log('\n=== 评估解析验证 ===');

  // 创建测试用例
  const testCases = [
    {
      text: '能独立进食，完全无需协助',
      expectedScores: { 1: 7 }, // 进食应该得7分
      description: '完全独立的进食描述'
    },
    {
      text: '需要中度协助才能完成洗澡，他人帮忙清洗部分身体部位',
      expectedScores: { 3: 4 }, // 洗澡应该得4分
      description: '中度协助的洗澡描述'
    },
    {
      text: '只能理解非常简单、具体的指令，如"坐下""过来"等',
      expectedScores: { 14: 3 }, // 理解应该得3分
      description: '简单指令的理解描述'
    }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n测试用例 ${index + 1}: ${testCase.description}`);
    console.log('输入文本:', testCase.text);

    const result = parseWeeFIMAssessment(testCase.text);

    // 检查期望的分数
    Object.entries(testCase.expectedScores).forEach(([questionId, expectedScore]) => {
      const actualScore = result.scores[parseInt(questionId)];
      const match = actualScore === expectedScore ? '✓' : '✗';
      console.log(`  题目${questionId}: 期望 ${expectedScore}分, 实际 ${actualScore}分 ${match}`);
    });
  });
}

// 如果直接运行此文件，则执行示例
if (require.main === module) {
  runAssessmentExamples();
  validateAssessmentParsing();
}