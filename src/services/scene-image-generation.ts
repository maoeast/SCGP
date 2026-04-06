import type { CareSceneResourceMeta, EmotionSceneResourceMeta } from '@/types/emotional'

export interface GeneratedSceneImageCandidate {
  prompt: string
  url: string
  relativePath: string
  mimeType: string
  model: string
}

export interface GenerateSceneImagesRequest {
  sceneCode: string
  resourceType: 'emotion_scene' | 'care_scene'
  prompts: string[]
}

interface GenerateSceneImagesResponse {
  success: boolean
  candidates?: GeneratedSceneImageCandidate[]
  error?: string
}

const DEFAULT_SHOT_VARIATIONS = [
  '画面采用自然的中景构图，人物和场景关系清楚，适合儿童一眼看懂。',
  '画面采用稍广一点的环境构图，保留校园或家庭空间线索，但主体仍然清晰。',
  '画面采用更贴近人物互动的构图，突出表情、动作和彼此之间的关心关系。',
] as const

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function joinKeywords(values: Array<string | undefined>) {
  return values.map((value) => normalizeText(value)).filter((value) => value.length > 0).join('，')
}

function buildSharedPromptPrefix(title: string, placeHint: string) {
  return [
    '写实摄影风格。',
    '用于儿童情绪训练软件的单张场景图片。',
    `场景主题：${title}。`,
    `地点要求：${placeHint}，场景符合中国日常生活经验。`,
    '人物要求：全部人物为中国人，面部自然，服装符合中国校园、家庭或公共场所日常穿着。',
    '画面要求：温暖自然光，构图清晰，情绪和动作一眼能看懂，背景不过度杂乱。',
    '禁止：动漫风、插画风、海报排版、英文或中文文字、水印、夸张表情、畸形手部、奇幻元素、悬浮物体。',
  ].join(' ')
}

function buildEmotionSceneCorePrompt(meta: EmotionSceneResourceMeta) {
  const domainHint = normalizeText(meta.sceneDomain) || '中国校园、家庭或常见公共场所'
  const clues = joinKeywords(meta.emotionClues)
  const solutions = meta.solutions.slice(0, 2).map((item) => normalizeText(item.text)).filter(Boolean).join('；')

  return [
    buildSharedPromptPrefix(meta.title, domainHint),
    `画面核心：表现“${meta.title}”这一情境，对应的主要情绪是“${meta.targetEmotion}”。`,
    clues ? `情绪线索：${clues}。` : '',
    solutions ? `人物行为参考：${solutions}。` : '',
    '请生成一张没有文字的真实场景照片感图片，适合在软件中长期显示作为训练参考图。',
  ].filter(Boolean).join(' ')
}

function buildCareSceneCorePrompt(meta: CareSceneResourceMeta) {
  const receiverName = normalizeText((meta as CareSceneResourceMeta & { receiverName?: string }).receiverName) || '另一位小朋友'
  const tags = joinKeywords(meta.tags || [])
  const preferredUtterances = meta.utterances
    .filter((utterance) => meta.preferredUtteranceIds.includes(utterance.id))
    .slice(0, 2)
    .map((utterance) => normalizeText(utterance.text))
    .filter(Boolean)
    .join('；')

  return [
    buildSharedPromptPrefix(meta.title, '中国校园、中国家庭或中国社区公共场所'),
    `画面核心：表现“${meta.title}”这一关心情境，重点人物是需要被关心的${receiverName}。`,
    normalizeText(meta.speakerPerspectiveText) ? `情境描述：${normalizeText(meta.speakerPerspectiveText)}。` : '',
    normalizeText(meta.receiverPerspectiveText) ? `对方感受线索：${normalizeText(meta.receiverPerspectiveText)}。` : '',
    tags ? `关键词：${tags}。` : '',
    preferredUtterances ? `关心表达参考：${preferredUtterances}。` : '',
    '请突出需要帮助的人物和准备表达关心的人物之间的互动，适合儿童识别和代入。',
  ].filter(Boolean).join(' ')
}

export function buildEmotionSceneImagePrompts(meta: EmotionSceneResourceMeta) {
  const corePrompt = buildEmotionSceneCorePrompt(meta)
  return DEFAULT_SHOT_VARIATIONS.map((variation) => `${corePrompt} ${variation}`)
}

export function buildCareSceneImagePrompts(meta: CareSceneResourceMeta) {
  const corePrompt = buildCareSceneCorePrompt(meta)
  return DEFAULT_SHOT_VARIATIONS.map((variation) => `${corePrompt} ${variation}`)
}

export async function generateSceneImages(request: GenerateSceneImagesRequest) {
  if (!window.electronAPI?.invoke) {
    throw new Error('当前环境不支持 AI 场景图片生成。')
  }

  const result = await window.electronAPI.invoke('ai:generate-scene-images', request) as GenerateSceneImagesResponse

  if (!result?.success || !result.candidates) {
    throw new Error(result?.error || 'AI 场景图片生成失败。')
  }

  return result.candidates
}
