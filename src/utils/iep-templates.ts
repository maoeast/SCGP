// src/utils/iep-templates.ts

// ==========================================
// 游戏训练 IEP 模板
// ==========================================

export const iepTaskMapping = {
  // ==========================================
  // 任务 ID 1, 2: 视觉辨别 (颜色/形状)
  // ==========================================
  visual_discrimination: {
    task_ids: [1, 2],
    performance: {
      high: "该生具备优异的视觉分辨能力，能够迅速且准确地识别目标的{TYPE}特征，即使在干扰项较多的情况下也能保持稳定。",
      medium: "该生能完成基础的{TYPE}辨别任务，但在视觉背景复杂时准确率有所下降，提示视觉抗干扰能力处于发展中阶段。",
      low: "该生在{TYPE}辨别上存在挑战，难以将目标从背景中分离。这可能影响其在日常生活中对物品分类整理的能力。"
    },
    behavior: {
      impulsive: "观察到较高的误报率（点击干扰项），且反应时间极短。这表明该生可能存在冲动型认知风格，建议加强抑制控制训练。",
      hesitant: "反应时间显著长于同龄水平，且伴随多次犹豫（鼠标悬停）。提示可能存在视觉搜索策略不明确或自信心不足。",
      distracted: "漏报率较高（目标出现未点击），且多发生在任务后半程，提示视觉注意力的维持时间（Span）有限。"
    },
    suggestions: [
      "在日常生活中，通过分类整理积木或衣物（按颜色/形状）来强化概念。",
      "减少桌面视觉杂乱，使用高对比度的阅读辅助工具。",
      "玩'找不同'游戏，从简单图形开始逐步增加难度。"
    ]
  },

  // ==========================================
  // 任务 ID 3: 物品配对 (语义/认知)
  // ==========================================
  visual_association: {
    task_ids: [3],
    performance: {
      high: "该生展现出良好的视觉认知与分类能力，能快速建立物品间的语义联系。",
      low: "该生在物品配对任务中表现吃力，可能在视觉闭合或物体恒常性认知上需要支持。"
    },
    suggestions: [
      "使用实物卡片进行配对练习（如：牙刷配牙膏）。",
      "在超市购物时，让孩子寻找清单上的具体物品。"
    ]
  },

  // ==========================================
  // 任务 ID 4: 视觉追踪
  // ==========================================
  visual_tracking: {
    task_ids: [4],
    performance: {
      high: "视觉平滑追踪能力极佳，眼球运动协调，能持续锁定移动目标。",
      medium: "追踪过程中出现断续或跳跃（Saccadic movements），特别是在目标转向时容易脱靶。",
      low: "难以维持对移动目标的视觉锁定，眼手协调能力有待提升。"
    },
    suggestions: [
      "玩'接球'或'吹泡泡'游戏，训练眼睛跟随物体运动。",
      "使用手电筒光斑在墙上移动，让孩子用手去拍打光斑。"
    ]
  },

  // ==========================================
  // 任务 ID 5: 声音辨别
  // ==========================================
  auditory_discrimination: {
    task_ids: [5],
    performance: {
      high: "听觉敏感度高，能精准区分细微的音高或音量变化。",
      low: "对声音特征的辨别存在困难，可能影响语音语调的理解。"
    },
    suggestions: [
      "进行'听声辨位'或'猜乐器'的游戏。",
      "模仿不同的环境声音（如动物叫声、车辆声）。"
    ]
  },

  // ==========================================
  // 任务 ID 6: 听指令做动作 (视听统合)
  // ==========================================
  auditory_integration: {
    task_ids: [6],
    performance: {
      high: "展现出卓越的视听统合能力，能精准理解语音指令并转化为视觉搜索行动。",
      medium: "能理解单一步骤指令，但在指令变长或包含多个属性（如'红色的、圆形的'）时容易出错，提示听觉工作记忆容量有限。",
      low: "难以建立语音指令与视觉符号的对应关系，需要辅助手势或视觉提示。"
    },
    suggestions: [
      "从'一步指令'（拿苹果）过渡到'两步指令'（拿苹果，然后给妈妈）。",
      "玩'老师说'（Simon Says）游戏，训练听觉专注与抑制控制。"
    ]
  },

  // ==========================================
  // 任务 ID 7: 节奏模仿
  // ==========================================
  auditory_sequencing: {
    task_ids: [7],
    performance: {
      high: "具备良好的节奏感和时间知觉（Temporal Processing），能精准复现听到的声音序列。",
      low: "难以捕捉或复现节奏模式，可能影响说话的流畅度或动作协调性。"
    },
    suggestions: [
      "配合音乐节拍拍手或踏步。",
      "使用简单的打击乐器模仿'长-短-长'的节奏型。"
    ]
  }
}

