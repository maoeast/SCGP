import type {
  CareSceneResourceMeta,
  CareSceneUtterance,
  EmotionalBaseEmotion,
  EmotionalCareType,
} from '@/types/emotional'

type CareSceneGeneratedFieldInput = Pick<
  CareSceneResourceMeta,
  'name'
  | 'title'
  | 'speakerPerspectiveText'
  | 'receiverPerspectiveText'
  | 'receiverEmotion'
  | 'careType'
  | 'specificEmotionLabel'
  | 'utterances'
  | 'preferredUtteranceIds'
  | 'tags'
> & {
  receiverName?: string
  emotionChips?: string[]
  comfortTip?: string
  description?: string
}

type CareSceneGeneratedFields = Pick<
  CareSceneResourceMeta,
  'receiverName' | 'emotionChips' | 'comfortTip'
>

const BASE_EMOTION_CHIPS: Record<EmotionalBaseEmotion, string[]> = {
  calm: ['安心', '放松', '想被陪着', '想慢一点'],
  happy: ['开心', '轻松', '想分享', '想被回应'],
  sad: ['难过', '想哭', '委屈', '需要安慰'],
  angry: ['生气', '烦躁', '不舒服', '想冷静'],
  scared: ['害怕', '着急', '紧张', '需要办法'],
  embarrassed: ['尴尬', '不好意思', '丢脸', '希望被保护'],
  shy: ['害羞', '紧张', '不太敢说', '需要鼓励'],
  proud: ['高兴', '有成就感', '想被看见', '想被夸奖'],
}

const RECEIVER_ROLE_FALLBACKS = [
  '妈妈',
  '爸爸',
  '老师',
  '奶奶',
  '爷爷',
  '外婆',
  '外公',
  '阿姨',
  '叔叔',
  '姐姐',
  '哥哥',
  '妹妹',
  '弟弟',
  '同桌',
  '同学',
  '好朋友',
  '朋友',
] as const

const BLOCKED_CHILD_NAMES = new Set([
  '小心',
  '小声',
  '小时',
  '小学',
  '小事',
  '小朋友',
  '小组',
  '小腿',
  '小手',
])

const SPECIFIC_CHIP_RULES: Array<{ pattern: RegExp; chips: string[] }> = [
  { pattern: /摔倒|摔伤|摔破|流血|擦破|膝盖|疼得|很疼|受伤/, chips: ['很疼', '想哭', '需要帮助'] },
  { pattern: /玩具坏了|坏了|摔坏|损坏/, chips: ['舍不得', '难过', '想被安慰'] },
  { pattern: /累|疲惫|辛苦|瘫坐|揉着额头|休息/, chips: ['很累', '想休息', '需要安静'] },
  { pattern: /输了|输掉|比赛|不甘心|受挫/, chips: ['失落', '不甘心', '想被理解'] },
  { pattern: /忘带|作业|老师批评|检查|办公室|坦白/, chips: ['着急', '害怕', '需要办法'] },
  { pattern: /洒在裤子上|洒了一裤子|丢人|脸红红的|尴尬/, chips: ['尴尬', '丢脸', '希望被保护'] },
  { pattern: /哭|哭泣|掉眼泪|眼泪/, chips: ['想哭'] },
]

const SPECIFIC_TIP_RULES: Array<{ pattern: RegExp; buildTip: (receiverName: string) => string }> = [
  {
    pattern: /摔倒|摔伤|摔破|流血|擦破|膝盖|疼得|很疼|受伤/,
    buildTip: (receiverName) => `先轻轻问问${receiverName}疼不疼，再伸手帮一把，会更让TA安心。`,
  },
  {
    pattern: /玩具坏了|坏了|摔坏|损坏/,
    buildTip: (receiverName) => `先陪${receiverName}难过一下，再慢慢想办法修或补救，会更有安慰。`,
  },
  {
    pattern: /累|疲惫|辛苦|瘫坐|揉着额头|休息/,
    buildTip: (receiverName) => `${receiverName}累的时候，声音轻一点、动作慢一点，先让TA歇一会儿会更贴心。`,
  },
  {
    pattern: /输了|输掉|比赛|不甘心|受挫/,
    buildTip: (receiverName) => `${receiverName}失落的时候，先肯定努力，再陪一会儿，比马上讲道理更舒服。`,
  },
  {
    pattern: /忘带|作业|老师批评|检查|办公室|坦白/,
    buildTip: (receiverName) => `${receiverName}着急的时候，先陪TA一起想办法，再慢慢说建议，会更有安全感。`,
  },
  {
    pattern: /洒在裤子上|洒了一裤子|丢人|脸红红的|尴尬/,
    buildTip: (receiverName) => `${receiverName}尴尬的时候，不要大声提醒，先帮TA挡一挡、递纸巾会更体贴。`,
  },
]

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueStrings(values: Array<string | undefined | null>, max = Number.POSITIVE_INFINITY) {
  const deduped = Array.from(new Set(values
    .map((value) => normalizeText(value))
    .filter((value) => value.length > 0)))

  return deduped.slice(0, max)
}

