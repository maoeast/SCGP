/**
 * SIC-ADS 2.0 迁移测试数据生成器
 *
 * Phase 1.5: 数据迁移验证
 *
 * 功能：
 * 1. 生成测试用的器材数据
 * 2. 包含边界情况：空标签、重复标签、特殊字符等
 * 3. 支持双写验证测试
 *
 * @module migration-test-data
 */

// ============ 类型定义 ============

interface TestEquipmentData {
  category: string
  sub_category: string
  name: string
  description: string
  ability_tags: string[]
  image_url: string
  is_active: number
}

interface TestScenario {
  name: string
  description: string
  data: TestEquipmentData[]
}

// ============ 测试场景 ============

/**
 * 场景 1: 正常数据
 */
export const normalScenario: TestScenario = {
  name: '正常数据',
  description: '标准的器材数据，包含完整的标签和描述',
  data: [
    {
      category: '触觉',
      sub_category: '触觉辨别',
      name: '触觉球测试仪',
      description: '用于测试触觉辨别能力的器材',
      ability_tags: ['触觉', '触觉辨别', '手眼协调'],
      image_url: '/images/tactile-ball.jpg',
      is_active: 1
    },
    {
      category: '前庭觉',
      sub_category: '前庭觉平衡',
      name: '平衡木',
      description: '用于训练前庭觉平衡能力',
      ability_tags: ['前庭觉', '平衡能力', '核心稳定'],
      image_url: '/images/balance-beam.jpg',
      is_active: 1
    },
    {
      category: '本体觉',
      sub_category: '本体觉控制',
      name: '阻力带训练套件',
      description: '用于本体觉控制的阻力训练',
      ability_tags: ['本体觉', '肌肉控制', '力量训练'],
      image_url: '/images/resistance-band.jpg',
      is_active: 1
    }
  ]
}

/**
 * 场景 2: 空标签
 */
export const emptyTagsScenario: TestScenario = {
  name: '空标签',
  description: 'ability_tags 为空数组或 null 的边界情况',
  data: [
    {
      category: '视觉',
      sub_category: '视觉追踪',
      name: '视觉追踪板（无标签）',
      description: '用于测试空标签边界情况',
      ability_tags: [],
      image_url: '/images/visual-tracking.jpg',
      is_active: 1
    },
    {
      category: '听觉',
      sub_category: '听觉辨别',
      name: '听觉辨别仪（无标签）',
      description: '用于测试 null 标签边界情况',
      ability_tags: [] as any, // 模拟空数组
      image_url: '/images/auditory-discrimination.jpg',
      is_active: 1
    }
  ]
}

/**
 * 场景 3: 重复标签
 */
export const duplicateTagsScenario: TestScenario = {
  name: '重复标签',
  description: 'ability_tags 中包含重复标签的情况',
  data: [
    {
      category: '触觉',
      sub_category: '触觉调节',
      name: '触觉刷（重复标签）',
      description: '用于测试重复标签处理',
      ability_tags: ['触觉', '触觉', '触觉调节', '触觉调节'],
      image_url: '/images/tactile-brush.jpg',
      is_active: 1
    }
  ]
}

/**
 * 场景 4: 特殊字符
 */
export const specialCharsScenario: TestScenario = {
  name: '特殊字符',
  description: '名称和描述中包含特殊字符的情况',
  data: [
    {
      category: '综合',
      sub_category: '多感官',
      name: '感官综合训练套装 <测试>',
      description: '包含特殊字符：\' " < > & \\n \\t',
      ability_tags: ['综合能力', '多感官', '感觉统合'],
      image_url: '/images/multi-sensory-kit.jpg',
      is_active: 1
    },
    {
      category: '嗅觉',
      sub_category: '嗅觉辨别',
      name: '嗅觉测试瓶 \'测试\'',
      description: '包含引号和特殊符号',
      ability_tags: ['嗅觉', '嗅觉辨别', '感官训练'],
      image_url: '/images/olfactory-bottle.jpg',
      is_active: 1
    }
  ]
}

/**
 * 场景 5: 超长标签
 */
export const longTagsScenario: TestScenario = {
  name: '超长标签',
  description: 'ability_tags 包含超长标签名称的情况',
  data: [
    {
      category: '认知',
      sub_category: '认知训练',
      name: '认知训练卡片',
      description: '用于测试超长标签处理',
      ability_tags: [
        '认知',
        '这是一个非常非常非常长的标签名称用于测试数据库字段长度限制',
        '记忆力',
        '注意力',
        '这是一个标签'
      ],
      image_url: '/images/cognitive-cards.jpg',
      is_active: 1
    }
  ]
}

/**
 * 场景 6: 大量标签
 */
