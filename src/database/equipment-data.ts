/**
 * 器材数据初始化
 * 从 docs/感官综合发展资源功能描述.xlsx 导入的62种器材
 *
 * 图片说明：
 * - 优先使用真实图片：src/assets/images/equipment/{category}-{id}.webp
 * - 如果真实图片不存在，自动使用占位符（颜色 + 首字母）
 */

import type { EquipmentCatalog } from '@/types/equipment'
import { CATEGORY_COLORS } from '@/types/equipment'
import { getEquipmentImageUrl } from '@/assets/images/equipment/images'

/**
 * 生成颜色占位符图片 URL（后备方案）
 */
function generatePlaceholderImageUrl(category: string, name: string): string {
  const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#CCCCCC'
  const firstChar = name.charAt(0)

  // 生成 SVG Data URI（彩色背景 + 首字母）
  const svg = `
    <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" fill="${color}"/>
      <text x="64" y="80" font-size="48" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">${firstChar}</text>
    </svg>
  `.trim()

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * 获取器材图片 URL（带占位符后备）
 * 用于静态数据定义，运行时会自动尝试加载真实图片
 */
function getEquipmentImageUrlWithFallback(
  category: string,
  id: number,
  name: string
): string {
  // 返回占位符，运行时会通过 API 层动态替换为真实图片
  return generatePlaceholderImageUrl(category, name)
}

/**
 * 62种器材数据
 */
export const EQUIPMENT_DATA: Omit<EquipmentCatalog, 'id' | 'created_at'>[] = [
  // ==================== 触觉系统套装 (24种) ====================
  {
    category: 'tactile',
    sub_category: '小型触觉探索套件',
    name: '感官手环',
    description: '提供不同纹理的触觉输入，辅助学生缓解触觉防御，平复情绪。',
    ability_tags: ['触觉调节', '情绪稳定'],
    image_url: generatePlaceholderImageUrl('tactile', '感官手环'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '小型触觉探索套件',
    name: '感官石',
    description: '通过触摸辨识不同表面质地，提升手指末梢的感知力与分辨力。',
    ability_tags: ['触觉辨识', '精细触觉'],
    image_url: generatePlaceholderImageUrl('tactile', '感官石'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '小型触觉探索套件',
    name: '魔法触觉包',
    description: '通过触摸辨识物体形状，锻炼触觉记忆与描述能力。',
    ability_tags: ['触觉记忆', '形状认知'],
    image_url: generatePlaceholderImageUrl('tactile', '魔法触觉包'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '小型触觉探索套件',
    name: '《我的感官真有趣》摸一摸',
    description: '提供结构化的触觉探索活动指引，辅助建立触觉词汇与认知。',
    ability_tags: ['感官认知', '课程指引'],
    image_url: generatePlaceholderImageUrl('tactile', '《我的感官真有趣》摸一摸'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '踩踏/坐姿触觉垫',
    name: '感官垫',
    description: '结合不同动物造型与纹理，通过手摸或赤足踩踏提供丰富的触觉输入，进行触觉脱敏与辨识训练，同时锻炼身体平衡。',
    ability_tags: ['触觉脱敏', '触觉辨识', '动态平衡'],
    image_url: generatePlaceholderImageUrl('tactile', '感官垫'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '踩踏/坐姿触觉垫',
    name: '触觉垫',
    description: '提供持续的触觉输入，明确身体位置感，辅助维持坐姿专注。',
    ability_tags: ['坐姿辅助', '触觉反馈'],
    image_url: generatePlaceholderImageUrl('tactile', '触觉垫'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '深压觉安抚套件',
    name: '图像捕捉器',
    description: '通过按压针阵形成3D图像，提供丰富的触觉反馈，锻炼手指按压力度与精细控制。',
    ability_tags: ['触觉反馈', '精细控制'],
    image_url: generatePlaceholderImageUrl('tactile', '图像捕捉器'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '深压觉安抚套件',
    name: '安抚小龟',
    description: '通过重量感提供深压觉输入（Deep Pressure），帮助镇静与放松。',
    ability_tags: ['深压觉', '情绪调节'],
    image_url: generatePlaceholderImageUrl('tactile', '安抚小龟'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '深压觉安抚套件',
    name: '感官袜',
    description: '提供全身性的深层压力包裹，帮助明确身体边界，调节情绪唤醒度，建立安全感。',
    ability_tags: ['深压觉', '情绪调节', '身体概念'],
    image_url: generatePlaceholderImageUrl('tactile', '感官袜'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '深压觉安抚套件',
    name: '震动颈枕',
    description: '提供温和的震动刺激，促进颈部肌肉放松，缓解紧张焦虑。',
    ability_tags: ['震动反馈', '身体放松'],
    image_url: generatePlaceholderImageUrl('tactile', '震动颈枕'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '挤压/拉伸触觉套件',
    name: '挤压球链',
    description: '通过反复挤压动作强化指尖力量，提供本体觉反馈以调节唤醒度。',
    ability_tags: ['手指力量', '自我调节'],
    image_url: generatePlaceholderImageUrl('tactile', '挤压球链'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '挤压/拉伸触觉套件',
    name: '包子玩具',
    description: '满足抓握与揉捏需求，作为安全的情绪宣泄工具，提升手部控制。',
    ability_tags: ['情绪宣泄', '抓握力量'],
    image_url: generatePlaceholderImageUrl('tactile', '包子玩具'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '挤压/拉伸触觉套件',
    name: '七彩弹力网',
    description: '在拉伸中感知阻力变化，整合视觉与本体觉，激发手部操作兴趣。',
    ability_tags: ['双手协调', '本体感知'],
    image_url: generatePlaceholderImageUrl('tactile', '七彩弹力网'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '挤压/拉伸触觉套件',
    name: '触觉球',
    description: '提供滚动按压等丰富的触觉刺激，可用于身体按摩脱敏。',
    ability_tags: ['触觉脱敏', '身体按摩'],
    image_url: generatePlaceholderImageUrl('tactile', '触觉球'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '变形/关节活动套件',
    name: '变形机器人安拉',
    description: '通过关节扭转与连接变换形态，锻炼手腕灵活性、手指精细动作及双手协作。',
    ability_tags: ['手腕灵活', '双手协作'],
    image_url: generatePlaceholderImageUrl('tactile', '变形机器人安拉'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '变形/关节活动套件',
    name: '开花球',
    description: '观察并操作从收缩到展开的形态变化，提供视觉惊喜与操作动力。',
    ability_tags: ['视觉关注', '因果关系'],
    image_url: generatePlaceholderImageUrl('tactile', '开花球'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '变形/关节活动套件',
    name: '百变魔尺',
    description: '通过旋转拼接构建造型，锻炼手腕灵活性、空间想象力与序列规划能力。',
    ability_tags: ['空间规划', '手腕灵活'],
    image_url: generatePlaceholderImageUrl('tactile', '百变魔尺'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '变形/关节活动套件',
    name: '弯曲方块',
    description: '进行多方向的扭动操作，提升手指精细灵活性与空间方向感。',
    ability_tags: ['指尖精细', '空间感知'],
    image_url: generatePlaceholderImageUrl('tactile', '弯曲方块'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '变形/关节活动套件',
    name: '扭动毛毛虫',
    description: '简单的弯曲与复原动作，适合初阶学生进行模仿与关节活动。',
    ability_tags: ['基础模仿', '动作诱发'],
    image_url: generatePlaceholderImageUrl('tactile', '扭动毛毛虫'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '变形/关节活动套件',
    name: '伸缩管',
    description: '在拉伸收缩中感知长度变化与声音反馈，训练双手协调与听觉关注。',
    ability_tags: ['双手协作', '视听整合'],
    image_url: generatePlaceholderImageUrl('tactile', '伸缩管'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '精细触觉与操作箱',
    name: '综合箱(8合1)',
    description: '通过拔萝卜、敲球、钓鱼等情境游戏，锻炼指尖捏取力量与手眼协调能力。',
    ability_tags: ['手眼协调', '指尖精细'],
    image_url: generatePlaceholderImageUrl('tactile', '综合箱(8合1)'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '精细触觉与操作箱',
    name: '萝卜塔',
    description: '在情境游戏中锻炼指尖捏取（二指/三指抓握）及手眼协调能力。',
    ability_tags: ['手眼协调', '精细抓握'],
    image_url: generatePlaceholderImageUrl('tactile', '萝卜塔'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '精细触觉与操作箱',
    name: '触觉原子球组合',
    description: '多维度的抓握训练，提供特殊的触觉与阻力反馈，提升手指灵活性。',
    ability_tags: ['触觉辨识', '建构能力'],
    image_url: generatePlaceholderImageUrl('tactile', '触觉原子球组合'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '视觉触觉互动套件',
    name: '神奇翻翻乐',
    description: '通过翻页动作改变视觉图案，建立动作与视觉变化的因果联系。',
    ability_tags: ['因果关系', '视觉追踪'],
    image_url: generatePlaceholderImageUrl('tactile', '神奇翻翻乐'),
    is_active: 1
  },

  // ==================== 嗅觉系统套装 (6种) ====================
  {
    category: 'olfactory',
    sub_category: '嗅觉探索套件',
    name: '水果香片',
    description: '辨识不同水果气味，扩充嗅觉记忆库，刺激边缘系统以辅助记忆训练。',
    ability_tags: ['嗅觉辨识', '感官记忆'],
    image_url: generatePlaceholderImageUrl('olfactory', '水果香片'),
    is_active: 1
  },
  {
    category: 'olfactory',
    sub_category: '嗅觉探索套件',
    name: '仿真水果',
    description: '配合香片进行"气味-实物"配对，建立视嗅联系，丰富感官词汇。',
    ability_tags: ['视嗅整合', '认知配对'],
    image_url: generatePlaceholderImageUrl('olfactory', '仿真水果'),
    is_active: 1
  },
  {
    category: 'olfactory',
    sub_category: '嗅觉探索套件',
    name: '香包',
    description: '辨识常见的自然花香，进行气味分类与联想，刺激嗅觉记忆。',
    ability_tags: ['嗅觉辨识', '记忆联想'],
    image_url: generatePlaceholderImageUrl('olfactory', '香包'),
    is_active: 1
  },
  {
    category: 'olfactory',
    sub_category: '嗅觉探索套件',
    name: '仿真面包',
    description: '结合视觉与嗅觉进行物品配对，提升生活物品的认知命名能力。',
    ability_tags: ['多感官整合', '生活认知'],
    image_url: generatePlaceholderImageUrl('olfactory', '仿真面包'),
    is_active: 1
  },
  {
    category: 'olfactory',
    sub_category: '嗅觉探索套件',
    name: '香薰',
    description: '接触更广泛的生活气味，扩展嗅觉经验，辅助情绪调节。',
    ability_tags: ['嗅觉脱敏', '情绪调节'],
    image_url: generatePlaceholderImageUrl('olfactory', '香薰'),
    is_active: 1
  },
  {
    category: 'olfactory',
    sub_category: '嗅觉探索套件',
    name: '《我的感官真有趣》闻一闻',
    description: '提供嗅觉训练的结构化课程指引，辅助建立嗅觉认知与语言表达。',
    ability_tags: ['感官课程', '语言表达'],
    image_url: generatePlaceholderImageUrl('olfactory', '《我的感官真有趣》闻一闻'),
    is_active: 1
  },

  // ==================== 视觉系统套装 (10种) ====================
  {
    category: 'visual',
    sub_category: '流动与光影追踪套件',
    name: '流水解压组',
    description: '追踪缓慢流动的液体与闪粉，锻炼视觉平滑追踪能力，平复情绪。',
    ability_tags: ['视觉追踪', '情绪安抚'],
    image_url: generatePlaceholderImageUrl('visual', '流水解压组'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '流动与光影追踪套件',
    name: '闪光管',
    description: '追踪管内物体的运动轨迹，吸引并维持视觉注意力。',
    ability_tags: ['视觉注意', '视觉聚焦'],
    image_url: generatePlaceholderImageUrl('visual', '闪光管'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '流动与光影追踪套件',
    name: '火箭灯',
    description: '观察旋转上升的水流与变幻灯光，提供高强度视觉刺激，作为强化物。',
    ability_tags: ['视觉刺激', '专注力'],
    image_url: generatePlaceholderImageUrl('visual', '火箭灯'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '定点与计时视觉套件',
    name: '沙漏计时器套装',
    description: '观察液体/沙粒匀速流动，辅助理解时间流逝概念，提升持续注视。',
    ability_tags: ['时间概念', '视觉持续'],
    image_url: generatePlaceholderImageUrl('visual', '沙漏计时器套装'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '定点与计时视觉套件',
    name: '手持星星',
    description: '注视手中光源，进行暗环境下的视觉定位训练及视听结合训练。',
    ability_tags: ['视觉定位', '视听整合'],
    image_url: generatePlaceholderImageUrl('visual', '手持星星'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '定点与计时视觉套件',
    name: '月光',
    description: '注视手中光源，进行暗环境下的视觉定位训练及视听结合训练。',
    ability_tags: ['视觉定位', '视听整合'],
    image_url: generatePlaceholderImageUrl('visual', '月光'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '定点与计时视觉套件',
    name: '《我的感官真有趣》看一看',
    description: '提供视觉训练的结构化课程指引，提升视觉观察技巧。',
    ability_tags: ['视觉认知', '课程指引'],
    image_url: generatePlaceholderImageUrl('visual', '《我的感官真有趣》看一看'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉空间与建构套件',
    name: '迷你星空投影仪',
    description: '在昏暗环境中辨识投射的星光图案，锻炼视觉搜寻与空间感知。',
    ability_tags: ['视觉搜寻', '环境适应'],
    image_url: generatePlaceholderImageUrl('visual', '迷你星空投影仪'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉空间与建构套件',
    name: '阳光彩虹积木(60个)',
    description: '利用透明彩色积木进行光影建构，锻炼颜色识别与空间堆叠。',
    ability_tags: ['颜色认知', '空间建构'],
    image_url: generatePlaceholderImageUrl('visual', '阳光彩虹积木(60个)'),
    is_active: 1
  },

  // ==================== 听觉系统套装 (7种) ====================
  {
    category: 'auditory',
    sub_category: '乐器与自然音套件',
    name: '奥尔夫乐器套装(7件)',
    description: '辨识不同乐器音色，培养节奏感，通过合奏促进社交互动。',
    ability_tags: ['听觉分辨', '社交互动'],
    image_url: generatePlaceholderImageUrl('auditory', '奥尔夫乐器套装(7件)'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '乐器与自然音套件',
    name: '雨冲木珠迷宫',
    description: '将木珠滚动声与"雨滴"自然声音建立联系，培养听觉想象力与专注力。',
    ability_tags: ['听觉联想', '专注力'],
    image_url: generatePlaceholderImageUrl('auditory', '雨冲木珠迷宫'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '乐器与自然音套件',
    name: '雨声筒',
    description: '将木珠滚动声与"雨滴"自然声音建立联系，培养听觉想象力与专注力。',
    ability_tags: ['听觉联想', '专注力'],
    image_url: generatePlaceholderImageUrl('auditory', '雨声筒'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '乐器与自然音套件',
    name: '海浪鼓',
    description: '将珠子滚动声与"海浪"声关联，用于情绪放松或故事场景营造。',
    ability_tags: ['听觉脱敏', '情绪放松'],
    image_url: generatePlaceholderImageUrl('auditory', '海浪鼓'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '听觉反馈与表达套件',
    name: '神奇的镜子',
    description: '结合镜像观察与声音录放功能，提供即时视听反馈，辅助口部构音练习与自我认知。',
    ability_tags: ['视听反馈', '语言诱发', '自我认知'],
    image_url: generatePlaceholderImageUrl('auditory', '神奇的镜子'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '听觉反馈与表达套件',
    name: '手持变色喇叭',
    description: '通过变声效果提供有趣的听觉反馈，激发发声动机，建立声音与动作的因果联系。',
    ability_tags: ['发声动机', '听觉反馈', '因果认知'],
    image_url: generatePlaceholderImageUrl('auditory', '手持变色喇叭'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '听觉反馈与表达套件',
    name: '《我的感官真有趣》听一听',
    description: '提供听觉训练的结构化活动指引与课程扩展。',
    ability_tags: ['感官课程', '语言表达'],
    image_url: generatePlaceholderImageUrl('auditory', '《我的感官真有趣》听一听'),
    is_active: 1
  },

  // ==================== 味觉系统套装 (3种) ====================
  {
    category: 'gustatory',
    sub_category: '味觉探索套件',
    name: '味觉套装',
    description: '在安全指导下尝试不同味道（酸/甜等），建立味觉耐受度与认知。',
    ability_tags: ['味觉耐受', '生活认知'],
    image_url: generatePlaceholderImageUrl('gustatory', '味觉套装'),
    is_active: 1
  },
  {
    category: 'gustatory',
    sub_category: '味觉探索套件',
    name: '《我的感官真有趣》尝一尝',
    description: '提供味觉训练的结构化课程指引，将味觉体验与语言表达结合。',
    ability_tags: ['感官课程', '语言表达'],
    image_url: generatePlaceholderImageUrl('gustatory', '《我的感官真有趣》尝一尝'),
    is_active: 1
  },

  // ==================== 本体觉系统套装 (2种) ====================
  {
    category: 'proprioceptive',
    sub_category: '线性前庭与本体训练',
    name: '豌豆荚',
    description: '提供挤压感与包裹感，帮助感知身体边界，建立安全感与体像能力。',
    ability_tags: ['身体概念', '本体觉'],
    image_url: generatePlaceholderImageUrl('proprioceptive', '豌豆荚'),
    is_active: 1
  },
  {
    category: 'proprioceptive',
    sub_category: '线性前庭与本体训练',
    name: '颗粒大龙球',
    description: '提供大面积触觉刺激与前庭输入，用于核心稳定性训练及姿势控制。',
    ability_tags: ['前庭输入', '核心稳定', '触觉调节'],
    image_url: generatePlaceholderImageUrl('proprioceptive', '颗粒大龙球'),
    is_active: 1
  },

  // ==================== 感官综合箱套装 (12种) ====================
  {
    category: 'integration',
    sub_category: '动态平衡与协调套件',
    name: '跳跳球',
    description: '在动态跳跃中维持身体平衡，强化前庭刺激，提升核心力量。',
    ability_tags: ['动态平衡', '核心力量'],
    image_url: generatePlaceholderImageUrl('integration', '跳跳球'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '动态平衡与协调套件',
    name: '手忙脚乱敏捷垫',
    description: '根据视觉指令快速调整手脚位置，锻炼身体协调性、反应速度及动作计划能力。',
    ability_tags: ['动作计划', '反应速度'],
    image_url: generatePlaceholderImageUrl('integration', '手忙脚乱敏捷垫'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '动态平衡与协调套件',
    name: '揪尾巴',
    description: '在追逐躲闪中维持身体动态平衡，强化前庭本体整合，提升社交互动能力。',
    ability_tags: ['动态平衡', '社交互动'],
    image_url: generatePlaceholderImageUrl('integration', '揪尾巴'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '建构逻辑与认知套件',
    name: '萝卜塔',
    description: '在情境游戏中锻炼指尖捏取（二指/三指抓握）及手眼协调能力。',
    ability_tags: ['手眼协调', '精细抓握'],
    image_url: generatePlaceholderImageUrl('integration', '萝卜塔'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '建构逻辑与认知套件',
    name: '表情积木拼图',
    description: '识别并拼搭不同的面部表情，提升情绪理解与非语言社交能力。',
    ability_tags: ['情绪认知', '社交观察'],
    image_url: generatePlaceholderImageUrl('integration', '表情积木拼图'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '社交规则与互动套件',
    name: '猫捉老鼠',
    description: '通过听觉指令进行快速反应游戏，锻炼听觉注意力、冲动控制及轮流等待规则。',
    ability_tags: ['听觉注意', '社交规则', '冲动控制'],
    image_url: generatePlaceholderImageUrl('integration', '猫捉老鼠'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '视觉空间与建构套件',
    name: '百变齿轮',
    description: '拼插并转动齿轮，理解机械传动的因果关系，锻炼逻辑思维。',
    ability_tags: ['逻辑思维', '因果推理'],
    image_url: generatePlaceholderImageUrl('integration', '百变齿轮'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '社交规则与互动套件',
    name: '滚来滚去(大骰子)',
    description: '作为集体活动的辅助教具，用于建立轮流机制、数字/颜色认知及大运动指令发布。',
    ability_tags: ['社交轮流', '规则意识'],
    image_url: generatePlaceholderImageUrl('integration', '滚来滚去(大骰子)'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '社交规则与互动套件',
    name: '彩色翻板',
    description: '通过翻板的连锁翻转动作，建立因果关系认知，锻炼视觉追踪能力及持续注意力。',
    ability_tags: ['因果关系', '视觉追踪', '持续注意'],
    image_url: generatePlaceholderImageUrl('integration', '彩色翻板'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '生活技能训练套件',
    name: '枕头安安',
    description: '通过操作插扣与内置响球，锻炼手指力量与双手协作；结合图案与声音反馈，进行多感官认知训练。',
    ability_tags: ['双手协作', '精细动作', '多感官整合'],
    image_url: generatePlaceholderImageUrl('integration', '枕头安安'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '生活技能训练套件',
    name: '小熊乐乐',
    description: '模拟穿衣情境（拉链、系扣、系带），锻炼精细动作与手眼协调，培养生活自理能力基础。',
    ability_tags: ['生活自理(ADL)', '手眼协调', '精细抓握'],
    image_url: generatePlaceholderImageUrl('integration', '小熊乐乐'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '视觉听觉安抚套件',
    name: '波浪投影小乌龟',
    description: '提供柔和的波浪光影投射与白噪音，营造低唤醒度的感官环境，辅助情绪调节与放松入睡。',
    ability_tags: ['情绪调节', '视觉舒缓', '环境适应'],
    image_url: generatePlaceholderImageUrl('integration', '波浪投影小乌龟'),
    is_active: 1
  }
]

// 验证数据数量
console.log(`器材数据加载完成: ${EQUIPMENT_DATA.length} 种器材`)