// ==========================================
// 器材训练 IEP 模板
// ==========================================

/**
 * 游戏训练任务类型（用于模板查找）
 */
export type GameTaskType =
  | 'visual_discrimination'
  | 'visual_association'
  | 'visual_tracking'
  | 'auditory_discrimination'
  | 'auditory_integration'
  | 'auditory_sequencing'

/**
 * 游戏训练模板接口
 */
export interface GameIEPTemplate {
  task_ids: number[]
  performance: {
    high?: string
    medium?: string
    low: string
  }
  behavior?: {
    impulsive?: string
    hesitant?: string
    distracted?: string
  }
  suggestions: string[]
}

/**
 * 器材训练评语模板接口
 */
export interface EquipmentIEPTemplate {
  domainName: string
  performance: {
    high: string
    medium: string
    low: string
  }
  actionDescriptions: Record<string, string>
  suggestions: string[]
}

/**
 * 器材训练评语模板映射
 * 包含7大感官系统的评语模板
 */
export const equipmentTaskMapping: Record<string, EquipmentIEPTemplate> = {
  // 触觉系统套装
  tactile: {
    domainName: "触觉系统",
    performance: {
      high: "{name}在【{domain}】训练中展现出极佳的适应性。通过使用【{equipment}】，学生能够{action}，展现了稳定的{outcome}能力，整体参与度高。",
      medium: "{name}在【{domain}】领域的互动表现稳步提升。在练习【{equipment}】过程中，学生{action}，初步掌握了{outcome}的相关技巧，表现出一定的进步潜力。",
      low: "{name}在【{domain}】训练中需要较多支持。在操作【{equipment}】时，学生{action}。对{outcome}的感知尚处于起步阶段，建议通过更低强度的刺激进行诱导。"
    },
    actionDescriptions: {
      "1": "独立完成操作",
      "2": "在口头提示下完成任务",
      "3": "在视觉提示辅助下进行",
      "4": "在手触引导下尝试操作",
      "5": "在身体辅助下完成训练"
    },
    suggestions: [
      "日常生活中增加不同材质（毛绒、沙子、水）的接触机会。",
      "结合深压觉活动（如挤压、重力毯）帮助稳定情绪。",
      "在洗澡或穿衣时引入刷洗或按摩，促进触觉脱敏。"
    ]
  },

  // 嗅觉系统套装
  olfactory: {
    domainName: "嗅觉系统",
    performance: {
      high: "{name}在【{domain}】训练中展现出极佳的适应性。通过使用【{equipment}】，学生能够{action}，展现了稳定的{outcome}能力，整体参与度高。",
      medium: "{name}在【{domain}】领域的互动表现稳步提升。在练习【{equipment}】过程中，学生{action}，初步掌握了{outcome}的相关技巧，表现出一定的进步潜力。",
      low: "{name}在【{domain}】训练中需要较多支持。在操作【{equipment}】时，学生{action}。对{outcome}的感知尚处于起步阶段，建议通过更低强度的刺激进行诱导。"
    },
    actionDescriptions: {
      "1": "独立完成操作",
      "2": "在口头提示下完成任务",
      "3": "在视觉提示辅助下进行",
      "4": "在手触引导下尝试操作",
      "5": "在身体辅助下完成训练"
    },
    suggestions: [
      "利用自然气味（如橙皮、薄荷）进行环境熏陶。",
      "在进食前引导学生嗅闻食物气味，建立感官联结。",
      "通过'气味捉迷藏'游戏提升嗅觉辨识力。"
    ]
  },

  // 视觉系统套装
  visual: {
    domainName: "视觉系统",
    performance: {
      high: "{name}在【{domain}】训练中展现出极佳的适应性。通过使用【{equipment}】，学生能够{action}，展现了稳定的{outcome}能力，整体参与度高。",
      medium: "{name}在【{domain}】领域的互动表现稳步提升。在练习【{equipment}】过程中，学生{action}，初步掌握了{outcome}的相关技巧，表现出一定的进步潜力。",
      low: "{name}在【{domain}】训练中需要较多支持。在操作【{equipment}】时，学生{action}。对{outcome}的感知尚处于起步阶段，建议通过更低强度的刺激进行诱导。"
    },
    actionDescriptions: {
      "1": "独立完成操作",
      "2": "在口头提示下完成任务",
      "3": "在视觉提示辅助下进行",
      "4": "在手触引导下尝试操作",
      "5": "在身体辅助下完成训练"
    },
    suggestions: [
      "保持环境光线适中，减少视觉杂乱信号干扰。",
      "使用高对比度图片或动态光源引导注视。",
      "增加视觉追踪游戏，如吹泡泡、追踪手电筒光点。"
    ]
  },

  // 听觉系统套装
  auditory: {
    domainName: "听觉系统",
    performance: {
      high: "{name}在【{domain}】训练中展现出极佳的适应性。通过使用【{equipment}】，学生能够{action}，展现了稳定的{outcome}能力，整体参与度高。",
      medium: "{name}在【{domain}】领域的互动表现稳步提升。在练习【{equipment}】过程中，学生{action}，初步掌握了{outcome}的相关技巧，表现出一定的进步潜力。",
      low: "{name}在【{domain}】训练中需要较多支持。在操作【{equipment}】时，学生{action}。对{outcome}的感知尚处于起步阶段，建议通过更低强度的刺激进行诱导。"
    },
    actionDescriptions: {
      "1": "独立完成操作",
      "2": "在口头提示下完成任务",
      "3": "在视觉提示辅助下进行",
      "4": "在手触引导下尝试操作",
      "5": "在身体辅助下完成训练"
    },
    suggestions: [
      "减少背景噪音，为听觉训练提供安静环境。",
      "结合音乐律动，训练学生对节奏和音调的感知。",
      "使用听力反馈设备（如变声器）增加发声动机。"
    ]
  },

  // 味觉系统套装
  gustatory: {
    domainName: "味觉系统",
    performance: {
      high: "{name}在【{domain}】训练中展现出极佳的适应性。通过使用【{equipment}】，学生能够{action}，展现了稳定的{outcome}能力，整体参与度高。",
      medium: "{name}在【{domain}】领域的互动表现稳步提升。在练习【{equipment}】过程中，学生{action}，初步掌握了{outcome}的相关技巧，表现出一定的进步潜力。",
      low: "{name}在【{domain}】训练中需要较多支持。在操作【{equipment}】时，学生{action}。对{outcome}的感知尚处于起步阶段，建议通过更低强度的刺激进行诱导。"
    },
    actionDescriptions: {
      "1": "独立完成操作",
      "2": "在口头提示下完成任务",
      "3": "在视觉提示辅助下进行",
      "4": "在手触引导下尝试操作",
      "5": "在身体辅助下完成训练"
    },
    suggestions: [
      "循序渐进尝试不同酸甜度的天然果汁。",
      "结合语言描述，帮助学生建立'酸、甜、苦、咸'的认知。",
      "在安全范围内鼓励自主进食，降低味觉防御。"
    ]
  },

  // 本体觉系统套装
  proprioceptive: {
    domainName: "本体觉系统",
    performance: {
      high: "{name}在【{domain}】训练中展现出极佳的适应性。通过使用【{equipment}】，学生能够{action}，展现了稳定的{outcome}能力，整体参与度高。",
      medium: "{name}在【{domain}】领域的互动表现稳步提升。在练习【{equipment}】过程中，学生{action}，初步掌握了{outcome}的相关技巧，表现出一定的进步潜力。",
      low: "{name}在【{domain}】训练中需要较多支持。在操作【{equipment}】时，学生{action}。对{outcome}的感知尚处于起步阶段，建议通过更低强度的刺激进行诱导。"
    },
    actionDescriptions: {
      "1": "独立完成操作",
      "2": "在口头提示下完成任务",
      "3": "在视觉提示辅助下进行",
      "4": "在手触引导下尝试操作",
      "5": "在身体辅助下完成训练"
    },
    suggestions: [
      "增加攀爬、推拉等大肌肉活动，增强身体位置感。",
      "利用负重背心或重力玩偶提供稳定的本体觉输入。",
      "开展平衡训练，如走平衡木、跳羊角球。"
    ]
  },

  // 感官综合箱套装 (JSON中使用 "multisensory"，这里映射到 "integration")
  multisensory: {
    domainName: "感官综合箱",
    performance: {
      high: "{name}在【{domain}】训练中展现出极佳的适应性。通过使用【{equipment}】，学生能够{action}，展现了稳定的{outcome}能力，整体参与度高。",
      medium: "{name}在【{domain}】领域的互动表现稳步提升。在练习【{equipment}】过程中，学生{action}，初步掌握了{outcome}的相关技巧，表现出一定的进步潜力。",
      low: "{name}在【{domain}】训练中需要较多支持。在操作【{equipment}】时，学生{action}。对{outcome}的感知尚处于起步阶段，建议通过更低强度的刺激进行诱导。"
    },
    actionDescriptions: {
      "1": "独立完成操作",
      "2": "在口头提示下完成任务",
      "3": "在视觉提示辅助下进行",
      "4": "在手触引导下尝试操作",
      "5": "在身体辅助下完成训练"
    },
    suggestions: [
      "在多感官室内进行结构化教学，整合视听触反馈。",
      "利用因果关系玩具，建立动作与感官结果的联系。",
      "保持训练节奏缓慢、有序，避免感官过载。"
    ]
  }
}

