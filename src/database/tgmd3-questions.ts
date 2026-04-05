import type { ScaleOption, ScaleQuestion } from '@/types/assessment'

export type Tgmd3DimensionCode = 'locomotor' | 'ball_skills'

export interface Tgmd3DimensionDefinition {
  code: Tgmd3DimensionCode
  label: string
  fullLabel: string
  itemCount: number
  maxScore: number
}

export interface Tgmd3SkillDefinition {
  id: number
  itemCode: string
  code: string
  dimension: Tgmd3DimensionCode
  dimensionName: string
  name: string
  equipment: string
  guidance: string
  criteria: string[]
  maxScore: number
}

export interface Tgmd3NormRange {
  min: number
  max: number
}

export type Tgmd3NormLevels = [Tgmd3NormRange | null, Tgmd3NormRange | null, Tgmd3NormRange | null, Tgmd3NormRange | null, Tgmd3NormRange | null]

export const TGMD3_DIMENSIONS: Tgmd3DimensionDefinition[] = [
  { code: 'locomotor', label: '位移技能', fullLabel: '位移技能 Locomotor', itemCount: 6, maxScore: 46 },
  { code: 'ball_skills', label: '球类技能', fullLabel: '球类技能 Ball Skills', itemCount: 7, maxScore: 54 },
]

