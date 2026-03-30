/**
 * 器材数据初始化
 * 基于 2026-03-26 导入的感官综合发展资源 CSV 生成的 63 种器材
 *
 * 图片说明：
 * - 优先使用真实图片：src/assets/images/equipment/{category}-{id}.webp
 * - 如果真实图片不存在，自动使用占位符（颜色 + 首字母）
 */

import type { EquipmentCatalog } from '@/types/equipment'
import { CATEGORY_COLORS } from '@/types/equipment'
import { getTrainingResourceCopyOverride } from '@/data/generated-training-resource-copy'
import { buildSensoryEquipmentResourceCopyKey } from '@/utils/training-resource-copy'

/**
 * 生成颜色占位符图片 URL（后备方案）
 */
function generatePlaceholderImageUrl(category: string, name: string): string {
  const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#CCCCCC'
  const firstChar = name.charAt(0)

  const svg = `
    <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" fill="${color}"/>
      <text x="64" y="80" font-size="48" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">${firstChar}</text>
    </svg>
  `.trim()

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * 63种器材数据
 */
const BASE_EQUIPMENT_DATA: Omit<EquipmentCatalog, 'id' | 'created_at'>[] = [
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '感官环',
    description: '戴在手腕上随时摸摸不同的纹理，能帮敏感的孩子适应触觉刺激，让焦躁的心情变平静。',
    ability_tags: ['触觉调节', '情绪稳定'],
    image_url: generatePlaceholderImageUrl('tactile', '感官环'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '彩色感官组',
    description: '让小手摸摸光滑或粗糙的石头，像探险一样分辨不同质感，让手指尖的感觉变得更灵敏。',
    ability_tags: ['触觉辨识', '精细触觉'],
    image_url: generatePlaceholderImageUrl('tactile', '彩色感官组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '触觉认知拓扑球',
    description: '使劲捏这个拓扑球，手指越用力越能感觉到反馈，能帮孩子发泄多余精力，让大脑清醒点。',
    ability_tags: ['指尖力量', '自我调节'],
    image_url: generatePlaceholderImageUrl('tactile', '触觉认知拓扑球'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '多角形压力调节组',
    description: '星星角捏起来软硬适中，孩子心烦时使劲揉搓它，既能把坏情绪发泄掉，又能锻炼手指头。',
    ability_tags: ['情绪宣泄', '精细控制'],
    image_url: generatePlaceholderImageUrl('tactile', '多角形压力调节组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '色彩流变感知组',
    description: '一捏里面的液体就会流动变色，好看又好玩。孩子盯着看一会儿，哭闹的注意力就被转移了。',
    ability_tags: ['视觉追踪', '情绪调节'],
    image_url: generatePlaceholderImageUrl('tactile', '色彩流变感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '双位按压反馈组',
    description: '按下去“啵”的一声特别解压，手闲不住的孩子一直按这个，上课就不容易走神或捣乱了。',
    ability_tags: ['听觉反馈', '专注辅助'],
    image_url: generatePlaceholderImageUrl('tactile', '双位按压反馈组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '慢回弹压力缓解组',
    description: '软乎乎的包子随便怎么捏都能变回原样，孩子发脾气想撒气时就捏它，安全又练手劲儿。',
    ability_tags: ['情绪宣泄', '手部控制'],
    image_url: generatePlaceholderImageUrl('tactile', '慢回弹压力缓解组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '彩色波纹伸缩组',
    description: '一扔出去瞬间变大，收回来又变小。神奇的变形能吸引孩子一直玩，锻炼眼睛盯着物体看。',
    ability_tags: ['视觉关注', '因果认知'],
    image_url: generatePlaceholderImageUrl('tactile', '彩色波纹伸缩组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '多向伸缩感知组',
    description: '把小人的手脚扭来扭去摆造型，既练手劲又好玩。看着小人的笑脸，还能教孩子认识表情。',
    ability_tags: ['手部力量', '本体感知'],
    image_url: generatePlaceholderImageUrl('tactile', '多向伸缩感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '柔性人形感知组',
    description: '转一转就能变出各种形状，像变魔术一样。这能让孩子手腕更灵活，脑子里也有立体图形。',
    ability_tags: ['空间规划', '手腕灵活'],
    image_url: generatePlaceholderImageUrl('tactile', '柔性人形感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '分段式弯折感知组',
    description: '用两个手指捏着玩弯折游戏，就像拔萝卜一样有趣。专门锻炼孩子拿东西的手势和准头。',
    ability_tags: ['手眼协调', '精细抓握'],
    image_url: generatePlaceholderImageUrl('tactile', '分段式弯折感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '多环嵌套感知组',
    description: '弯一弯再直起来，动作特别简单。很适合刚开始学的孩子跟着老师做模仿，活动手指关节。',
    ability_tags: ['基础模仿', '动作诱发'],
    image_url: generatePlaceholderImageUrl('tactile', '多环嵌套感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '可扭转感知组',
    description: '用力拉开会有“咔咔”的声音，还能接在一起。喜欢听怪声、手劲大的孩子玩这个最过瘾。',
    ability_tags: ['双手协调', '听觉反馈'],
    image_url: generatePlaceholderImageUrl('tactile', '可扭转感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '3D网式感知组',
    description: '拿在手里不停地扭来扭去，一点声音都没有。孩子上课紧张或手痒时玩这个，解压不扰民。',
    ability_tags: ['精细控制', '情绪调节'],
    image_url: generatePlaceholderImageUrl('tactile', '3D网式感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '3D翻转感知组',
    description: '双手用力拉开这张网，看着它变形。拉扯时的阻力能让孩子感觉到肌肉发力，锻炼协调性。',
    ability_tags: ['双手协调', '本体感知'],
    image_url: generatePlaceholderImageUrl('tactile', '3D翻转感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '立体构型组',
    description: '既能指尖旋转又能按压，手感特别丰富。坐不住的孩子玩着它，就能安静下来不乱动了。',
    ability_tags: ['视觉触觉', '缓解多动'],
    image_url: generatePlaceholderImageUrl('tactile', '立体构型组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '彩色连环感知组',
    description: '不停地翻折这个方块，图案一直在变。孩子为了看新图案会一直动手，明白动手才有变化。',
    ability_tags: ['因果关系', '视觉追踪'],
    image_url: generatePlaceholderImageUrl('tactile', '彩色连环感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '多触点旋转组',
    description: '朝着不同方向拧这个方块，手指得灵活才行。能帮孩子分清上下左右，锻炼空间方向感。',
    ability_tags: ['指尖精细', '空间感知'],
    image_url: generatePlaceholderImageUrl('tactile', '多触点旋转组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '桌游互动包',
    description: '手伸进袋子里摸一摸，猜猜是什么形状。这能锻炼孩子只靠手感记东西，并试着说出来。',
    ability_tags: ['触觉记忆', '形状认知'],
    image_url: generatePlaceholderImageUrl('tactile', '桌游互动包'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '触摸本',
    description: '跟着书本去摸不同的东西，一边摸一边学“软的、硬的”这些词，让孩子能说出感觉。',
    ability_tags: ['感官认知', '词汇建立'],
    image_url: generatePlaceholderImageUrl('tactile', '触摸本'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '多材质纹理感知组',
    description: '光脚踩在不同纹理的垫子上，像探险一样。既能帮敏感的孩子适应触觉，又能练习走稳路。',
    ability_tags: ['触觉脱敏', '动态平衡'],
    image_url: generatePlaceholderImageUrl('tactile', '多材质纹理感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '立体形态感知组',
    description: '手按在针板上印出手印，冰冰凉凉的很舒服。能控制孩子按压的力度，还能看到立体形状。',
    ability_tags: ['触觉反馈', '精细控制'],
    image_url: generatePlaceholderImageUrl('tactile', '立体形态感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '重力安抚器',
    description: '有分量的小熊抱在怀里，就像妈妈的拥抱。孩子哭闹或者睡不着时抱着它，很快就安心了。',
    ability_tags: ['深压安抚', '情绪调节'],
    image_url: generatePlaceholderImageUrl('tactile', '重力安抚器'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '加权安抚感知组',
    description: '比普通玩偶重很多的狐狸，压在腿上特别踏实。受惊吓或者感官超载时，它是最好的陪伴。',
    ability_tags: ['深压输入', '安全感'],
    image_url: generatePlaceholderImageUrl('tactile', '加权安抚感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '全身压力输入感官组',
    description: '钻进这个弹力袋子里，全身被紧紧包裹着。这种挤压感能让崩溃大哭的孩子瞬间找回安全感。',
    ability_tags: ['全身深压', '情绪调节'],
    image_url: generatePlaceholderImageUrl('tactile', '全身压力输入感官组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '振动热敷感知组',
    description: '挂在脖子上会有轻微震动，像按摩一样舒服。考试紧张或者害怕时用它，身体马上就放松了。',
    ability_tags: ['震动反馈', '身体放松'],
    image_url: generatePlaceholderImageUrl('tactile', '振动热敷感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '木质机器人感知组',
    description: '机器人的关节可以随便扭，摆出各种酷酷的姿势。需要两只手配合，锻炼手腕灵活度。',
    ability_tags: ['手腕灵活', '双手协作'],
    image_url: generatePlaceholderImageUrl('tactile', '木质机器人感知组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '磁性切分操作组',
    description: '拿刀切开水果，“咔嚓”一声特别爽。教孩子左手拿右手切，锻炼手眼配合，学习生活常识。',
    ability_tags: ['手眼协调', '生活认知'],
    image_url: generatePlaceholderImageUrl('tactile', '磁性切分操作组'),
    is_active: 1
  },
  {
    category: 'tactile',
    sub_category: '触觉材料套装',
    name: '弹性建构感知组',
    description: '颜色鲜艳的球有很多洞洞，小手容易抓得住。引导宝宝伸手去抓去捏，锻炼手部控制能力。',
    ability_tags: ['抓握力量', '空间认知'],
    image_url: generatePlaceholderImageUrl('tactile', '弹性建构感知组'),
    is_active: 1
  },
  {
    category: 'olfactory',
    sub_category: '味嗅觉材料套装',
    name: '嗅觉认知组件',
    description: '这个假水果配合香片一起闻，让孩子闻味道找水果，把鼻子和眼睛配合起来，增强记忆力。',
    ability_tags: ['视嗅整合', '认知配对'],
    image_url: generatePlaceholderImageUrl('olfactory', '嗅觉认知组件'),
    is_active: 1
  },
  {
    category: 'olfactory',
    sub_category: '味嗅觉材料套装',
    name: '香包组件',
    description: '闻闻香包猜猜是哪种花，把一样的味道分在一起。能锻炼鼻子灵敏度，还能唤起嗅觉记忆。',
    ability_tags: ['嗅觉辨识', '记忆联想'],
    image_url: generatePlaceholderImageUrl('olfactory', '香包组件'),
    is_active: 1
  },
  {
    category: 'olfactory',
    sub_category: '味嗅觉材料套装',
    name: '香薰',
    description: '闻闻不同的精油味道，有的让人精神，有的让人放松。扩展孩子的嗅觉经验，调节心情。',
    ability_tags: ['嗅觉脱敏', '情绪调节'],
    image_url: generatePlaceholderImageUrl('olfactory', '香薰'),
    is_active: 1
  },
  {
    category: 'olfactory',
    sub_category: '味嗅觉材料套装',
    name: '仿真面包',
    description: '看着像面包，闻着也像面包。教孩子把气味和物品对上号，学会叫出生活中食物的名字。',
    ability_tags: ['多感官整合', '生活认知'],
    image_url: generatePlaceholderImageUrl('olfactory', '仿真面包'),
    is_active: 1
  },
  {
    category: 'olfactory',
    sub_category: '味嗅觉材料套装',
    name: '嗅觉本',
    description: '跟着书本做游戏，一边闻一边学着说“香的、臭的”。让孩子学会用语言描述闻到的味道。',
    ability_tags: ['嗅觉认知', '语言表达'],
    image_url: generatePlaceholderImageUrl('olfactory', '嗅觉本'),
    is_active: 1
  },
  {
    category: 'gustatory',
    sub_category: '味嗅觉材料套装',
    name: '味觉套装',
    description: '安全地尝一点酸甜苦咸，让挑食的孩子适应不同味道。学会分辨味道，不再抗拒新食物。',
    ability_tags: ['味觉耐受', '认知建立'],
    image_url: generatePlaceholderImageUrl('gustatory', '味觉套装'),
    is_active: 1
  },
  {
    category: 'gustatory',
    sub_category: '味嗅觉材料套装',
    name: '味觉本',
    description: '按照书里的步骤去尝味道，教孩子说出“好酸、好甜”。把吃东西的感觉变成话语说出来。',
    ability_tags: ['味觉体验', '语言表达'],
    image_url: generatePlaceholderImageUrl('gustatory', '味觉本'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉材料套装',
    name: '色彩感知组',
    description: '看着卡片上的颜色，把小棍插到鳄鱼背上。既要认准颜色，手还要插得准，锻炼眼手配合。',
    ability_tags: ['视觉辨识', '精细动作'],
    image_url: generatePlaceholderImageUrl('visual', '色彩感知组'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉材料套装',
    name: '色彩流动输入组',
    description: '看着亮光里的水流旋转上升，非常吸引眼球。孩子做对任务时给看这个，是最好的奖励。',
    ability_tags: ['视觉刺激', '强化奖励'],
    image_url: generatePlaceholderImageUrl('visual', '色彩流动输入组'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉材料套装',
    name: '星光影感知组',
    description: '关上灯，找找墙上的星星都在哪。让孩子不再怕黑，还能锻炼眼睛在暗处找东西的能力。',
    ability_tags: ['视觉搜寻', '环境适应'],
    image_url: generatePlaceholderImageUrl('visual', '星光影感知组'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉材料套装',
    name: '视觉本',
    description: '跟着书本找不同、找规律。教孩子学会仔细观察，不再看东西走马观花，提升观察力。',
    ability_tags: ['视觉观察', '课程指引'],
    image_url: generatePlaceholderImageUrl('visual', '视觉本'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉材料套装',
    name: '动态分层视觉组',
    description: '看着沙漏一点点流完，孩子就明白“五分钟”是多久了。既能练专注，又能学会等待。',
    ability_tags: ['时间概念', '视觉持续'],
    image_url: generatePlaceholderImageUrl('visual', '动态分层视觉组'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉材料套装',
    name: '手持星星',
    description: '手里拿着发光的星星，走到哪亮到哪。训练孩子眼睛盯着光走，锻炼在暗处的视觉定位。',
    ability_tags: ['视觉定位', '视听整合'],
    image_url: generatePlaceholderImageUrl('visual', '手持星星'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉材料套装',
    name: '七彩渐变感知组',
    description: '柔和的月亮光会变色，拿着它在黑屋子里探索。能让怕黑的孩子有安全感，锻炼视觉追踪。',
    ability_tags: ['视觉追踪', '安全感'],
    image_url: generatePlaceholderImageUrl('visual', '七彩渐变感知组'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉材料套装',
    name: '光影建构视觉模块',
    description: '透光的彩色积木搭在一起，阳光一照特别美。让孩子认识颜色叠加，还能练习搭高高。',
    ability_tags: ['颜色认知', '空间建构'],
    image_url: generatePlaceholderImageUrl('visual', '光影建构视觉模块'),
    is_active: 1
  },
  {
    category: 'visual',
    sub_category: '视觉材料套装',
    name: '手持式光影感官调控板',
    description: '晃一晃，里面的亮片液体就流动起来。孩子烦躁时盯着它看，心跳就能慢慢平复下来。',
    ability_tags: ['视觉追踪', '情绪镇静'],
    image_url: generatePlaceholderImageUrl('visual', '手持式光影感官调控板'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '听觉材料套装',
    name: '节奏感知听觉训练组',
    description: '敲敲打打听不同的声音，跟着节奏摇摆。大家一起玩乐器，能让孩子学会配合别人。',
    ability_tags: ['听觉分辨', '社交互动'],
    image_url: generatePlaceholderImageUrl('auditory', '节奏感知听觉训练组'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '听觉材料套装',
    name: '多感官听觉感知组',
    description: '上下翻转，里面的珠子滚过迷宫声音很清脆。吸引孩子竖起耳朵听，锻炼专注力和抓握。',
    ability_tags: ['听觉专注', '抓握能力'],
    image_url: generatePlaceholderImageUrl('auditory', '多感官听觉感知组'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '听觉材料套装',
    name: '分层听觉感知单元',
    description: '慢慢倾斜，闭上眼听就像下雨的声音。这种白噪音能让孩子安静下来，培养听觉想象力。',
    ability_tags: ['听觉联想', '情绪安抚'],
    image_url: generatePlaceholderImageUrl('auditory', '分层听觉感知单元'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '听觉材料套装',
    name: '听觉本',
    description: '跟着书本玩听声音游戏，分辨是大声还是小声。教孩子学会听指令，锻炼耳朵的敏锐度。',
    ability_tags: ['听觉训练', '听从指令'],
    image_url: generatePlaceholderImageUrl('auditory', '听觉本'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '听觉材料套装',
    name: '多频听觉敲击单元',
    description: '敲不同的琴键声音不一样，让孩子明白动作带来声音。敲敲打打还能锻炼手臂的大动作。',
    ability_tags: ['听觉辨识', '上肢协调'],
    image_url: generatePlaceholderImageUrl('auditory', '多频听觉敲击单元'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '听觉材料套装',
    name: '视听联动表达组',
    description: '对着镜子说话还能录音，看见自己的口型，听见自己的声音。专门帮孩子练习开口说话。',
    ability_tags: ['语言诱发', '自我认知'],
    image_url: generatePlaceholderImageUrl('auditory', '视听联动表达组'),
    is_active: 1
  },
  {
    category: 'auditory',
    sub_category: '听觉材料套装',
    name: '听觉辨别组',
    description: '使劲吹气就能发出动物叫声，好玩又能练肺活量。锻炼嘴巴肌肉，为以后说话打基础。',
    ability_tags: ['口肌锻炼', '发音辅助'],
    image_url: generatePlaceholderImageUrl('auditory', '听觉辨别组'),
    is_active: 1
  },
  {
    category: 'proprioceptive',
    sub_category: '本体觉材料套装',
    name: '包裹本体觉感知单元',
    description: '像豌豆一样挤在这个充气船里，身体被紧紧包住。这种挤压感能给孩子极大的安全感。',
    ability_tags: ['身体边界', '安全感'],
    image_url: generatePlaceholderImageUrl('proprioceptive', '包裹本体觉感知单元'),
    is_active: 1
  },
  {
    category: 'proprioceptive',
    sub_category: '本体觉材料套装',
    name: '颗粒大龙球',
    description: '骑在这个大花生球上摇晃，表面还有按摩颗粒。能锻炼孩子的腰腹力量，帮他们坐得稳。',
    ability_tags: ['核心稳定', '前庭输入'],
    image_url: generatePlaceholderImageUrl('proprioceptive', '颗粒大龙球'),
    is_active: 1
  },
  {
    category: 'proprioceptive',
    sub_category: '本体觉材料套装',
    name: '重力弹跳感知单元',
    description: '抓着手柄蹦蹦跳跳，这需要很好的平衡能力。能消耗多余精力，还能锻炼全身的协调性。',
    ability_tags: ['动态平衡', '核心力量'],
    image_url: generatePlaceholderImageUrl('proprioceptive', '重力弹跳感知单元'),
    is_active: 1
  },
  {
    category: 'proprioceptive',
    sub_category: '本体觉材料套装',
    name: '触觉-本体觉联动游戏衣',
    description: '互相追逐去揪对方的尾巴，跑来跑去很开心。锻炼孩子跑动平衡，还能学会和小伙伴玩。',
    ability_tags: ['社交互动', '大运动'],
    image_url: generatePlaceholderImageUrl('proprioceptive', '触觉-本体觉联动游戏衣'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '综合训练材料套装',
    name: '表情游戏组',
    description: '拼出哭、笑、生气的脸，教孩子看懂别人的表情。学会察言观色，知道别人是开心还是难过。',
    ability_tags: ['情绪认知', '社交观察'],
    image_url: generatePlaceholderImageUrl('integration', '表情游戏组'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '综合训练材料套装',
    name: '猫捉老鼠桌游',
    description: '听到指令赶紧抓或赶紧跑，比谁反应快。这能治孩子冲动的毛病，学会听指挥和守规矩。',
    ability_tags: ['冲动控制', '规则意识'],
    image_url: generatePlaceholderImageUrl('integration', '猫捉老鼠桌游'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '综合训练材料套装',
    name: '百变结构组',
    description: '转动一个齿轮，所有的都跟着转，太神奇了。让孩子明白因果关系，锻炼动脑逻辑能力。',
    ability_tags: ['逻辑思维', '因果推理'],
    image_url: generatePlaceholderImageUrl('integration', '百变结构组'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '综合训练材料套装',
    name: '指令游戏组',
    description: '扔大骰子决定做什么动作或拿几个东西。让大家轮流玩，学会遵守游戏规则和认识数字。',
    ability_tags: ['社交轮流', '规则意识'],
    image_url: generatePlaceholderImageUrl('integration', '指令游戏组'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '综合训练材料套装',
    name: '小熊乐乐',
    description: '给小熊拉拉链、系扣子、绑鞋带。把手练巧了，以后孩子就能自己穿衣服，不用家长帮。',
    ability_tags: ['生活自理', '精细动作'],
    image_url: generatePlaceholderImageUrl('integration', '小熊乐乐'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '综合训练材料套装',
    name: '枕头安安',
    description: '枕头上有插扣和响球，专门给手闲不住的孩子玩。锻炼手指力量，需要两只手配合才能玩。',
    ability_tags: ['双手协作', '精细动作'],
    image_url: generatePlaceholderImageUrl('integration', '枕头安安'),
    is_active: 1
  },
  {
    category: 'integration',
    sub_category: '综合训练材料套装',
    name: '发声感官启智配对豆包',
    description: '摸起来手感不同，捏一下还会响。让孩子一边摸形状一边听声音，全面锻炼感觉统合能力。',
    ability_tags: ['触觉脱敏', '感官统合'],
    image_url: generatePlaceholderImageUrl('integration', '发声感官启智配对豆包'),
    is_active: 1
  }
]

export const EQUIPMENT_DATA: Omit<EquipmentCatalog, 'id' | 'created_at'>[] = BASE_EQUIPMENT_DATA.map((item, index) => {
  const override = getTrainingResourceCopyOverride(buildSensoryEquipmentResourceCopyKey(index + 1))

  return {
    ...item,
    name: override?.name || item.name,
    description: override ? override.description : item.description,
  }
})