export const manyTagsScenario: TestScenario = {
  name: '大量标签',
  description: '单个器材包含大量标签的情况',
  data: [
    {
      category: '综合',
      sub_category: '综合训练',
      name: '综合训练器材包',
      description: '包含所有能力维度的综合训练器材',
      ability_tags: [
        '触觉', '前庭觉', '本体觉', '视觉', '听觉', '嗅觉', '味觉',
        '手眼协调', '身体协调', '平衡能力', '核心稳定', '肌肉控制',
        '注意力', '记忆力', '认知能力', '感觉统合', '感官调节',
        '精细动作', '大运动', '双侧协调', '空间感知', '时间感知'
      ],
      image_url: '/images/comprehensive-kit.jpg',
      is_active: 1
    }
  ]
}

/**
 * 场景 7: 非活跃数据
 */
export const inactiveScenario: TestScenario = {
  name: '非活跃数据',
  description: 'is_active = 0 的非活跃器材数据',
  data: [
    {
      category: '触觉',
      sub_category: '触觉辨别',
      name: '已停产的触觉球',
      description: '用于测试非活跃数据过滤',
      ability_tags: ['触觉', '触觉辨别'],
      image_url: '/images/discontinued-tactile.jpg',
      is_active: 0
    }
  ]
}

/**
 * 场景 8: 完整测试集
 */
export const fullTestScenario: TestScenario = {
  name: '完整测试集',
  description: '包含所有边界情况的完整测试数据集',
  data: [
    ...normalScenario.data,
    ...emptyTagsScenario.data,
    ...duplicateTagsScenario.data,
    ...specialCharsScenario.data,
    ...longTagsScenario.data,
    ...manyTagsScenario.data,
    ...inactiveScenario.data
  ]
}

// ============ 数据生成函数 ============

/**
 * 生成测试数据 SQL 插入语句
 */
export function generateTestInsertSQL(scenario: TestScenario): string[] {
  const statements: string[] = []

  for (const item of scenario.data) {
    const tagsJson = JSON.stringify(item.ability_tags)
    const sql = `
      INSERT INTO equipment_catalog (category, sub_category, name, description, ability_tags, image_url, is_active)
      VALUES (
        '${item.category}',
        '${item.sub_category.replace(/'/g, "''")}',
        '${item.name.replace(/'/g, "''")}',
        '${item.description.replace(/'/g, "''")}',
        '${tagsJson.replace(/'/g, "''")}',
        '${item.image_url}',
        ${item.is_active}
      );
    `
    statements.push(sql)
  }

  return statements
}

/**
 * 生成完整的测试数据脚本
 */
export function generateTestScript(scenario: TestScenario = fullTestScenario): string {
  let script = `-- ============================================
-- SIC-ADS 2.0 迁移测试数据脚本
-- ============================================
-- 测试场景: ${scenario.name}
-- 描述: ${scenario.description}
-- 记录数: ${scenario.data.length}
-- ============================================

-- 开始事务
BEGIN;

-- 清理现有测试数据（可选）
-- DELETE FROM equipment_catalog WHERE name LIKE '%测试%' OR name LIKE '%(无标签)%' OR name LIKE '%(重复标签)%';

-- 插入测试数据
`

  const statements = generateTestInsertSQL(scenario)
  script += statements.join('\n')

  script += `
-- 提交事务
COMMIT;

-- 验证插入结果
SELECT '测试数据插入完成' as message;
SELECT COUNT(*) as inserted_count FROM equipment_catalog;
`

  return script
}

/**
 * 清理测试数据
 */
export function generateCleanupSQL(): string {
  return `-- ============================================
-- SIC-ADS 2.0 测试数据清理脚本
-- ============================================

BEGIN;

-- 清理测试生成的器材数据
DELETE FROM equipment_catalog
WHERE name LIKE '%测试%'
   OR name LIKE '%(无标签)%'
   OR name LIKE '%(重复标签)%'
   OR name LIKE '%(特殊字符)%'
   OR name LIKE '%(超长标签)%'
   OR name LIKE '%(大量标签)%'
   OR name LIKE '%已停产%';

-- 清理迁移的资源数据
DELETE FROM sys_training_resource
WHERE legacy_source = 'equipment_catalog'
AND legacy_id IN (
  SELECT id FROM equipment_catalog
  WHERE name LIKE '%测试%'
);

COMMIT;

SELECT '测试数据已清理' as message;
`
}

// ============ 导出所有场景 ============

export const testScenarios = {
  normal: normalScenario,
  emptyTags: emptyTagsScenario,
  duplicateTags: duplicateTagsScenario,
  specialChars: specialCharsScenario,
  longTags: longTagsScenario,
  manyTags: manyTagsScenario,
  inactive: inactiveScenario,
  full: fullTestScenario
}

export type TestScenarioName = keyof typeof testScenarios

/**
 * 获取指定测试场景
 */
export function getTestScenario(name: TestScenarioName): TestScenario {
  return testScenarios[name]
}

/**
 * 获取所有测试场景名称
 */
export function getTestScenarioNames(): TestScenarioName[] {
  return Object.keys(testScenarios) as TestScenarioName[]
}