// ==========================================
// 器材训练 IEP 评语生成函数
// ==========================================

// 需要延迟导入，因为 types 文件可能循环依赖
// 这些函数在 iep-generator.ts 中使用

/**
 * 分类映射：处理 JSON 中的 "multisensory" 与代码中的 "integration" 差异
 */
const CATEGORY_KEY_MAP: Record<string, string> = {
  integration: 'multisensory'
}

/**
 * 获取模板的 key（处理分类名称映射）
 * @param category 器材分类
 * @returns 模板映射中的 key
 */
export function getEquipmentTemplateKey(category: string): string {
  return CATEGORY_KEY_MAP[category] || category
}

/**
 * 生成器材训练 IEP 评语
 * @param studentName 学生姓名
 * @param equipmentName 器材名称
 * @param domainName 领域名称（从 template.domainName）
 * @param category 器材分类（用于查找模板）
 * @param score 评分 (1-5)
 * @param promptLevel 辅助等级 (1-5)
 * @param abilityTags 能力标签数组
 * @returns 生成的评语文本
 */
export function generateEquipmentIEPComment(
  studentName: string,
  equipmentName: string,
  domainName: string,
  category: string,
  score: number,
  promptLevel: number,
  abilityTags: string[]
): string {
  const templateKey = getEquipmentTemplateKey(category)
  const template = equipmentTaskMapping[templateKey]

  if (!template) {
    console.warn(`未找到 ${category} 分类的评语模板`)
    return `${studentName}在【${domainName}】训练中完成了【${equipmentName}】的练习。`
  }

  // 确定表现等级
  const level = score >= 4 ? 'high' : score >= 3 ? 'medium' : 'low'

  // 获取动作描述（处理字符串键 "1", "2", ... 转换为数字）
  const actionDescription = template.actionDescriptions[String(promptLevel)] || template.actionDescriptions['1']

  // 器材训练专用占位符替换逻辑
  let comment = template.performance[level]
    .replace(/{name}/g, studentName)
    .replace(/{domain}/g, domainName)
    .replace(/{equipment}/g, equipmentName)
    .replace(/{action}/g, actionDescription)
    .replace(/{outcome}/g, abilityTags.join('、'))

  return comment
}

/**
 * 获取训练建议
 * @param category 器材分类
 * @param score 评分 (1-5)
 * @returns 建议列表
 */
export function getEquipmentSuggestions(
  category: string,
  score: number
): string[] {
  const templateKey = getEquipmentTemplateKey(category)
  const template = equipmentTaskMapping[templateKey]

  if (!template) {
    console.warn(`未找到 ${category} 分类的评语模板`)
    return []
  }

  // 表现良好时，返回简化建议；表现不佳时返回详细建议
  if (score >= 4) {
    return template.suggestions.slice(0, 2)
  }
  return template.suggestions
}

/**
 * 获取分类的领域名称
 * @param category 器材分类
 * @returns 领域名称（中文）
 */
export function getEquipmentDomainName(category: string): string {
  const templateKey = getEquipmentTemplateKey(category)
  const template = equipmentTaskMapping[templateKey]
  return template?.domainName || category
}

// ==========================================
// 类型定义导出
// ==========================================

export type GameTaskMapping = typeof iepTaskMapping
export type EquipmentTaskMapping = typeof equipmentTaskMapping
