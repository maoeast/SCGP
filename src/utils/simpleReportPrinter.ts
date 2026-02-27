/**
 * 简化的报告打印工具
 * 生成纯HTML格式的报告，不依赖复杂组件
 */

interface ReportData {
  student: {
    name: string;
    gender: string;
    age: number;
  };
  assessment: {
    date: string;
    type: 'sm' | 'weefim';
    data: any;
  };
}

export class SimpleReportPrinter {
  /**
   * 生成S-M报告的简化HTML
   */
  static generateSMReportHTML(data: ReportData): string {
    const { student, assessment } = data
    const reportData = assessment.data

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>S-M量表评估报告</title>
  <style>
    @page {
      size: A4;
      margin: 1.5cm;
    }

    body {
      font-family: "Microsoft YaHei", Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }

    .header {
      text-align: center;
      margin-bottom: 20pt;
    }

    .header h1 {
      font-size: 18pt;
      margin: 0;
    }

    .header p {
      font-size: 12pt;
      color: #666;
      margin: 5pt 0 0 0;
    }

    .section {
      margin-bottom: 20pt;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 10pt;
      color: #303133;
      border-bottom: 1pt solid #dcdfe6;
      padding-bottom: 5pt;
    }

    .info-row {
      margin: 5pt 0;
    }

    .info-label {
      font-weight: bold;
      display: inline-block;
      width: 60pt;
    }

    .score-grid {
      display: table;
      width: 100%;
      margin: 10pt 0;
    }

    .score-item {
      display: table-cell;
      width: 33%;
      text-align: center;
      padding: 5pt;
    }

    .score-value {
      font-size: 16pt;
      font-weight: bold;
      color: #409eff;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
    }

    .table th,
    .table td {
      border: 1pt solid #dcdfe6;
      padding: 5pt 8pt;
      text-align: left;
    }

    .table th {
      background: #f5f7fa;
      font-weight: bold;
    }

    .progress-bar {
      display: inline-block;
      width: 100pt;
      height: 10pt;
      background: #e4e7ed;
      position: relative;
      vertical-align: middle;
    }

    .progress-fill {
      height: 100%;
      background: #409eff;
    }

    .suggestion-list {
      margin: 10pt 0;
      padding-left: 20pt;
    }

    .suggestion-list li {
      margin-bottom: 5pt;
    }

    .signature {
      margin-top: 40pt;
      padding-top: 20pt;
      border-top: 2pt solid #dcdfe6;
      page-break-inside: avoid;
    }

    .signature-row {
      display: table;
      width: 100%;
    }

    .signature-cell {
      display: table-cell;
      width: 33%;
      text-align: center;
      padding: 10pt 0;
    }

    .signature-line {
      height: 1pt;
      background: #303133;
      margin-bottom: 5pt;
    }

    .radar-placeholder {
      width: 300pt;
      height: 200pt;
      margin: 20pt auto;
      border: 1pt dashed #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>婴儿-初中生社会生活能力量表评估报告</h1>
    <p>S-M量表</p>
  </div>

  <div class="section">
    <div class="section-title">学生基本信息</div>
    <div class="info-row">
      <span class="info-label">姓名：</span>
      <span>${student.name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">性别：</span>
      <span>${student.gender}</span>
    </div>
    <div class="info-row">
      <span class="info-label">年龄：</span>
      <span>${student.age}岁</span>
    </div>
    <div class="info-row">
      <span class="info-label">评估日期：</span>
      <span>${assessment.date}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">评估结果</div>
    <div class="score-grid">
      <div class="score-item">
        <div class="score-label">粗分</div>
        <div class="score-value">${reportData.raw_score || 0}</div>
      </div>
      <div class="score-item">
        <div class="score-label">标准分</div>
        <div class="score-value">${reportData.sq_score || 0}</div>
      </div>
      <div class="score-item">
        <div class="score-label">评定等级</div>
        <div class="score-value">${this.getSMLevelText(reportData.level)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">各维度得分</div>
    ${this.generateSMDimensionsTable(reportData)}
  </div>

  <div class="section">
    <div class="section-title">训练建议</div>
    <ul class="suggestion-list">
      ${this.generateSMSuggestions(reportData.level)}
    </ul>
  </div>

  <div class="signature">
    <div class="signature-row">
      <div class="signature-cell">
        <div class="signature-line"></div>
        <div>评估师签名</div>
      </div>
      <div class="signature-cell">
        <div class="signature-line"></div>
        <div>日期</div>
      </div>
      <div class="signature-cell">
        <div class="signature-line"></div>
        <div>机构盖章</div>
      </div>
    </div>
  </div>
</body>
</html>`
  }

  /**
   * 生成WeeFIM报告的简化HTML
   */
  static generateWeeFIMReportHTML(data: ReportData): string {
    const { student, assessment } = data
    const reportData = assessment.data

    // 获取等级信息
    let levelText = '';
    let levelDesc = '';
    let levelDetail = '';
    let suggestions: string[] = [];

    if (typeof reportData.level?.level === 'string') {
      // 如果是字符串，使用功能水平映射
      const functionalLevel = this.getFunctionalLevel(reportData.level.level);
      if (functionalLevel) {
        levelText = functionalLevel.text;
        levelDesc = `${functionalLevel.range} - ${functionalLevel.description}`;
        levelDetail = functionalLevel.detail;
        suggestions = functionalLevel.suggestions;
      }
    } else {
      // 兼容数字格式
      levelText = this.getWeeFIMLevelText(reportData.level?.level);
      levelDesc = this.getWeeFIMLevelDescription(reportData.level?.level);
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>改良儿童功能独立性评估量表报告</title>
  <style>
    @page {
      size: A4;
      margin: 1.5cm;
    }

    body {
      font-family: "Microsoft YaHei", Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }

    .header {
      text-align: center;
      margin-bottom: 30pt;
    }

    .header h1 {
      font-size: 20pt;
      margin: 0;
      font-weight: bold;
    }

    .header p {
      font-size: 14pt;
      color: #666;
      margin: 5pt 0 0 0;
    }

    .divider {
      border: none;
      border-top: 2pt solid #303133;
      margin: 20pt 0;
    }

    .section {
      margin-bottom: 25pt;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 15pt;
      color: #303133;
    }

    .subsection-title {
      font-size: 14pt;
      font-weight: bold;
      margin: 15pt 0 10pt 0;
      color: #606266;
    }

    .info-grid {
      display: table;
      width: 100%;
      margin: 10pt 0;
    }

    .info-row {
      display: table-row;
    }

    .info-cell {
      display: table-cell;
      padding: 5pt 20pt 5pt 0;
    }

    .info-label {
      font-weight: bold;
      display: inline-block;
      min-width: 80pt;
    }

    .score-highlight {
      font-size: 16pt;
      font-weight: bold;
      color: #409eff;
      margin: 0 5pt;
    }

    .level-badge {
      display: inline-block;
      padding: 5pt 15pt;
      background: #67c23a;
      color: white;
      font-weight: bold;
      border-radius: 15pt;
      margin: 5pt 0;
    }

    .detail-table {
      width: 100%;
      margin: 10pt 0;
      border-collapse: collapse;
    }

    .detail-table th,
    .detail-table td {
      border: 1pt solid #dcdfe6;
      padding: 8pt 10pt;
      text-align: left;
      vertical-align: top;
    }

    .detail-table th {
      background: #f5f7fa;
      font-weight: bold;
      white-space: nowrap;
    }

    .detail-table td.score {
      text-align: center;
      font-weight: bold;
    }

    .category-items {
      padding-left: 0;
      list-style: none;
    }

    .category-items li {
      margin: 5pt 0;
      padding-left: 20pt;
      position: relative;
    }

    .category-items li:before {
      content: "-";
      position: absolute;
      left: 0;
    }

    .suggestion-list {
      margin: 10pt 0;
      padding-left: 20pt;
    }

    .suggestion-list li {
      margin-bottom: 8pt;
    }

    .signature {
      margin-top: 50pt;
      padding-top: 30pt;
      border-top: 2pt solid #dcdfe6;
      page-break-inside: avoid;
    }

    .signature-row {
      display: table;
      width: 100%;
    }

    .signature-cell {
      display: table-cell;
      width: 33%;
      text-align: center;
      padding: 10pt 0;
    }

    .signature-line {
      height: 1pt;
      background: #303133;
      margin-bottom: 10pt;
    }

    .footer {
      text-align: center;
      margin-top: 20pt;
      color: #909399;
      font-size: 10pt;
    }

    /* 强制文本不换行 */
    .nowrap {
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>改良儿童功能独立性评估量表报告</h1>
    <p>WeeFIM量表</p>
  </div>

  <div class="section">
    <div class="section-title">一、基本信息</div>
    <hr class="divider">
    <div class="info-grid">
      <div class="info-row">
        <div class="info-cell">
          <span class="info-label">姓名：</span>
          <span>${student.name}</span>
        </div>
        <div class="info-cell">
          <span class="info-label">性别：</span>
          <span>${student.gender}</span>
        </div>
      </div>
      <div class="info-row">
        <div class="info-cell">
          <span class="info-label">年龄：</span>
          <span>${student.age}岁</span>
        </div>
        <div class="info-cell">
          <span class="info-label">评估日期：</span>
          <span>${assessment.date}</span>
        </div>
      </div>
      <div class="info-row">
        <div class="info-cell">
          <span class="info-label">评估编号：</span>
          <span>${reportData.assessId || assessment.id || 'N/A'}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">二、评估结果总览</div>
    <hr class="divider">
    <div class="info-grid">
      <div class="info-row">
        <div class="info-cell">
          <span class="info-label">总得分：</span>
          <span class="score-highlight">${reportData.total_score || 0}/126</span>
        </div>
        <div class="info-cell">
          <span class="info-label">运动功能得分：</span>
          <span class="score-highlight">${reportData.motor_score || 0}/91</span>
        </div>
      </div>
      <div class="info-row">
        <div class="info-cell">
          <span class="info-label">认知功能得分：</span>
          <span class="score-highlight">${reportData.cognitive_score || 0}/35</span>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">三、独立性等级评定</div>
    <hr class="divider">
    <div class="subsection-title">功能独立性水平：${levelText}</div>
    <div style="margin: 10pt 0;">
      <strong>分数范围：</strong>${levelDesc}
    </div>
    <div style="margin: 10pt 0;">
      <strong>等级说明：</strong><br>
      ${levelDetail}
    </div>
  </div>

  <div class="section">
    <div class="section-title">四、各领域得分详情</div>
    <hr class="divider">
    <table class="detail-table">
      <tr>
        <th width="150">评估领域</th>
        <th width="120">得分</th>
        <th>详细项目</th>
      </tr>
      ${this.generateWeeFIMCategoriesDetails(reportData)}
    </table>
  </div>

  <div class="section">
    <div class="section-title">五、康复建议</div>
    <hr class="divider">
    ${suggestions.length > 0 ? `
      <div class="subsection-title">基于当前功能水平的专业建议：</div>
      <ul class="suggestion-list">
        ${suggestions.map(item => `<li>${item}</li>`).join('')}
      </ul>
    ` : ''}

    <div class="subsection-title">1. 短期目标（1-3个月）：</div>
    <ul class="suggestion-list">
      <li>提高日常生活活动的独立性</li>
      <li>改善转移和行走能力</li>
      <li>增强交流和认知能力</li>
      <li>提升社会参与度</li>
    </ul>

    <div class="subsection-title">2. 长期目标（6-12个月）：</div>
    <ul class="suggestion-list">
      <li>实现最大程度的功能独立性</li>
      <li>提高生活质量</li>
      <li>促进全面发展和学习</li>
      <li>增强社会适应能力</li>
    </ul>

    <div class="subsection-title">3. 训练建议：</div>
    <ul class="suggestion-list">
      <li>制定个性化的康复训练计划</li>
      <li>采用任务导向的训练方法</li>
      <li>结合日常生活活动进行练习</li>
      <li>使用辅助技术设备提高独立性</li>
      <li>定期评估和调整训练方案</li>
    </ul>

    <div class="subsection-title">4. 环境改造建议：</div>
    <ul class="suggestion-list">
      <li>改造家庭环境，提高安全性</li>
      <li>安装必要的辅助设施</li>
      <li>调整家具布局便于活动</li>
      <li>提供适应性工具和设备</li>
      <li>创造结构化的学习环境</li>
    </ul>
  </div>

  <div class="section">
    <div class="section-title">六、专业转介建议</div>
    <hr class="divider">
    <div>根据评估结果，建议考虑以下专业服务：</div>
    <ul class="suggestion-list">
      <li>物理治疗师：改善运动功能和转移能力</li>
      <li>作业治疗师：提高日常生活活动能力</li>
      <li>言语治疗师：改善交流和吞咽功能</li>
      <li>心理治疗师：提供心理支持和行为干预</li>
      <li>特殊教育老师：制定个性化教育计划</li>
      <li>社会工作者：提供社会资源和支持</li>
    </ul>
  </div>

  <div class="section">
    <div class="section-title">七、评估频率建议</div>
    <hr class="divider">
    <ul class="suggestion-list">
      <li>功能独立性极度弱/非常弱：每月评估1次，密切跟踪进展</li>
      <li>功能独立性较弱：每2个月评估1次</li>
      <li>功能独立性中等：每3个月评估1次</li>
      <li>功能独立性良好/极强：每6个月评估1次</li>
    </ul>
  </div>

  <div class="signature">
    <div class="signature-row">
      <div class="signature-cell">
        <div class="signature-line"></div>
        <div>评估师签名</div>
      </div>
      <div class="signature-cell">
        <div class="signature-line"></div>
        <div>日期</div>
      </div>
      <div class="signature-cell">
        <div class="signature-line"></div>
        <div>机构盖章</div>
      </div>
    </div>
  </div>

  <div class="footer">
    报告生成日期：${new Date().toLocaleDateString()}<br>
    本报告基于改良儿童功能独立性量表（WeeFIM）评估结果生成
  </div>
</body>
</html>`
  }

  private static getSMLevelText(level: string): string {
    const levelMap: Record<string, string> = {
      'extremely_severe': '极重度',
      'severe': '重度',
      'moderate': '中度',
      'mild': '轻度',
      'borderline': '边缘',
      'normal': '正常',
      'good': '良好',
      'excellent': '优秀',
      'outstanding': '非常优秀'
    }
    return levelMap[level] || level || '正常'
  }

  private static getWeeFIMLevelText(level: number | string): string {
    const levelMap: Record<number, string> = {
      1: '完全依赖',
      2: '最大依赖',
      3: '中度依赖',
      4: '最小依赖',
      5: '监督',
      6: '基本独立',
      7: '完全独立'
    }

    // 如果是字符串（如'极强'、'良好'等），直接返回
    if (typeof level === 'string') {
      return level
    }

    return levelMap[level] || '未知'
  }

  private static getWeeFIMLevelDescription(level: number | string): string {
    const descriptions: Record<number, string> = {
      1: '需要他人完成所有任务（>25%协助）',
      2: '需要最大协助（25-50%协助）',
      3: '需要中度协助（>50%协助）',
      4: '需要最小协助（<25%协助）',
      5: '需要监督或准备',
      6: '需要辅助设备或额外时间',
      7: '完全独立，无需协助'
    }

    // 如果是字符串，返回空字符串
    if (typeof level === 'string') {
      return ''
    }

    return descriptions[level] || '未知'
  }

  private static getFunctionalLevel(level: string): any {
    const functionalLevels: Record<string, any> = {
      '极强': {
        text: '功能独立性极强',
        range: '126-108分',
        description: '儿童功能独立性极强，在日常生活活动和认知功能方面都能独立完成各种任务，与同龄人相比表现优秀。',
        detail: '所有项目都能独立完成，无需任何协助。学生表现出完全的自主性和独立性。',
        suggestions: [
          '继续鼓励儿童保持并拓展新的技能',
          '给予更多具有挑战性的任务，进一步提升能力',
          '在家庭和学校环境中，给予更多自主空间',
          '培养独立决策和解决复杂问题的能力'
        ]
      },
      '良好': {
        text: '功能独立性良好',
        range: '107-90分',
        description: '儿童功能独立性良好，能独立完成大部分日常活动和认知任务，但在某些较为复杂的项目上可能需要一些轻微协助或提示。',
        detail: '大部分项目能独立完成，个别项目需要监督或准备。学生在日常活动中表现出高度的自主性。',
        suggestions: [
          '针对薄弱环节进行有针对性的训练',
          '加强复杂衣物的穿戴练习',
          '进行更深入的沟通和问题解决训练',
          '多提供实践机会，巩固和强化已有的能力'
        ]
      },
      '中等': {
        text: '功能独立性中等',
        range: '89-72分',
        description: '儿童功能独立性中等，在日常生活和认知功能上既有一定的自主能力，又在多个方面需要不同程度的协助。',
        detail: '部分项目需要最小或中度辅助。学生能够独立完成大部分任务，但在某些复杂任务中需要协助。',
        suggestions: [
          '制定系统的康复或训练计划',
          '重点提升自我照顾、移动、沟通等关键领域能力',
          '采用循序渐进的方式，从简单任务开始，逐步增加难度',
          '家庭和学校应给予更多支持和鼓励，营造积极的学习环境'
        ]
      },
      '较弱': {
        text: '功能独立性较弱',
        range: '71-54分',
        description: '儿童功能独立性较弱，在日常生活活动和认知功能方面存在明显的功能障碍，需要较多的协助才能完成基本任务。',
        detail: '多数项目需要中度或最大辅助。学生需要持续的支持才能完成日常活动。',
        suggestions: [
          '寻求专业的康复治疗师或特殊教育教师的帮助',
          '进行全面的评估和制定个性化的干预方案',
          '注重基础技能的训练',
          '采用多种教学方法和辅助工具，提高儿童的学习效果'
        ]
      },
      '非常弱': {
        text: '功能独立性非常弱',
        range: '53-36分',
        description: '儿童功能独立性非常弱，大部分日常生活和认知任务都依赖他人完成。',
        detail: '大部分项目需要最大辅助或完全依赖。学生在大多数活动中需要大量帮助。',
        suggestions: [
          '着重关注儿童的基本需求满足，确保其生活质量',
          '积极开展康复训练，从最基础的动作和认知训练入手',
          '保持耐心，给予儿童充分的时间和积极的反馈',
          '家庭和社会应提供全方位的支持，为儿童创造舒适、安全的生活环境'
        ]
      },
      '极度弱': {
        text: '功能独立性极度弱',
        range: '35-18分',
        description: '儿童功能独立性极度弱，几乎完全依赖他人照顾。',
        detail: '所有项目都需要完全依赖他人。学生无法独立完成任何任务。',
        suggestions: [
          '保证儿童的基本生活需求外，持续进行康复训练',
          '虽然进步可能较为缓慢，但任何微小的进步都对儿童意义重大',
          '训练内容从简单的感觉刺激、被动运动等开始',
          '关注儿童的心理需求，给予足够的关爱和陪伴'
        ]
      }
    }
    return functionalLevels[level]
  }

  private static generateSMDimensionsTable(reportData: any): string {
    const dimensions = [
      { key: 'communication', name: '交往' },
      { key: 'work', name: '作业' },
      { key: 'movement', name: '运动能力' },
      { key: 'independent_life', name: '独立生活能力' },
      { key: 'self_management', name: '自我管理' },
      { key: 'group_activity', name: '集体活动' }
    ]

    const dimensionsMap: any = {
      communication: reportData.dimensions?.communication || {},
      work: reportData.dimensions?.work || {},
      movement: reportData.dimensions?.movement || {},
      independent_life: reportData.dimensions?.independent_life || {},
      self_management: reportData.dimensions?.self_management || {},
      group_activity: reportData.dimensions?.group_activity || {}
    }

    return dimensions.map(dim => `
      <tr>
        <td>${dim.name}</td>
        <td>${dimensionsMap[dim.key].pass || 0}</td>
        <td>${dimensionsMap[dim.key].total || 0}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${this.getPercentage(dimensionsMap[dim.key])}%"></div>
          </div>
        </td>
      </tr>
    `).join('')
  }

  private static getPercentage(dim: any): number {
    if (!dim || dim.total === 0) return 0
    return Math.round((dim.pass / dim.total) * 100)
  }

  private static generateSMSuggestions(level: string): string {
    const suggestions: Record<string, string[]> = {
      'extremely_severe': [
        '采用任务分解法，将复杂技能分解为简单步骤',
        '使用视觉提示和物理辅助帮助完成动作',
        '建立固定的日常生活规律'
      ],
      'severe': [
        '继续使用任务分解和视觉支持',
        '逐步减少物理辅助，增加口头提示',
        '在安全环境中练习生活技能'
      ],
      'normal': [
        '学习高级生活技能',
        '培养兴趣爱好和特长',
        '参与志愿服务，培养社会责任感'
      ]
    }

    const defaultSuggestions = [
      '保持耐心和一致性',
      '创造积极的学习环境',
      '鼓励独立完成任务'
    ]

    const levelSuggestions = suggestions[level] || defaultSuggestions
    return levelSuggestions.map(s => `<li>${s}</li>`).join('')
  }

  private static generateWeeFIMRadarText(reportData: any): string {
    // 添加调试信息
    console.log('generateWeeFIMRadarText - reportData:', reportData)
    console.log('generateWeeFIMRadarText - categories:', reportData.categories)

    const categories = [
      { name: '自我照顾', key: 'selfcare', max: 42 },
      { name: '括约肌控制', key: 'sphincter', max: 14 },
      { name: '转移', key: 'transfer', max: 21 },
      { name: '行走', key: 'locomotion', max: 14 },
      { name: '交流', key: 'communication', max: 14 },
      { name: '社会认知', key: 'social_cognition', max: 21 }
    ]

    return categories.map(cat => {
      const score = reportData.categories?.[cat.key]?.score || 0
      const percentage = Math.round((score / cat.max) * 100)

      console.log(`Category ${cat.key}: score=${score}, percentage=${percentage}%`)

      return `
        <div class="radar-item">
          <span class="radar-label">${cat.name} (${score}/${cat.max})</span>
          <div class="radar-bar">
            <div class="radar-fill" style="width: ${percentage}%"></div>
          </div>
          <span style="margin-left: 10pt; color: #666;">${percentage}%</span>
        </div>
      `
    }).join('')
  }

  private static generateWeeFIMCategoriesRows(reportData: any): string {
    const categories = [
      { key: 'selfcare', name: '自我照顾', max: 42 },
      { key: 'sphincter', name: '括约肌控制', max: 14 },
      { key: 'transfer', name: '转移', max: 21 },
      { key: 'locomotion', name: '行走', max: 14 },
      { key: 'communication', name: '交流', max: 14 },
      { key: 'social_cognition', name: '社会认知', max: 21 }
    ]

    return categories.map(cat => {
      const score = reportData.categories?.[cat.key]?.score || 0
      const percentage = Math.round((score / cat.max) * 100)

      return `
        <tr>
          <td>${cat.name}</td>
          <td>${score}</td>
          <td>${cat.max}</td>
          <td>${percentage}%</td>
        </tr>
      `
    }).join('')
  }

  private static generateWeeFIMSuggestions(reportData: any): string {
    return [
      '<li>根据评估结果，制定个性化的康复训练计划</li>',
      '<li>重点关注得分较低的领域，提供有针对性的训练</li>',
      '<li>定期评估进展情况，及时调整训练方案</li>',
      '<li>提供适当的环境改造和辅助工具支持</li>',
      '<li>与多学科团队协作，提供综合康复服务</li>'
    ].join('')
  }

  private static generateWeeFIMCategoriesDetails(reportData: any): string {
    const categories = [
      { key: 'selfcare', name: '自我照顾', max: 42, items: ['进食', '梳洗修饰', '洗澡', '穿上衣', '穿裤子', '上厕所'] },
      { key: 'sphincter', name: '括约肌控制', max: 14, items: ['排尿控制', '排便控制'] },
      { key: 'transfer', name: '转移', max: 21, items: ['床椅转移', '轮椅转移', '进出浴盆/淋浴间'] },
      { key: 'locomotion', name: '行走', max: 14, items: ['步行/上下楼梯', '使用轮椅'] },
      { key: 'communication', name: '交流', max: 14, items: ['理解', '表达'] },
      { key: 'social_cognition', name: '社会认知', max: 21, items: ['社会交往', '解决问题', '记忆'] }
    ]

    const scoreLevels: Record<number, { text: string; assistance: string }> = {
      7: { text: '完全独立', assistance: '无需协助' },
      6: { text: '基本独立', assistance: '需要辅助设备' },
      5: { text: '监督', assistance: '需要口头提示' },
      4: { text: '最小依赖', assistance: '需要最小协助' },
      3: { text: '中度依赖', assistance: '需要中度协助' },
      2: { text: '最大依赖', assistance: '需要最大协助' },
      1: { text: '完全依赖', assistance: '完全依赖' }
    }

    return categories.map(cat => {
      const score = reportData.categories?.[cat.key]?.score || 0
      const percentage = Math.round((score / cat.max) * 100)

      // 生成详细项目列表
      const itemsHtml = cat.items.map((itemName, index) => {
        // 尝试从reportData中获取具体分数
        let itemScore = 4 // 默认中等分数
        if (reportData.categories?.[cat.key]?.items?.[index]) {
          itemScore = reportData.categories[cat.key].items[index].score || 4
        }
        const level = scoreLevels[itemScore] || scoreLevels[4]
        return `<li>${itemName}：${itemScore}/7分（${level.text}）</li>`
      }).join('')

      return `
        <tr>
          <td>${cat.name}</td>
          <td class="score">${score}/${cat.max}</td>
          <td>
            <ul class="category-items">
              ${itemsHtml}
            </ul>
          </td>
        </tr>
      `
    }).join('')
  }
}

/**
 * 导出简化报告
 */
export async function exportSimpleReport(elementId: string, filename: string, type: 'sm' | 'weefim', data?: ReportData): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // 如果没有传入数据，尝试从DOM提取
      let reportData: ReportData
      if (data) {
        reportData = data
      } else {
        const reportElement = document.getElementById(elementId)
        if (!reportElement) {
          reject(new Error('找不到报告内容'))
          return
        }

        // 提取必要的数据（这里需要从实际元素中获取）
        reportData = {
          student: {
            name: document.querySelector('.info-value')?.textContent || '未知',
            gender: 'male', // 需要从实际元素获取
            age: 10 // 需要从实际元素获取
          },
          assessment: {
            date: new Date().toLocaleDateString(),
            type: type,
            data: {} // 需要从实际报告数据获取
          }
        }
      }

      // 生成简化的HTML
      const htmlContent = type === 'sm'
        ? SimpleReportPrinter.generateSMReportHTML(reportData)
        : SimpleReportPrinter.generateWeeFIMReportHTML(reportData)

      // 创建打印窗口
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        reject(new Error('无法打开打印窗口，请检查浏览器是否阻止了弹窗'))
        return
      }

      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // 自动打印
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          setTimeout(() => {
            printWindow.close()
            resolve()
          }, 1000)
        }, 500)
      }

    } catch (error) {
      reject(error)
    }
  })
}