function findChildName(text: string) {
  const matches = text.match(/小[\u4e00-\u9fa5]{1,2}/g) || []
  return matches.find((candidate) => !BLOCKED_CHILD_NAMES.has(candidate))
}

function deriveReceiverName(input: CareSceneGeneratedFieldInput) {
  const canonical = normalizeText(input.name)
  if (canonical) {
    return canonical
  }

  const manual = normalizeText(input.receiverName)
  if (manual) {
    return manual
  }

  const text = [
    input.title,
    input.speakerPerspectiveText,
    input.receiverPerspectiveText,
    input.description,
  ].map(normalizeText).join(' ')

  const childName = findChildName(text)
  if (childName) {
    return childName
  }

  const matchedRole = RECEIVER_ROLE_FALLBACKS.find((role) => text.includes(role))
  if (matchedRole) {
    return matchedRole
  }

  return '这位小朋友'
}

function deriveEmotionChips(input: CareSceneGeneratedFieldInput) {
  const manual = uniqueStrings(input.emotionChips || [], 5)
  if (manual.length > 0) {
    return manual
  }

  const text = [
    input.title,
    input.speakerPerspectiveText,
    input.receiverPerspectiveText,
    input.description,
    ...(input.tags || []),
  ].map(normalizeText).join(' ')

  const specificChips = SPECIFIC_CHIP_RULES
    .filter((rule) => rule.pattern.test(text))
    .flatMap((rule) => rule.chips)

  const baseChips = BASE_EMOTION_CHIPS[input.receiverEmotion || 'sad'] || BASE_EMOTION_CHIPS.sad
  const careTypeChip = input.careType === 'action'
    ? '需要帮助'
    : input.careType === 'advice'
      ? '想要办法'
      : '想被理解'

  return uniqueStrings([
    input.specificEmotionLabel,
    ...specificChips,
    careTypeChip,
    ...baseChips,
  ], 5)
}

function buildCareTypeTip(careType: EmotionalCareType | undefined, receiverName: string) {
  if (careType === 'action') {
    return `一句温柔的话，再加一个小动作，会让${receiverName}更容易感受到关心。`
  }

  if (careType === 'advice') {
    return `给${receiverName}建议前，先让TA知道你是在帮TA，不是在责备TA。`
  }

  return `先接住${receiverName}的感受，再轻轻开口，TA会更容易觉得被理解。`
}

function buildSpecificTip(input: CareSceneGeneratedFieldInput, receiverName: string) {
  const text = [
    input.title,
    input.speakerPerspectiveText,
    input.receiverPerspectiveText,
    input.description,
    ...(input.tags || []),
  ].map(normalizeText).join(' ')

  const matchedRule = SPECIFIC_TIP_RULES.find((rule) => rule.pattern.test(text))
  return matchedRule?.buildTip(receiverName) || ''
}

function deriveComfortTip(input: CareSceneGeneratedFieldInput, receiverName: string) {
  const manual = normalizeText(input.comfortTip)
  if (manual) {
    return manual
  }

  const specificTip = buildSpecificTip(input, receiverName)
  const careTypeTip = buildCareTypeTip(input.careType, receiverName)
  const preferredUtterance = (input.utterances || []).find((utterance) => (input.preferredUtteranceIds || []).includes(utterance.id))
  const preferredUtteranceHint = preferredUtterance?.type === 'action'
    ? '如果一时不知道说什么，先陪着TA、递纸巾或帮一下，也很好。'
    : preferredUtterance?.type === 'empathy'
      ? '先说出TA的感受，常常比马上给建议更让人舒服。'
      : preferredUtterance?.type === 'advice'
        ? '建议尽量说得简单一点，口气轻一点，TA会更愿意听。'
        : ''

  return uniqueStrings([
    specificTip,
    careTypeTip,
    preferredUtteranceHint,
  ], 2).join(' ')
}

export function buildCareSceneGeneratedFields(
  input: CareSceneGeneratedFieldInput,
): CareSceneGeneratedFields {
  const receiverName = deriveReceiverName(input)

  return {
    receiverName,
    emotionChips: deriveEmotionChips(input),
    comfortTip: deriveComfortTip(input, receiverName),
  }
}

export function enrichCareSceneGeneratedFields<T extends Omit<CareSceneGeneratedFieldInput, 'description'>>(
  input: T,
  description = '',
): T & CareSceneGeneratedFields {
  return {
    ...input,
    ...buildCareSceneGeneratedFields({
      ...input,
      description,
    }),
  }
}

export function buildCareScenePreferredUtterances(
  utterances: CareSceneUtterance[],
  preferredUtteranceIds: string[],
) {
  const preferredIdSet = new Set(preferredUtteranceIds)
  return utterances.filter((utterance) => preferredIdSet.has(utterance.id))
}