function splitCriteriaText(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export const TGMD3_SKILLS: Tgmd3SkillDefinition[] = [
  {
    id: 1,
    itemCode: 'A1',
    code: 'run',
    dimension: 'locomotor',
    dimensionName: '位移技能',
    name: '快速跑',
    equipment: '18米长的无障碍安全跑道，两个颜色鲜艳的标志物（如雪糕筒）。',
    guidance: '将两个标志物相距 15米 放置。【安全注意】：确保终点标志物后方至少有 2.5-3米 的缓冲空间，防止孩子因冲刺无法刹车而受伤。指导孩子从起点跑到对侧。',
    criteria: splitCriteriaText(`1.手臂协调： 双手弯曲，胳膊和腿呈“反方向”前后摆动（左臂右腿，右臂左腿）。
2.腾空瞬间： 跑的过程中，有一个瞬间双脚是同时离开地面的（看起来像“飞”起来了一下）。
3.后踢腿幅度： 向后抬起的小腿（不着地的那条腿），弯曲程度大约呈 90 度。
4.脚部落地： 落地时用脚后跟或前脚掌着地，且步子不外八（不是整个脚掌“啪嗒啪嗒”平拍地面）。`),
    maxScore: 8,
  },
  {
    id: 2,
    itemCode: 'A2',
    code: 'gallop',
    dimension: 'locomotor',
    dimensionName: '位移技能',
    name: '马步跳',
    equipment: '8米长的无障碍安全跑道，两个标志物。',
    guidance: '将两个标志物相距 7.5米 放置。受试儿童从起始点开始，一脚在前、一脚在后做马步跳跃至终点。',
    criteria: splitCriteriaText(`1.手臂动作： 双臂弯曲，配合着跳跃的节奏在身体前方摆动。
2.步法正确： 前脚向前跨一步，后脚迅速跟上来，但后脚永远不能超过前脚（就像骑马一样，一前一后）。
3.腾空瞬间： 两只脚有一个瞬间同时离开地面。
4.动作连贯： 能够保持节奏，连续不中断地跳至少 4 次。`),
    maxScore: 8,
  },
  {
    id: 3,
    itemCode: 'A3',
    code: 'hop',
    dimension: 'locomotor',
    dimensionName: '位移技能',
    name: '单脚连续跳',
    equipment: '至少 5米长的无障碍场地，两个标志物。',
    guidance: '将两个标志物相距 4.5米 放置。受试儿童使用优势脚（惯用脚）连续向前跳跃 4 次。',
    criteria: splitCriteriaText(`1.摆腿借力： 抬在空中的那只脚，能像“钟摆”一样前后晃动，帮身体借力往前跳。
2.空中姿势： 抬在空中的那只脚，始终保持在身体的后方（没有勾到前面来）。
3.手臂借力： 双手弯曲，并一起向前摆动来帮助身体腾空。
4.动作连贯： 用同一只脚起跳并落地，连续平稳地跳至少 3 次。`),
    maxScore: 8,
  },
  {
    id: 4,
    itemCode: 'A4',
    code: 'skip',
    dimension: 'locomotor',
    dimensionName: '位移技能',
    name: '跨步跳',
    equipment: '至少 9-10米长的无障碍场地，两个标志物。',
    guidance: '将两个标志物相距 9米 放置。受试儿童单脚起跳，在空中呈跨步姿态，对侧脚落地。',
    criteria: splitCriteriaText(`1.步法交替： 动作是“迈一步，同脚跳一下”，左右脚交替进行（左脚迈-左脚跳，右脚迈-右脚跳）。
2.手臂借力： 胳膊弯曲，和腿呈反方向摆动发力（左手臂向前时，右腿向前）。
3.腾空瞬间： 在单脚起跳的那个瞬间，悬空的那只脚保持在靠近地面的位置（注意：不要像高抬腿那样把膝盖顶得很高，也不要向后踢得太夸张）。
4.动作连贯： 有节奏地连续完成 4 次交替的跨步跳。`),
    maxScore: 8,
  },
  {
    id: 5,
    itemCode: 'A5',
    code: 'horizontal_jump',
    dimension: 'locomotor',
    dimensionName: '位移技能',
    name: '立定跳远',
    equipment: '至少 3米长的安全防滑场地，彩色地胶带（视觉提示）。',
    guidance: '用胶带在地面贴出明显的起跳线（对于视障或认知受限孩子可使用对比色强烈的胶带）。受试儿童双脚站在起跳线后，全力向前起跳。',
    criteria: splitCriteriaText(`1.起跳前蓄力： 跳之前，双膝弯曲，双臂向后方拉伸（做好了蓄力的准备动作）。
2.手臂向上挥： 起跳瞬间，双臂用力向前上方挥动，一直伸展到头顶。
3.双起双落： 两只脚同时蹬地起跳，并且两只脚同时落地。
4.落地缓冲： 落地时，双臂有一个向下压的动作，帮助身体保持平衡。`),
    maxScore: 8,
  },
  {
    id: 6,
    itemCode: 'A6',
    code: 'slide',
    dimension: 'locomotor',
    dimensionName: '位移技能',
    name: '侧滑步',
    equipment: '至少 8米长的无障碍场地，一条直线标记，两个标志物。',
    guidance: '两个标志物分开放置于直线两端（相距约 7.5米）。受试儿童从起点沿直线做侧向滑步到终点，再滑步返回，往返一次为一组测试。',
    criteria: splitCriteriaText(`1.侧身姿态： 身体完全侧过来，肩膀的方向和地上的直线保持平行（胸口没有转过来朝向正前方）。
2.侧跨与并步： 前脚向侧方迈出一步，后脚贴着地面滑行，跟上并靠近前脚（注意：后脚绝对不能交叉越过前脚）。
3.动作连贯： 向右或向左，连续不中断地完成至少 4 次“迈步-滑行”的动作。`),
    maxScore: 6,
  },
  {
    id: 7,
    itemCode: 'B1',
    code: 'two_hand_strike',
    dimension: 'ball_skills',
    dimensionName: '球类技能',
    name: '双手持棒击定位球',
    equipment: '直径约 10厘米的轻质软胶球/海绵球，一根儿童塑料棒球棒，一个T型击球底座。',
    guidance: '击球点的高度应调整至受试儿童的腰部水平。受试儿童双手握棒，向正前方用力击球，球需落在前方地面。',
    criteria: splitCriteriaText(`1.握棒手势： 惯用手（如右手）握在非惯用手（如左手）的上方。
2.侧身准备： 非惯用手那一侧的肩膀，正对着前方的击球方向（身体是侧着站的）。
3.转腰发力： 击球时，转动腰部和身体的角度超过 90 度（不仅靠手臂抡，还能用上腰部的力量）。
4.重心转移： 击球瞬间，前脚向前迈一步，身体的重心转移到了前脚上。
5.准确击中： 球棒准确地打中了球。`),
    maxScore: 10,
  },
  {
    id: 8,
    itemCode: 'B2',
    code: 'one_hand_forehand_strike',
    dimension: 'ball_skills',
    dimensionName: '球类技能',
    name: '单手持拍击反弹球',
    equipment: '一个网球或低弹力软球、一副轻质儿童网球拍或软塑料拍、一面平整安全的墙壁。',
    guidance: '将球和球拍交给儿童。儿童将球举起后自然松手（球落地反弹至腰部高度时），用球拍将反弹球击打到墙上。',
    criteria: splitCriteriaText(`1.向后引拍： 球落地弹起来的时候，拿拍子的手有明显的向后拉（引拍）的蓄力动作。
2.迈步动作： 击球时，拿拍手的对侧脚（比如右手拿拍，左脚）向前迈一步。
3.击球方向： 准确地把球朝正前方（墙壁方向）打出去。
4.准确击中： 球拍准确地打中了球。`),
    maxScore: 8,
  },
  {
    id: 9,
    itemCode: 'B3',
    code: 'dribble',
    dimension: 'ball_skills',
    dimensionName: '球类技能',
    name: '单手原地拍球',
    equipment: '3-5岁： 直径 20-25厘米的软式排球或儿童皮球；\n6-10岁： 标准儿童篮球（若孩子触觉敏感，可换成同尺寸海绵篮球）；平整场地。',
    guidance: '受试儿童站立，用单手连续拍打球，要求球至少落地反弹 4 次，最后双手将球接住抱在胸前。',
    criteria: splitCriteriaText(`1.拍球高度： 用单手在腰部或肚脐附近的高度拍球。
2.指腹按压： 用手指的指腹向下推按球（而不是僵硬地用全手掌“啪啪”扇打球）。
3.落点控制： 球落地的位置，在拍球手同一侧脚的前方或外侧（没有跑到两腿中间或身体后面）。`),
    maxScore: 6,
  },
  {
    id: 10,
    itemCode: 'B4',
    code: 'catch',
    dimension: 'ball_skills',
    dimensionName: '球类技能',
    name: '双手接球',
    equipment: '直径约 10厘米的塑料球/软胶球，5米长的无障碍场地，彩色地胶带。',
    guidance: '用胶带标记两条相距 4.5米 的平行线。受试儿童与测试者分别站在两条线后。测试者用柔和且清晰的提示（如“看这里，接球！”），将球平稳抛向儿童的胸腹部位置，儿童双手接球。',
    criteria: splitCriteriaText(`1.准备姿势： 老师抛球前，孩子的双手已经放在身体前方，手肘稍微弯曲，做好了迎接的准备。
2.主动迎球： 球飞过来时，双臂会主动向外伸出去迎接球。
3.纯手部接球：只用双手的手掌和手指把球接住并控制住（而不是把球死死抱在胸前，或者靠肚子帮忙夹住）。`),
    maxScore: 6,
  },
  {
    id: 11,
    itemCode: 'B5',
    code: 'kick',
    dimension: 'ball_skills',
    dimensionName: '球类技能',
    name: '踢定位球',
    equipment: '4号或5号软式足球（直径20-22厘米），彩色地胶带，一面安全的墙壁。',
    guidance: '距墙面 6米 处标记“停球线”，距墙面 8.5米 处标记“助跑线”。将球放在停球线上，儿童从助跑线起跑，将球踢向墙面。',
    criteria: splitCriteriaText(`1.助跑： 有连续、快速的助跑动作冲向球。
2.跨步支撑： 踢球前的一瞬间，最后一步是一个明显的大跨步或小跳跃（支撑脚重重扎在地上）。
3.支撑脚位置： 不踢球的那只脚（支撑脚），正好踩在和球平齐或稍微靠后一点点的位置。
4.脚背击球： 用脚背（鞋带那个位置）或者脚尖把球踢出去。`),
    maxScore: 8,
  },
  {
    id: 12,
    itemCode: 'B6',
    code: 'overhand_throw',
    dimension: 'ball_skills',
    dimensionName: '球类技能',
    name: '过肩投球',
    equipment: '一个网球（或沙包/软式棒球，方便抓握），一面墙壁，6-7米长的无障碍场地，彩色地胶带。',
    guidance: '距墙面 6米 处标记一条直线，受试儿童面向墙壁站立于直线后，举手过肩，将球用力投向墙面。',
    criteria: splitCriteriaText(`1.向后引臂： 投球前，拿球的手臂有向后下方拉伸的蓄力动作。
2.侧身蓄力： 转动肩膀和腰，直到不拿球的那侧肩膀正对前方（侧身面向目标）。
3.重心转移： 投球瞬间，拿球手的对侧脚向前迈一步，重心转移。
4.顺势卸力： 球投出去之后，投球的手臂顺着惯性，向斜下方挥动到了身体的另一侧（像跨过身体画了一条斜线）。`),
    maxScore: 8,
  },
  {
    id: 13,
    itemCode: 'B7',
    code: 'underhand_throw',
    dimension: 'ball_skills',
    dimensionName: '球类技能',
    name: '下手抛球',
    equipment: '一个网球（或沙包），一面墙壁，5米长的无障碍场地，彩色地胶带。',
    guidance: '距墙面 4.5米 处标记一条直线，儿童面向墙壁站立于线后。儿童手心向上，手臂从下往上发力，将球抛向墙面。',
    criteria: splitCriteriaText(`1.向后引臂： 拿球的手向后下方摆，一直摆到身体后方，同时胸口朝向正前方。
2.迈步动作： 投掷时，拿球手的对侧脚向前迈步。
3.屈膝降重心： 膝盖弯曲，明显降低了身体重心。
4.贴地抛出： 在非常贴近地面的高度把球滚/抛出去，球在空中的高度不超过膝盖。`),
    maxScore: 8,
  },
]

export const TGMD3_LEVEL_DESCRIPTIONS = [
  '极度偏差（亟需干预）',
  '中度偏差（需关注与支持）',
  '平均水平（稳步发展）',
  '中度偏上（发展优势）',
  '极度偏上（潜能卓越）',
]

export const TGMD3_NORMS: {
  locomotor: Record<number, Tgmd3NormLevels>
  ballMale: Record<number, Tgmd3NormLevels>
  ballFemale: Record<number, Tgmd3NormLevels>
  total: Record<number, Tgmd3NormLevels>
} = {
  locomotor: {
    3: [{ min: 1, max: 9 }, { min: 10, max: 14 }, { min: 15, max: 25 }, { min: 26, max: 30 }, { min: 31, max: 46 }],
    4: [{ min: 1, max: 9 }, { min: 10, max: 15 }, { min: 16, max: 27 }, { min: 28, max: 33 }, { min: 34, max: 46 }],
    5: [{ min: 1, max: 14 }, { min: 15, max: 20 }, { min: 21, max: 33 }, { min: 34, max: 38 }, { min: 39, max: 46 }],
    6: [{ min: 1, max: 18 }, { min: 19, max: 24 }, { min: 25, max: 37 }, { min: 38, max: 43 }, { min: 44, max: 46 }],
    7: [{ min: 1, max: 23 }, { min: 24, max: 29 }, { min: 30, max: 39 }, { min: 40, max: 44 }, { min: 45, max: 46 }],
    8: [{ min: 1, max: 26 }, { min: 27, max: 31 }, { min: 32, max: 41 }, { min: 42, max: 46 }, null],
    9: [{ min: 1, max: 27 }, { min: 28, max: 32 }, { min: 33, max: 42 }, { min: 43, max: 46 }, null],
    10: [{ min: 1, max: 30 }, { min: 31, max: 34 }, { min: 35, max: 43 }, { min: 44, max: 46 }, null],
  },
  ballMale: {
    3: [{ min: 1, max: 10 }, { min: 11, max: 14 }, { min: 15, max: 22 }, { min: 23, max: 26 }, { min: 27, max: 54 }],
    4: [{ min: 1, max: 11 }, { min: 12, max: 16 }, { min: 17, max: 27 }, { min: 28, max: 32 }, { min: 33, max: 54 }],
    5: [{ min: 1, max: 14 }, { min: 15, max: 21 }, { min: 22, max: 34 }, { min: 35, max: 41 }, { min: 42, max: 54 }],
    6: [{ min: 1, max: 19 }, { min: 20, max: 26 }, { min: 27, max: 41 }, { min: 42, max: 46 }, { min: 47, max: 54 }],
    7: [{ min: 1, max: 24 }, { min: 25, max: 30 }, { min: 31, max: 44 }, { min: 45, max: 50 }, { min: 51, max: 54 }],
    8: [{ min: 1, max: 29 }, { min: 30, max: 34 }, { min: 35, max: 46 }, { min: 47, max: 51 }, { min: 52, max: 54 }],
    9: [{ min: 1, max: 29 }, { min: 30, max: 35 }, { min: 36, max: 48 }, { min: 49, max: 54 }, null],
    10: [{ min: 1, max: 30 }, { min: 31, max: 36 }, { min: 37, max: 49 }, { min: 50, max: 54 }, null],
  },
  ballFemale: {
    3: [{ min: 1, max: 9 }, { min: 10, max: 14 }, { min: 15, max: 22 }, { min: 23, max: 26 }, { min: 27, max: 54 }],
    4: [{ min: 1, max: 10 }, { min: 11, max: 15 }, { min: 16, max: 25 }, { min: 26, max: 30 }, { min: 31, max: 54 }],
    5: [{ min: 1, max: 14 }, { min: 15, max: 19 }, { min: 20, max: 30 }, { min: 31, max: 35 }, { min: 36, max: 54 }],
    6: [{ min: 1, max: 15 }, { min: 16, max: 22 }, { min: 23, max: 35 }, { min: 36, max: 41 }, { min: 42, max: 54 }],
    7: [{ min: 1, max: 21 }, { min: 22, max: 27 }, { min: 28, max: 40 }, { min: 41, max: 46 }, { min: 47, max: 54 }],
    8: [{ min: 1, max: 23 }, { min: 24, max: 29 }, { min: 30, max: 42 }, { min: 43, max: 48 }, { min: 49, max: 54 }],
    9: [{ min: 1, max: 26 }, { min: 27, max: 31 }, { min: 32, max: 42 }, { min: 43, max: 47 }, { min: 48, max: 54 }],
    10: [{ min: 1, max: 27 }, { min: 28, max: 32 }, { min: 33, max: 46 }, { min: 47, max: 54 }, null],
  },
  total: {
    3: [{ min: 1, max: 27 }, { min: 28, max: 30 }, { min: 31, max: 46 }, { min: 47, max: 56 }, { min: 57, max: 100 }],
    4: [{ min: 1, max: 27 }, { min: 28, max: 33 }, { min: 34, max: 51 }, { min: 52, max: 60 }, { min: 61, max: 100 }],
    5: [{ min: 1, max: 33 }, { min: 34, max: 43 }, { min: 44, max: 62 }, { min: 63, max: 73 }, { min: 74, max: 100 }],
    6: [{ min: 1, max: 39 }, { min: 40, max: 51 }, { min: 52, max: 73 }, { min: 74, max: 85 }, { min: 86, max: 100 }],
    7: [{ min: 1, max: 50 }, { min: 51, max: 60 }, { min: 61, max: 80 }, { min: 81, max: 91 }, { min: 92, max: 100 }],
    8: [{ min: 1, max: 57 }, { min: 58, max: 65 }, { min: 66, max: 83 }, { min: 84, max: 93 }, { min: 94, max: 100 }],
    9: [{ min: 1, max: 59 }, { min: 60, max: 68 }, { min: 69, max: 85 }, { min: 86, max: 94 }, { min: 95, max: 100 }],
    10: [{ min: 1, max: 59 }, { min: 60, max: 69 }, { min: 70, max: 89 }, { min: 90, max: 100 }, null],
  },
}

function createScoreOptions(maxScore: number): ScaleOption[] {
  return Array.from({ length: maxScore + 1 }, (_, score) => ({
    value: score,
    label: `${score}分`,
    description: score === 0 ? '未见达成' : score === maxScore ? '满分表现' : '按两次试做累计录入',
    score,
  }))
}

export function getTgmd3ScaleQuestions(): ScaleQuestion[] {
  return TGMD3_SKILLS.map((skill) => ({
    id: skill.id,
    dimension: skill.dimension,
    dimensionName: skill.dimensionName,
    content: `${skill.itemCode}. ${skill.name}`,
    options: createScoreOptions(skill.maxScore),
    metadata: {
      itemCode: skill.itemCode,
      skillCode: skill.code,
      equipment: skill.equipment,
      guidance: skill.guidance,
      criteria: skill.criteria,
      maxScore: skill.maxScore,
      scoreType: 'tgmd_3',
    },
  }))
}
